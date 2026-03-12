import * as fs from "fs";
import * as fsp from "fs/promises";
import * as path from "path";
import yazl from "yazl";
import {
  LUIE_ASSETS_DIR,
  LUIE_MANUSCRIPT_DIR,
  LUIE_PACKAGE_CONTAINER_DIR,
  LUIE_PACKAGE_META_FILENAME,
  LUIE_PACKAGE_VERSION,
  LUIE_SNAPSHOTS_DIR,
  LUIE_WORLD_DIR,
} from "../../../shared/constants/index.js";
import { isSafeZipPath, normalizeZipPath, ensureLuieExtension } from "../../utils/luiePackage.js";
import {
  verifyLuieZipIntegrity,
} from "./luiePackageIntegrity.js";
import type { LuiePackageExportData, LoggerLike, ZipEntryPayload } from "./luiePackageTypes.js";
import { buildLuieContainerTextEntries } from "./luieContainerEntries.js";

export const ZIP_TEMP_SUFFIX = ".tmp";

const packageWriteQueue = new Map<string, Promise<void>>();

export const ensureParentDir = async (targetPath: string): Promise<void> => {
  const dir = path.dirname(targetPath);
  await fsp.mkdir(dir, { recursive: true });
};

export const pathExists = async (targetPath: string): Promise<boolean> => {
  try {
    await fsp.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

export const withPackageWriteLock = async <T>(
  packagePath: string,
  task: () => Promise<T>,
): Promise<T> => {
  const lockKey = path.resolve(ensureLuieExtension(packagePath));
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

export const buildZipFile = async (
  outputPath: string,
  buildEntries: (zip: yazl.ZipFile) => Promise<void> | void,
): Promise<void> => {
  const zip = new yazl.ZipFile();
  const output = fs.createWriteStream(outputPath);

  const completion = new Promise<void>((resolve, reject) => {
    output.on("close", () => resolve());
    output.on("error", reject);
    zip.outputStream.on("error", reject);
  });

  zip.outputStream.pipe(output);
  await buildEntries(zip);
  zip.end();
  await completion;
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

export const baseLuieDirectoryEntries = (): ZipEntryPayload[] => [
  { name: `${LUIE_MANUSCRIPT_DIR}/`, isDirectory: true },
  { name: `${LUIE_WORLD_DIR}/`, isDirectory: true },
  { name: `${LUIE_SNAPSHOTS_DIR}/`, isDirectory: true },
  { name: `${LUIE_ASSETS_DIR}/`, isDirectory: true },
];

export const metaEntry = (meta: unknown): ZipEntryPayload => ({
  name: LUIE_PACKAGE_META_FILENAME,
  content: JSON.stringify(meta ?? {}, null, 2),
});

export const addEntriesToZip = async (zip: yazl.ZipFile, entries: ZipEntryPayload[]): Promise<void> => {
  for (const entry of entries) {
    const normalized = normalizeZipPath(entry.name);
    if (!normalized || !isSafeZipPath(normalized)) {
      throw new Error("INVALID_ZIP_ENTRY_PATH");
    }

    if (entry.isDirectory) {
      zip.addEmptyDirectory(normalized.endsWith("/") ? normalized : `${normalized}/`);
      continue;
    }

    if (entry.fromFilePath) {
      zip.addFile(entry.fromFilePath, normalized);
      continue;
    }

    const buffer = Buffer.from(entry.content ?? "", "utf-8");
    zip.addBuffer(buffer, normalized);
  }
};

export const writeLuiePackage = async (
  targetPath: string,
  payload: LuiePackageExportData,
  logger: LoggerLike,
): Promise<void> => {
  const outputPath = ensureLuieExtension(targetPath);
  return await withPackageWriteLock(outputPath, async () => {
    await ensureParentDir(outputPath);

    const tempZip = `${outputPath}${ZIP_TEMP_SUFFIX}-${Date.now()}`;
    const entries: ZipEntryPayload[] = [
      ...baseLuieDirectoryEntries(),
      ...buildLuieContainerTextEntries(payload, outputPath, {
        containerLabel: LUIE_PACKAGE_CONTAINER_DIR,
        containerVersion: LUIE_PACKAGE_VERSION,
      }).map((entry) => ({
        name: entry.name,
        content: entry.content,
      })),
    ];

    await buildZipFile(tempZip, (zip) => addEntriesToZip(zip, entries));
    await verifyLuieZipIntegrity(tempZip, logger);
    await atomicReplace(tempZip, outputPath, logger);
  });
};
