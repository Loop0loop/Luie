import * as fsp from "fs/promises";
import * as path from "path";
import {
  DEFAULT_PROJECT_DIR_NAME,
  DEFAULT_PROJECT_FILE_BASENAME,
  LUIE_PACKAGE_EXTENSION,
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
} from "../../services/io/luiePackageIntegrity.js";
import {
  probeLuieContainer,
  writeLuieContainer,
} from "../../services/io/luieContainer.js";
import { writeLuieSqliteEntry } from "../../services/io/luieSqliteContainer.js";

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
  await writeLuieContainer({
    targetPath: fullPath,
    payload: {
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
      synopsis: { synopsis: "", status: "draft" },
      plot: { columns: [] },
      drawing: { paths: [] },
      mindmap: { nodes: [], edges: [] },
      memos: { memos: [] },
      graph: { nodes: [], edges: [] },
      snapshots: [],
    },
    logger,
  });

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

  await writeLuieContainer({
    targetPath,
    payload: {
      meta: normalizedMeta,
      chapters: [],
      characters: [],
      terms: [],
      synopsis: { synopsis: "", status: "draft" },
      plot: { columns: [] },
      drawing: { paths: [] },
      mindmap: { nodes: [], edges: [] },
      memos: { memos: [] },
      graph: { nodes: [], edges: [] },
      snapshots: [],
    },
    logger,
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
  try {
    await fsp.access(safeProjectRoot);
  } catch (error) {
    const fsError = error as NodeJS.ErrnoException;
    if (fsError?.code === "ENOENT") {
      throw new ServiceError(
        ErrorCode.FS_WRITE_FAILED,
        "Project package does not exist. Create the .luie package first.",
        {
          projectRoot: safeProjectRoot,
          relativePath: normalized,
        },
      );
    }
    throw error;
  }

  const probe = await probeLuieContainer(safeProjectRoot);
  if (probe.kind === "legacy-package") {
    throw new ServiceError(
      ErrorCode.LUIE_LEGACY_FORMAT_UNSUPPORTED,
      "현재 앱은 구형 package .luie를 지원하지 않습니다",
      {
        projectRoot: safeProjectRoot,
        relativePath: normalized,
      },
    );
  }
  if (probe.kind !== "sqlite-v2") {
    throw new ServiceError(
      ErrorCode.FS_WRITE_FAILED,
      "Unsupported .luie container format",
      {
        projectRoot: safeProjectRoot,
        relativePath: normalized,
        containerKind: probe.kind,
      },
    );
  }

  await writeLuieSqliteEntry({
    targetPath: safeProjectRoot,
    entryPath: normalized,
    content,
    logger,
  });

  return { path: `${safeProjectRoot}:${normalized}` };
};
