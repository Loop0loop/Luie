import * as path from "path";
import * as fsp from "fs/promises";
import yauzl from "yauzl";
import {
  LUIE_PACKAGE_EXTENSION,
  LUIE_PACKAGE_META_FILENAME,
} from "../../../shared/constants/index.js";
import { isSafeZipPath, normalizeZipPath } from "../../utils/luiePackage.js";
import {
  parseObjectJson,
  normalizeLuieMetaForWrite,
  verifyLuieZipIntegrity,
} from "./luiePackageIntegrity.js";
import {
  ZIP_TEMP_SUFFIX,
  addEntriesToZip,
  atomicReplace,
  buildZipFile,
  metaEntry,
  pathExists,
} from "./luiePackageWriter.js";
import type { LoggerLike, ZipEntryPayload } from "./luiePackageTypes.js";

export const collectDirectoryEntries = async (
  sourceDir: string,
  baseDir = sourceDir,
): Promise<ZipEntryPayload[]> => {
  const entries: ZipEntryPayload[] = [];
  const items = await fsp.readdir(sourceDir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = `${sourceDir}${path.sep}${item.name}`;
    const relative = normalizeZipPath(path.relative(baseDir, fullPath));
    if (!relative || !isSafeZipPath(relative)) {
      continue;
    }

    // Skip symlinks during directory-package migration to prevent
    // packaging files outside the selected legacy .luie directory.
    if (item.isSymbolicLink()) {
      continue;
    }

    if (item.isDirectory()) {
      entries.push({ name: `${relative}/`, isDirectory: true });
      entries.push(...(await collectDirectoryEntries(fullPath, baseDir)));
      continue;
    }

    if (!item.isFile()) {
      continue;
    }

    entries.push({ name: relative, fromFilePath: fullPath });
  }

  return entries;
};

export const migrateDirectoryPackageToZip = async (
  legacyDir: string,
  targetZip: string,
  logger: LoggerLike,
): Promise<string> => {
  const backupPath = `${legacyDir}.dir-legacy-${Date.now()}`;
  await fsp.rename(legacyDir, backupPath);
  const tempZip = `${targetZip}${ZIP_TEMP_SUFFIX}-${Date.now()}`;

  try {
    const entries = await collectDirectoryEntries(backupPath);
    const hasMetaEntry = entries.some(
      (entry) => normalizeZipPath(entry.name) === LUIE_PACKAGE_META_FILENAME,
    );
    const nowIso = new Date().toISOString();
    let existingMeta: Record<string, unknown> = {};
    if (hasMetaEntry) {
      try {
        const existingMetaRaw = await fsp.readFile(
          path.join(backupPath, LUIE_PACKAGE_META_FILENAME),
          "utf-8",
        );
        existingMeta = parseObjectJson(existingMetaRaw) ?? {};
      } catch {
        existingMeta = {};
      }
    }
    const normalizedMeta = normalizeLuieMetaForWrite(existingMeta, {
      titleFallback: path.basename(targetZip, LUIE_PACKAGE_EXTENSION),
      nowIso,
      createdAtFallback: nowIso,
    });
    const sanitizedEntries = entries.filter(
      (entry) => normalizeZipPath(entry.name) !== LUIE_PACKAGE_META_FILENAME,
    );
    sanitizedEntries.push(metaEntry(normalizedMeta));
    await buildZipFile(tempZip, (zip) => addEntriesToZip(zip, sanitizedEntries));
    await verifyLuieZipIntegrity(tempZip, logger);
    await atomicReplace(tempZip, targetZip, logger);
    return backupPath;
  } catch (error) {
    logger.error("Failed to migrate legacy directory package", {
      legacyDir,
      targetZip,
      backupPath,
      error,
    });

    try {
      await fsp.rm(tempZip, { force: true });
    } catch {
      // best effort
    }

    try {
      if (await pathExists(legacyDir)) {
        const collidedPath = `${legacyDir}.migration-failed-${Date.now()}`;
        await fsp.rename(legacyDir, collidedPath);
        logger.info?.("Moved partial migration output before restore", {
          legacyDir,
          collidedPath,
        });
      }
      await fsp.rename(backupPath, legacyDir);
      logger.info?.("Restored legacy directory package after migration failure", {
        legacyDir,
        backupPath,
      });
    } catch (restoreError) {
      logger.error("Failed to restore legacy directory package", {
        legacyDir,
        backupPath,
        restoreError,
      });
    }

    throw error;
  }
};

export const rebuildZipWithReplacement = async (
  sourceZip: string,
  targetZip: string,
  replacementPath: string,
  replacementContent: string,
  logger: LoggerLike,
): Promise<void> => {
  const safeReplacement = normalizeZipPath(replacementPath);
  if (!safeReplacement || !isSafeZipPath(safeReplacement)) {
    throw new Error("INVALID_RELATIVE_PATH");
  }

  await buildZipFile(targetZip, async (zip) => {
    await new Promise<void>((resolve, reject) => {
      yauzl.open(sourceZip, { lazyEntries: true }, (openErr: Error | null, zipfile?: yauzl.ZipFile) => {
        if (openErr || !zipfile) {
          reject(openErr ?? new Error("FAILED_TO_OPEN_ZIP"));
          return;
        }

        const handleEntry = (entry: yauzl.Entry) => {
          const entryName = normalizeZipPath(entry.fileName);
          if (!entryName || !isSafeZipPath(entryName)) {
            logger.error("Unsafe zip entry skipped", { entry: entry.fileName, sourceZip });
            zipfile.readEntry();
            return;
          }

          if (entryName === safeReplacement) {
            zipfile.readEntry();
            return;
          }

          if (entry.fileName.endsWith("/")) {
            zip.addEmptyDirectory(entryName.endsWith("/") ? entryName : `${entryName}/`);
            zipfile.readEntry();
            return;
          }

          zipfile.openReadStream(entry, (streamErr: Error | null, stream?: NodeJS.ReadableStream) => {
            if (streamErr || !stream) {
              reject(streamErr ?? new Error("FAILED_TO_READ_ZIP_ENTRY"));
              return;
            }

            zip.addReadStream(stream, entryName);
            stream.on("end", () => zipfile.readEntry());
            stream.on("error", reject);
          });
        };

        zipfile.on("entry", handleEntry);
        zipfile.on("error", reject);
        zipfile.on("end", resolve);
        zipfile.readEntry();
      });
    });

    // Always append the replacement entry so existing entries are overwritten
    // and missing entries are created in a single rebuild pass.
    zip.addBuffer(Buffer.from(replacementContent, "utf-8"), safeReplacement);
  });
};
