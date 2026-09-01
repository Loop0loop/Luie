import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { app } from "electron";
import {
  LUIE_PACKAGE_EXTENSION,
  LUIE_SNAPSHOTS_DIR,
} from "../../../../shared/constants/index.js";
import { sanitizeName } from "../../../../shared/utils/sanitize.js";
import { ensureSafeAbsolutePath } from "../../../utils/fs/index.js";
import { ensureLuieExtension } from "../../../utils/package/index.js";
import { listProjectAttachmentEntries } from "./projectAttachmentStore.js";

type LoggerLike = {
  warn: (message: string, data?: unknown) => void;
};

const toProjectPathKey = (projectPath: string): string => {
  const resolved = path.resolve(projectPath);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
};

const getDocumentsDirectory = (): string => {
  try {
    if (typeof app?.getPath === "function") {
      const docPath = app.getPath("documents");
      if (typeof docPath === "string" && docPath.trim().length > 0) {
        return docPath;
      }
    }
  } catch {
    // Electron app 비활성/테스트 환경 fallback
  }
  return path.join(os.homedir(), "Documents");
};

export const resolveDefaultProjectPath = async (
  title?: string,
): Promise<string> => {
  const docsDir = getDocumentsDirectory();
  try {
    await fs.mkdir(docsDir, { recursive: true });
  } catch {
    // 디렉토리가 이미 존재하거나 권한 예외 방지
  }

  const rawTitle = typeof title === "string" ? title.trim() : "";
  const sanitized = sanitizeName(rawTitle, "untitled") || "untitled";

  let candidatePath = path.join(
    docsDir,
    `${sanitized}${LUIE_PACKAGE_EXTENSION}`,
  );
  let index = 1;

  while (true) {
    let existsOnDisk = false;
    try {
      await fs.access(candidatePath);
      existsOnDisk = true;
    } catch {
      existsOnDisk = false;
    }

    const conflict = await findProjectPathConflict(candidatePath);

    if (!existsOnDisk && !conflict) {
      return candidatePath;
    }

    candidatePath = path.join(
      docsDir,
      `${sanitized} (${index})${LUIE_PACKAGE_EXTENSION}`,
    );
    index++;
  }
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
  const projects = await listProjectAttachmentEntries();

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
      // NOTE: 해석할 수 없는 legacy path는 conflict 비교 대상에서 제외한다.
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
