import * as fsp from "fs/promises";
import * as path from "path";
import type { LoggerLike } from "./luiePackageTypes.js";

const packageWriteQueue = new Map<string, Promise<void>>();

export const ensureParentDir = async (targetPath: string): Promise<void> => {
  const dir = path.dirname(targetPath);
  await fsp.mkdir(dir, { recursive: true });
};

export const withPackageWriteLock = async <T>(
  packagePath: string,
  task: () => Promise<T>,
): Promise<T> => {
  const lockKey = path.resolve(packagePath);
  const previous = packageWriteQueue.get(lockKey) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(task);
  const marker = current.then(
    () => undefined,
    () => undefined,
  );
  packageWriteQueue.set(lockKey, marker);

  try {
    return await current;
  } finally {
    if (packageWriteQueue.get(lockKey) === marker) {
      packageWriteQueue.delete(lockKey);
    }
  }
};

export const atomicReplace = async (
  tempPath: string,
  targetPath: string,
  logger: LoggerLike,
): Promise<void> => {
  const backupPath = `${targetPath}.bak-${Date.now()}`;
  let backedUp = false;

  try {
    await fsp.rename(tempPath, targetPath);
    return;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (
      err?.code !== "EEXIST" &&
      err?.code !== "ENOTEMPTY" &&
      err?.code !== "EPERM" &&
      err?.code !== "EISDIR"
    ) {
      throw error;
    }
  }

  try {
    await fsp.rename(targetPath, backupPath);
    backedUp = true;
    await fsp.rename(tempPath, targetPath);
    await fsp.rm(backupPath, { force: true, recursive: true });
  } catch (error) {
    logger.error("Atomic replace failed", { error, targetPath });
    if (backedUp) {
      try {
        await fsp.rename(backupPath, targetPath);
      } catch (restoreError) {
        logger.error("Failed to restore backup", { restoreError, targetPath, backupPath });
      }
    }
    throw error;
  }
};
