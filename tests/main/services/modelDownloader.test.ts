import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadLlamaServerBinary } from "../../../src/main/services/llm/modelDownloader.js";

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
});
