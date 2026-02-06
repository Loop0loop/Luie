/**
 * Atomic file write utility
 * Crash-safe write: temp file → fsync → rename → dir fsync
 *
 * This pattern guarantees that either the old or new version of a file
 * exists on disk, even during OS-level crashes or power failures.
 */

import { promises as fs } from "fs";
import path from "path";
import { promisify } from "node:util";
import { gzip as gzipCallback, gunzip as gunzipCallback } from "node:zlib";
import { createLogger } from "../../shared/logger/index.js";

const logger = createLogger("AtomicWrite");
const gzip = promisify(gzipCallback);
const gunzip = promisify(gunzipCallback);

/**
 * Write raw buffer to file atomically.
 * temp → fsync → rename → dir fsync
 */
export async function writeFileAtomic(targetPath: string, buffer: Buffer): Promise<void> {
  const dir = path.dirname(targetPath);
  const tempPath = path.join(dir, `${path.basename(targetPath)}.tmp-${Date.now()}`);

  await fs.writeFile(tempPath, buffer);

  // fsync the temp file to ensure it's on disk
  const handle = await fs.open(tempPath, "r+");
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }

  // Atomic rename
  await fs.rename(tempPath, targetPath);

  // fsync the directory to persist the rename
  try {
    const dirHandle = await fs.open(dir, "r");
    try {
      await dirHandle.sync();
    } finally {
      await dirHandle.close();
    }
  } catch (error) {
    logger.warn("Failed to fsync directory", { dir, error });
  }
}

/**
 * Write UTF-8 string to file atomically with gzip compression.
 */
export async function writeGzipAtomic(targetPath: string, payload: string): Promise<void> {
  const buffer = await gzip(Buffer.from(payload, "utf8"));
  await writeFileAtomic(targetPath, buffer);
}

/**
 * Read a file that may or may not be gzip-compressed.
 * Auto-detects gzip magic bytes (0x1f 0x8b).
 */
export async function readMaybeGzip(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  const isGzipped = buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b;
  const jsonBuffer = isGzipped ? await gunzip(buffer) : buffer;
  return jsonBuffer.toString("utf8");
}
