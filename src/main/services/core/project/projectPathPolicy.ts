import { promises as fs } from "fs";
import path from "path";
import { db } from "../../../database/index.js";
import { LUIE_SNAPSHOTS_DIR } from "../../../../shared/constants/index.js";
import { sanitizeName } from "../../../../shared/utils/sanitize.js";
import { ensureSafeAbsolutePath } from "../../../utils/pathValidation.js";
import { ensureLuieExtension } from "../../../utils/luiePackage.js";

type LoggerLike = {
  warn: (message: string, data?: unknown) => void;
};

const toProjectPathKey = (projectPath: string): string => {
  const resolved = path.resolve(projectPath);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
};

export const normalizeProjectPath = (inputPath: string | undefined): string | undefined => {
  if (typeof inputPath !== "string") return undefined;
  const trimmed = inputPath.trim();
  return trimmed.length > 0 ? ensureSafeAbsolutePath(trimmed, "projectPath") : undefined;
};

export const normalizeLuiePackagePath = (inputPath: string, fieldName: string): string => {
  const safePath = ensureSafeAbsolutePath(inputPath, fieldName);
  return ensureLuieExtension(safePath);
};

export const findProjectPathConflict = async (
  projectPath: string,
  currentProjectId?: string,
): Promise<{ id: string; title: string; projectPath: string } | null> => {
  const targetKey = toProjectPathKey(projectPath);
  const projects = await db.getClient().project.findMany({
    select: {
      id: true,
      title: true,
      projectPath: true,
    },
  });

  for (const project of projects) {
    if (currentProjectId && String(project.id) === currentProjectId) continue;
    if (typeof project.projectPath !== "string" || project.projectPath.trim().length === 0) {
      continue;
    }

    try {
      const safePath = ensureSafeAbsolutePath(project.projectPath, "projectPath");
      if (toProjectPathKey(safePath) === targetKey) {
        return {
          id: String(project.id),
          title: typeof project.title === "string" ? project.title : "",
          projectPath: safePath,
        };
      }
    } catch {
      // invalid legacy path can be skipped for conflict matching
    }
  }

  return null;
};

export const renameSnapshotDirectoryForProjectTitleChange = async (input: {
  projectId: string;
  projectPath: string | null;
  previousTitle: string;
  nextTitle: string;
  logger: LoggerLike;
}): Promise<void> => {
  const { projectId, projectPath, previousTitle, nextTitle, logger } = input;
  if (!projectPath || previousTitle === nextTitle) return;

  try {
    const safeProjectPath = ensureSafeAbsolutePath(projectPath, "projectPath");
    const baseDir = path.dirname(safeProjectPath);
    const snapshotsBase = `${baseDir}${path.sep}.luie${path.sep}${LUIE_SNAPSHOTS_DIR}`;
    const prevName = sanitizeName(previousTitle, "");
    const nextName = sanitizeName(nextTitle, "");
    if (!prevName || !nextName || prevName === nextName) return;

    const prevDir = `${snapshotsBase}${path.sep}${prevName}`;
    const nextDir = `${snapshotsBase}${path.sep}${nextName}`;
    try {
      const stat = await fs.stat(prevDir);
      if (!stat.isDirectory()) return;
    } catch {
      return;
    }

    await fs.mkdir(path.dirname(nextDir), { recursive: true });
    await fs.rename(prevDir, nextDir);
  } catch (error) {
    logger.warn("Failed to rename snapshot directory after project title update", {
      projectId,
      previousTitle,
      nextTitle,
      error,
    });
  }
};
