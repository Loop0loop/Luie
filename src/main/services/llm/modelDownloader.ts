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
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      const chunk = Buffer.from(value);
      receivedBytes += chunk.length;
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

async function extractOneFromZip(
  zipPath: string,
  entryMatch: string,
  destPath: string,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (openErr, zipfile) => {
      if (openErr) {
        reject(openErr);
        return;
      }
      let found = false;

      zipfile.readEntry();
      zipfile.on("entry", (entry: yauzl.Entry) => {
        if (!found && (entry.fileName.endsWith(entryMatch) || entry.fileName === entryMatch)) {
          found = true;
          zipfile.openReadStream(entry, (streamErr, readStream) => {
            if (streamErr) {
              reject(streamErr);
              return;
            }
            const writeStream = createWriteStream(destPath, { mode: 0o755 });
            readStream.on("error", reject);
            writeStream.on("error", reject);
            writeStream.on("finish", () => {
              zipfile.close();
              resolve();
            });
            readStream.pipe(writeStream);
          });
          return;
        }
        zipfile.readEntry();
      });
      zipfile.on("end", () => {
        if (!found) reject(new Error(`Entry matching '${entryMatch}' not found in zip`));
      });
      zipfile.on("error", reject);
    });
  });
}

export async function downloadGguf(input: {
  repo: string;
  filename: string;
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
    await extractOneFromZip(zipPath, binaryName, destBinaryPath);
    await fsp.rm(zipPath, { force: true });
    input.onProgress?.({ phase: "done", pct: 100, receivedBytes: 0, totalBytes: 0 });
    return destBinaryPath;
  } catch (error) {
    await fsp.rm(zipPath, { force: true }).catch(() => {});
    await fsp.rm(`${zipPath}.tmp`, { force: true }).catch(() => {});
    await fsp.rm(destBinaryPath, { force: true }).catch(() => {});
    throw error;
  }
}
