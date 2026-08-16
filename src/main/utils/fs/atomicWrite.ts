import { promises as fs } from "fs";
import path from "path";
import { promisify } from "node:util";
import { gzip as gzipCallback, gunzip as gunzipCallback } from "node:zlib";
import { createLogger } from "../../../shared/logger/index.js";

const logger = createLogger("AtomicWrite");
const gzip = promisify(gzipCallback);
const gunzip = promisify(gunzipCallback);

/** OS crash 이후에도 이전 파일이나 새 파일 중 하나가 온전히 남도록 기록한다. */
export async function writeFileAtomic(
  targetPath: string,
  buffer: Buffer,
): Promise<void> {
  const dir = path.dirname(targetPath);
  const tempPath = path.join(
    dir,
    `${path.basename(targetPath)}.tmp-${Date.now()}`,
  );

  await fs.writeFile(tempPath, buffer);

  // NOTE: rename 전에 임시 파일을 fsync해야 새 경로가 빈 파일을 가리키지 않는다.
  const handle = await fs.open(tempPath, "r+");
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }

  await fs.rename(tempPath, targetPath);

  // NOTE: directory fsync가 없으면 전원 손실 후 rename 자체가 사라질 수 있다.
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

/** UTF-8 문자열을 gzip으로 압축해 원자적으로 기록한다. */
export async function writeGzipAtomic(
  targetPath: string,
  payload: string,
): Promise<void> {
  const buffer = await gzip(Buffer.from(payload, "utf8"));
  await writeFileAtomic(targetPath, buffer);
}

/** gzip magic byte를 기준으로 압축 여부를 판별해 UTF-8 문자열을 읽는다. */
export async function readMaybeGzip(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  const isGzipped =
    buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b;
  const jsonBuffer = isGzipped ? await gunzip(buffer) : buffer;
  return jsonBuffer.toString("utf8");
}
