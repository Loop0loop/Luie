import * as fsp from "fs/promises";
import * as path from "path";
import {
  DEFAULT_PROJECT_DIR_NAME,
  DEFAULT_PROJECT_FILE_BASENAME,
  LUIE_PACKAGE_EXTENSION,
  LUIE_MANUSCRIPT_README,
  LUIE_WORLD_DIR,
  LUIE_WORLD_CHARACTERS_FILE,
  LUIE_WORLD_TERMS_FILE,
  LUIE_WORLD_SYNOPSIS_FILE,
  LUIE_WORLD_PLOT_FILE,
  LUIE_WORLD_DRAWING_FILE,
  LUIE_WORLD_MINDMAP_FILE,
  LUIE_WORLD_SCRAP_MEMOS_FILE,
  LUIE_WORLD_GRAPH_FILE,
} from "../../../shared/constants/index.js";
import { ErrorCode } from "../../../shared/constants/errorCode.js";
import { sanitizeName } from "../../../shared/utils/sanitize.js";
import {
  ensureLuieExtension,
  isSafeZipPath,
  normalizeZipPath,
} from "../../utils/luiePackage.js";
import { ServiceError } from "../../utils/serviceError.js";
import type { LoggerLike } from "../core/types.js";
import { assertAllowedFsPath, approvePathForSession } from "./fsPathApproval.js";
import {
  normalizeLuieMetaForWrite,
  parseObjectJson,
  verifyLuieZipIntegrity,
} from "../../services/io/luiePackageIntegrity.js";
import {
  migrateDirectoryPackageToZip,
  rebuildZipWithReplacement,
} from "../../services/io/luiePackageMigration.js";
import {
  ZIP_TEMP_SUFFIX,
  addEntriesToZip,
  atomicReplace,
  baseLuieDirectoryEntries,
  buildZipFile,
  ensureParentDir,
  metaEntry,
  pathExists,
  withPackageWriteLock,
  writeLuiePackage,
} from "../../services/io/luiePackageWriter.js";

const assertLuiePackagePath = (packagePath: string, fieldName: string): void => {
  if (!packagePath.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION)) {
    throw new ServiceError(
      ErrorCode.INVALID_INPUT,
      `${fieldName} must point to a ${LUIE_PACKAGE_EXTENSION} package`,
      { fieldName, packagePath },
    );
  }
};

export const saveProjectAsLuiePackage = async (
  projectName: string,
  projectPath: string,
  content: string,
  logger: LoggerLike,
): Promise<{ path: string; projectDir: string }> => {
  const safeName = sanitizeName(projectName);
  const safeProjectPath = await assertAllowedFsPath(projectPath, {
    fieldName: "projectPath",
    mode: "write",
    permission: "write",
  });
  const projectDir = path.join(
    safeProjectPath,
    safeName || DEFAULT_PROJECT_DIR_NAME,
  );
  await fsp.mkdir(projectDir, { recursive: true });

  const fullPath = path.join(
    projectDir,
    `${safeName || DEFAULT_PROJECT_FILE_BASENAME}${LUIE_PACKAGE_EXTENSION}`,
  );

  const parsedMeta = parseObjectJson(content.trim());
  const titleFallback = safeName || DEFAULT_PROJECT_DIR_NAME;
  const nowIso = new Date().toISOString();
  const meta = normalizeLuieMetaForWrite(parsedMeta ?? {}, {
    titleFallback,
    nowIso,
    createdAtFallback: nowIso,
  });

  const hasLegacyContent = !parsedMeta && content.trim().length > 0;
  await writeLuiePackage(
    fullPath,
    {
      meta,
      chapters: hasLegacyContent
        ? [
            {
              id: "legacy-import",
              content,
            },
          ]
        : [],
      characters: [],
      terms: [],
      snapshots: [],
    },
    logger,
  );

  if (hasLegacyContent) {
    await withPackageWriteLock(fullPath, async () => {
      const tempZip = `${fullPath}${ZIP_TEMP_SUFFIX}-${Date.now()}`;
      await rebuildZipWithReplacement(
        fullPath,
        tempZip,
        LUIE_MANUSCRIPT_README,
        "# Imported Legacy Content\n\nLegacy project content was migrated into this package.",
        logger,
      );
      await verifyLuieZipIntegrity(tempZip, logger);
      await atomicReplace(tempZip, fullPath, logger);
    });
  }

  return { path: fullPath, projectDir };
};

export const createLuiePackage = async (
  packagePath: string,
  meta: unknown,
  logger: LoggerLike,
): Promise<{ path: string }> => {
  const safePackagePath = await assertAllowedFsPath(packagePath, {
    fieldName: "packagePath",
    mode: "write",
    permission: "package",
  });
  const targetPath = ensureLuieExtension(safePackagePath);
  const nowIso = new Date().toISOString();
  const normalizedMeta = normalizeLuieMetaForWrite(meta, {
    titleFallback: path.basename(targetPath, LUIE_PACKAGE_EXTENSION),
    nowIso,
    createdAtFallback: nowIso,
  });

  await withPackageWriteLock(targetPath, async () => {
    await ensureParentDir(targetPath);
    const tempZip = `${targetPath}${ZIP_TEMP_SUFFIX}-${Date.now()}`;
    let legacyFileBackupPath: string | null = null;

    try {
      const existing = await fsp.stat(targetPath);
      if (existing.isDirectory()) {
        await migrateDirectoryPackageToZip(targetPath, targetPath, logger);
      } else if (existing.isFile()) {
        const backupPath = `${targetPath}.legacy-${Date.now()}`;
        await fsp.rename(targetPath, backupPath);
        legacyFileBackupPath = backupPath;
      }
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      if (err?.code !== "ENOENT") throw e;
    }

    try {
      await buildZipFile(tempZip, (zip) =>
        addEntriesToZip(zip, [
          ...baseLuieDirectoryEntries(),
          metaEntry(normalizedMeta),
          {
            name: `${LUIE_WORLD_DIR}/${LUIE_WORLD_CHARACTERS_FILE}`,
            content: JSON.stringify({ characters: [] }, null, 2),
          },
          {
            name: `${LUIE_WORLD_DIR}/${LUIE_WORLD_TERMS_FILE}`,
            content: JSON.stringify({ terms: [] }, null, 2),
          },
          {
            name: `${LUIE_WORLD_DIR}/${LUIE_WORLD_SYNOPSIS_FILE}`,
            content: JSON.stringify({ synopsis: "", status: "draft" }, null, 2),
          },
          {
            name: `${LUIE_WORLD_DIR}/${LUIE_WORLD_PLOT_FILE}`,
            content: JSON.stringify({ columns: [] }, null, 2),
          },
          {
            name: `${LUIE_WORLD_DIR}/${LUIE_WORLD_DRAWING_FILE}`,
            content: JSON.stringify({ paths: [] }, null, 2),
          },
          {
            name: `${LUIE_WORLD_DIR}/${LUIE_WORLD_MINDMAP_FILE}`,
            content: JSON.stringify({ nodes: [], edges: [] }, null, 2),
          },
          {
            name: `${LUIE_WORLD_DIR}/${LUIE_WORLD_SCRAP_MEMOS_FILE}`,
            content: JSON.stringify({ memos: [] }, null, 2),
          },
          {
            name: `${LUIE_WORLD_DIR}/${LUIE_WORLD_GRAPH_FILE}`,
            content: JSON.stringify({ nodes: [], edges: [] }, null, 2),
          },
        ]),
      );

      await verifyLuieZipIntegrity(tempZip, logger);
      await atomicReplace(tempZip, targetPath, logger);
    } catch (error) {
      try {
        await fsp.rm(tempZip, { force: true });
      } catch {
        // best effort
      }

      if (legacyFileBackupPath) {
        try {
          if (await pathExists(targetPath)) {
            const collidedPath = `${targetPath}.create-failed-${Date.now()}`;
            await fsp.rename(targetPath, collidedPath);
            logger.info("Moved failed create output before restore", {
              targetPath,
              collidedPath,
            });
          }
          await fsp.rename(legacyFileBackupPath, targetPath);
          logger.info("Restored existing .luie package after create failure", {
            targetPath,
            backupPath: legacyFileBackupPath,
          });
        } catch (restoreError) {
          logger.error("Failed to restore existing .luie package after create failure", {
            targetPath,
            backupPath: legacyFileBackupPath,
            restoreError,
          });
        }
      }

      throw error;
    }
  });

  await approvePathForSession(targetPath, ["read", "write", "package"], "file");
  return { path: targetPath };
};

export const writeProjectPackageEntry = async (
  projectRoot: string,
  relativePath: string,
  content: string,
  logger: LoggerLike,
): Promise<{ path: string }> => {
  const normalized = normalizeZipPath(relativePath);
  if (!normalized || !isSafeZipPath(normalized)) {
    throw new Error("INVALID_RELATIVE_PATH");
  }

  const safeProjectRoot = await assertAllowedFsPath(projectRoot, {
    fieldName: "projectRoot",
    mode: "write",
    permission: "package",
  });
  assertLuiePackagePath(safeProjectRoot, "projectRoot");

  await withPackageWriteLock(safeProjectRoot, async () => {
    try {
      const stat = await fsp.stat(safeProjectRoot);
      if (stat.isDirectory()) {
        await migrateDirectoryPackageToZip(
          safeProjectRoot,
          safeProjectRoot,
          logger,
        );
      }
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      if (err?.code === "ENOENT") {
        throw new ServiceError(
          ErrorCode.FS_WRITE_FAILED,
          "Project package does not exist. Create the .luie package first.",
          {
            projectRoot: safeProjectRoot,
            relativePath: normalized,
          },
        );
      } else {
        throw e;
      }
    }

    const tempZip = `${safeProjectRoot}${ZIP_TEMP_SUFFIX}-${Date.now()}`;
    await rebuildZipWithReplacement(
      safeProjectRoot,
      tempZip,
      normalized,
      content,
      logger,
    );
    await verifyLuieZipIntegrity(tempZip, logger);
    await atomicReplace(tempZip, safeProjectRoot, logger);
  });

  return { path: `${safeProjectRoot}:${normalized}` };
};

