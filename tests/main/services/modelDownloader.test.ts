import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import yazl from "yazl";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  downloadGguf,
  downloadLlamaServerBinary,
  getHfModelFiles,
  searchHfModels,
} from "../../../src/main/services/llm/modelDownloader.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "luie-model-downloader-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function createZip(entries: Record<string, string>): Promise<Buffer> {
  const zip = new yazl.ZipFile();
  for (const [name, contents] of Object.entries(entries)) {
    zip.addBuffer(Buffer.from(contents), name);
  }
  zip.end();
  const chunks: Buffer[] = [];
  for await (const chunk of zip.outputStream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

describe("modelDownloader", () => {
  it("searches public Hugging Face GGUF models and normalizes results", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toContain("https://huggingface.co/api/models?");
      const parsed = new URL(url);
      expect(parsed.searchParams.get("search")).toBe("Qwen 2.5");
      expect(parsed.searchParams.get("filter")).toBe("gguf");
      return new Response(JSON.stringify([
        {
          id: "Qwen/Qwen2.5-1.5B-Instruct-GGUF",
          downloads: 1234,
          likes: 56,
          lastModified: "2026-05-01T00:00:00.000Z",
          tags: ["gguf", "text-generation"],
        },
        {
          modelId: "broken/no-numbers",
          downloads: "not-a-number",
          likes: null,
          tags: ["gguf"],
        },
        {
          id: "private/hidden",
          private: true,
          downloads: 9999,
          likes: 999,
        },
        {
          id: "gated/hidden",
          gated: "manual",
          downloads: 9999,
          likes: 999,
        },
      ]));
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(searchHfModels("Qwen 2.5")).resolves.toEqual([
      {
        repoId: "Qwen/Qwen2.5-1.5B-Instruct-GGUF",
        downloads: 1234,
        likes: 56,
        lastModified: "2026-05-01T00:00:00.000Z",
        tags: ["gguf", "text-generation"],
      },
      {
        repoId: "broken/no-numbers",
        downloads: 0,
        likes: 0,
        tags: ["gguf"],
      },
    ]);
  });

  it("returns no files for token-gated Hugging Face model repos", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("Unauthorized", { status: 401 })));

    await expect(getHfModelFiles("gated/private-model")).rejects.toThrow("Hugging Face access denied");
  });

  it("returns access error for forbidden Hugging Face model repos", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("Forbidden", { status: 403 })));

    await expect(getHfModelFiles("gated/private-model")).rejects.toThrow("Hugging Face access denied");
  });

  it("fails fast when repo id format is invalid", async () => {
    await expect(getHfModelFiles("owner/model name")).rejects.toThrow("Invalid Hugging Face repoId");
  });

  it("normalizes huggingface repo URL input before requesting files", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toBe("https://huggingface.co/api/models/Qwen/Qwen2.5-1.5B-Instruct-GGUF");
      return new Response(JSON.stringify({
        siblings: [{ rfilename: "model.gguf", size: 10 }],
      }));
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getHfModelFiles("https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/tree/main?x=1"),
    ).resolves.toEqual([{ filename: "model.gguf", sizeBytes: 10 }]);
  });

  it("throws for invalid huggingface repo id", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await expect(getHfModelFiles("not-a-valid-repo")).rejects.toThrow("Invalid Hugging Face repoId");
  });

  it("lists only GGUF files from a Hugging Face model repo", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toBe("https://huggingface.co/api/models/Qwen/Repo-GGUF");
      return new Response(JSON.stringify({
        siblings: [
          { rfilename: "model-q4_k_m.gguf", size: 1024 },
          { rfilename: "README.md", size: 32 },
          { rfilename: "nested/model-q8_0.GGUF", size: 2048 },
          { rfilename: "missing-size.gguf" },
        ],
      }));
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getHfModelFiles("Qwen/Repo-GGUF")).resolves.toEqual([
      { filename: "model-q4_k_m.gguf", sizeBytes: 1024 },
      { filename: "nested/model-q8_0.GGUF", sizeBytes: 2048 },
      { filename: "missing-size.gguf", sizeBytes: 0 },
    ]);
  });

  it("removes the downloaded zip when its sha256 does not match", async () => {
    const destDir = await makeTempDir();
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      downloadLlamaServerBinary({
        zipUrl: "https://example.test/llama.zip",
        expectedSha256: "0000000000000000000000000000000000000000000000000000000000000000",
        destDir,
        binaryNameInZip: "llama-server",
      }),
    ).rejects.toThrow(/SHA256 mismatch/);

    await expect(readFile(path.join(destDir, "llama-server.zip"))).rejects.toThrow();
    await expect(readFile(path.join(destDir, "llama-server.zip.tmp"))).rejects.toThrow();
  });

  it("returns an existing binary path without downloading", async () => {
    const destDir = await makeTempDir();
    const binaryPath = path.join(destDir, process.platform === "win32" ? "llama-server.exe" : "llama-server");
    await writeFile(binaryPath, "existing");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      downloadLlamaServerBinary({
        zipUrl: "https://example.test/llama.zip",
        expectedSha256: "unused",
        destDir,
        binaryNameInZip: "llama-server",
      }),
    ).resolves.toBe(binaryPath);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("extracts llama-server with sibling runtime libraries from build/bin", async () => {
    const destDir = await makeTempDir();
    const zipBytes = await createZip({
      "build/bin/llama-server": "server",
      "build/bin/libmtmd.dylib": "dylib",
    });
    const expectedSha256 = createHash("sha256").update(zipBytes).digest("hex");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(zipBytes)));

    const binaryPath = await downloadLlamaServerBinary({
      zipUrl: "https://example.test/llama.zip",
      expectedSha256,
      destDir,
      binaryNameInZip: "llama-server",
    });

    await expect(readFile(binaryPath, "utf8")).resolves.toBe("server");
    await expect(readFile(path.join(destDir, "libmtmd.dylib"), "utf8")).resolves.toBe("dylib");
  });

  it("removes a downloaded gguf when sha256 does not match", async () => {
    const destDir = await makeTempDir();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(Buffer.from("gguf-bytes"))));

    await expect(
      downloadGguf({
        repo: "Qwen/Qwen2.5-1.5B-Instruct-GGUF",
        filename: "qwen2.5-1.5b-instruct-q8_0.gguf",
        expectedSha256: "0000000000000000000000000000000000000000000000000000000000000000",
        destDir,
      }),
    ).rejects.toThrow(/SHA256 mismatch for GGUF/);

    await expect(readFile(path.join(destDir, "qwen2.5-1.5b-instruct-q8_0.gguf"))).rejects.toThrow();
  });

  it("accepts gguf when sha256 matches", async () => {
    const destDir = await makeTempDir();
    const bytes = Buffer.from("gguf-bytes-ok");
    const expectedSha256 = createHash("sha256").update(bytes).digest("hex");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(bytes)));

    const modelPath = await downloadGguf({
      repo: "Qwen/Qwen2.5-1.5B-Instruct-GGUF",
      filename: "qwen2.5-1.5b-instruct-q8_0.gguf",
      expectedSha256,
      destDir,
    });

    await expect(readFile(modelPath, "utf8")).resolves.toBe("gguf-bytes-ok");
  });

  it("re-downloads gguf when cached file sha256 does not match", async () => {
    const destDir = await makeTempDir();
    const filename = "qwen2.5-1.5b-instruct-q8_0.gguf";
    const modelPath = path.join(destDir, filename);

    await writeFile(modelPath, "tampered");

    const bytes = Buffer.from("fresh-valid-gguf");
    const expectedSha256 = createHash("sha256").update(bytes).digest("hex");
    const fetchMock = vi.fn(async () => new Response(bytes));
    vi.stubGlobal("fetch", fetchMock);

    const resolvedPath = await downloadGguf({
      repo: "Qwen/Qwen2.5-1.5B-Instruct-GGUF",
      filename,
      expectedSha256,
      destDir,
    });

    expect(resolvedPath).toBe(modelPath);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await expect(readFile(modelPath, "utf8")).resolves.toBe("fresh-valid-gguf");
  });
});
