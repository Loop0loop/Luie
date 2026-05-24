import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import yazl from "yazl";
import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadGguf, downloadLlamaServerBinary } from "../../../src/main/services/llm/modelDownloader.js";

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
});
