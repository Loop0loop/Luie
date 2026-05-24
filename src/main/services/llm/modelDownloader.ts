import { createWriteStream } from "node:fs";
import * as fsp from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import yauzl from "yauzl";
import { createLogger } from "../../../shared/logger/index.js";

const logger = createLogger("ModelDownloader");

export type DownloadProgress = {
  phase: "downloading" | "extracting" | "done" | "error";
  pct: number;
  receivedBytes: number;
  totalBytes: number;
  error?: string;
};

export type ProgressCallback = (progress: DownloadProgress) => void;

async function downloadToFile(
  url: string,
  destPath: string,
  signal: AbortSignal | undefined,
  onProgress: (received: number, total: number) => void,
): Promise<void> {
  const tmpPath = `${destPath}.tmp`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status} downloading ${url}`);
  if (!res.body) throw new Error("Response body missing");

  const totalBytes = Number(res.headers.get("content-length") ?? "0");
  let receivedBytes = 0;
  const reader = res.body.getReader();
  let fileHandle: Awaited<ReturnType<typeof fsp.open>> | null = null;
  try {
    fileHandle = await fsp.open(tmpPath, "w");
    for (;;) {
      // eslint-disable-next-line no-await-in-loop -- Streaming download must consume chunks sequentially.
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      const chunk = Buffer.from(value);
      receivedBytes += chunk.length;
      // eslint-disable-next-line no-await-in-loop -- Streamed file writes must preserve chunk order.
      await fileHandle.write(chunk);
      onProgress(receivedBytes, totalBytes);
    }
    await fileHandle.close();
    fileHandle = null;
    await fsp.rename(tmpPath, destPath);
  } catch (error) {
    if (fileHandle) await fileHandle.close().catch(() => {});
    await fsp.rm(tmpPath, { force: true }).catch(() => {});
    throw error;
  }
}

async function sha256File(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  const handle = await fsp.open(filePath, "r");
  try {
    for await (const chunk of handle.readableWebStream()) {
      hash.update(Buffer.from(chunk as ArrayBuffer));
    }
  } finally {
    await handle.close();
  }
  return hash.digest("hex");
}

function resolveZipEntryOutputPath(entryName: string, destDir: string): string | null {
  if (entryName.endsWith("/")) return null;
  const normalized = path.posix.normalize(entryName);
  if (normalized.startsWith("../") || path.posix.isAbsolute(normalized)) {
    throw new Error(`Unsafe zip entry path: ${entryName}`);
  }

  const parts = normalized.split("/");
  const binIndex = parts.lastIndexOf("bin");
  if (binIndex >= 0 && binIndex < parts.length - 1) {
    return path.join(destDir, parts[parts.length - 1] ?? "");
  }
  if (parts.length === 1) {
    return path.join(destDir, parts[0] ?? "");
  }
  return null;
}

async function extractRuntimeFilesFromZip(
  zipPath: string,
  entryMatch: string,
  destDir: string,
): Promise<string> {
  let binaryPath: string | null = null;
  await new Promise<void>((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (openErr, zipfile) => {
      if (openErr) {
        reject(openErr);
        return;
      }

      zipfile.readEntry();
      zipfile.on("entry", (entry: yauzl.Entry) => {
        let outputPath: string | null = null;
        try {
          outputPath = resolveZipEntryOutputPath(entry.fileName, destDir);
        } catch (error) {
          reject(error);
          return;
        }
        if (outputPath) {
          zipfile.openReadStream(entry, (streamErr, readStream) => {
            if (streamErr) {
              reject(streamErr);
              return;
            }
            const basename = path.basename(outputPath);
            const mode = basename === entryMatch || basename === `${entryMatch}.exe` ? 0o755 : 0o644;
            if (mode === 0o755) binaryPath = outputPath;
            const writeStream = createWriteStream(outputPath, { mode });
            readStream.on("error", reject);
            writeStream.on("error", reject);
            writeStream.on("finish", () => {
              zipfile.readEntry();
            });
            readStream.pipe(writeStream);
          });
          return;
        }
        zipfile.readEntry();
      });
      zipfile.on("end", () => {
        if (!binaryPath) {
          reject(new Error(`Entry matching '${entryMatch}' not found in zip`));
          return;
        }
        resolve();
      });
      zipfile.on("error", reject);
    });
  });
  if (!binaryPath) {
    throw new Error(`Entry matching '${entryMatch}' not found in zip`);
  }
  return binaryPath;
}

export async function downloadGguf(input: {
  repo: string;
  filename: string;
  expectedSha256?: string;
  destDir: string;
  signal?: AbortSignal;
  onProgress?: ProgressCallback;
}): Promise<string> {
  await fsp.mkdir(input.destDir, { recursive: true });
  const destPath = path.join(input.destDir, input.filename);
  try {
    await fsp.access(destPath);
    input.onProgress?.({ phase: "done", pct: 100, receivedBytes: 0, totalBytes: 0 });
    return destPath;
  } catch {
    // Download below.
  }

  const url = `https://huggingface.co/${input.repo}/resolve/main/${input.filename}`;
  logger.info("Downloading model", { url });
  await downloadToFile(url, destPath, input.signal, (received, total) => {
    const pct = total > 0 ? Math.floor((received / total) * 100) : 0;
    input.onProgress?.({ phase: "downloading", pct, receivedBytes: received, totalBytes: total });
  });
  if (input.expectedSha256) {
    const actualSha256 = await sha256File(destPath);
    if (actualSha256 !== input.expectedSha256) {
      await fsp.rm(destPath, { force: true }).catch(() => {});
      throw new Error(`SHA256 mismatch for GGUF: expected ${input.expectedSha256}, got ${actualSha256}`);
    }
  }
  input.onProgress?.({ phase: "done", pct: 100, receivedBytes: 0, totalBytes: 0 });
  return destPath;
}

export async function downloadLlamaServerBinary(input: {
  zipUrl: string;
  expectedSha256: string;
  destDir: string;
  binaryNameInZip: string;
  signal?: AbortSignal;
  onProgress?: ProgressCallback;
}): Promise<string> {
  await fsp.mkdir(input.destDir, { recursive: true });

  const binaryName = process.platform === "win32"
    ? `${input.binaryNameInZip}.exe`
    : input.binaryNameInZip;
  const destBinaryPath = path.join(input.destDir, binaryName);
  try {
    await fsp.access(destBinaryPath);
    input.onProgress?.({ phase: "done", pct: 100, receivedBytes: 0, totalBytes: 0 });
    return destBinaryPath;
  } catch {
    // Download below.
  }

  const zipPath = path.join(input.destDir, "llama-server.zip");
  try {
    await downloadToFile(input.zipUrl, zipPath, input.signal, (received, total) => {
      const pct = total > 0 ? Math.floor((received / total) * 100) : 0;
      input.onProgress?.({ phase: "downloading", pct, receivedBytes: received, totalBytes: total });
    });

    const actualSha256 = await sha256File(zipPath);
    if (actualSha256 !== input.expectedSha256) {
      throw new Error(`SHA256 mismatch for llama-server zip: expected ${input.expectedSha256}, got ${actualSha256}`);
    }

    input.onProgress?.({ phase: "extracting", pct: 0, receivedBytes: 0, totalBytes: 0 });
    const extractedBinaryPath = await extractRuntimeFilesFromZip(zipPath, binaryName, input.destDir);
    await fsp.rm(zipPath, { force: true });
    input.onProgress?.({ phase: "done", pct: 100, receivedBytes: 0, totalBytes: 0 });
    return extractedBinaryPath;
  } catch (error) {
    await fsp.rm(zipPath, { force: true }).catch(() => {});
    await fsp.rm(`${zipPath}.tmp`, { force: true }).catch(() => {});
    await fsp.rm(destBinaryPath, { force: true }).catch(() => {});
    throw error;
  }
}
