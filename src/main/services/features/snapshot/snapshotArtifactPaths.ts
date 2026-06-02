import { app } from "electron";
import { promises as fs, type Dirent } from "fs";
import path from "path";
import {
  LUIE_PACKAGE_EXTENSION,
  LUIE_SNAPSHOTS_DIR,
  SNAPSHOT_BACKUP_DIR,
} from "../../../../shared/constants/index.js";
import { createLogger } from "../../../../shared/logger/index.js";
import { ensureSafeAbsolutePath } from "../../../utils/pathValidation.js";
import { listProjectAttachmentEntries } from "../../core/project/projectAttachmentStore.js";

const logger = createLogger("SnapshotArtifactPaths");
const SNAPSHOT_ARTIFACT_ID_PATTERN = /-([0-9a-fA-F-]{36})\.snap$/;

export function resolveProjectBaseDir(projectPath: string) {
  const normalized = ensureSafeAbsolutePath(projectPath, "projectPath");
  const normalizedLower = normalized.toLowerCase();
  const extLower = LUIE_PACKAGE_EXTENSION.toLowerCase();
  return normalizedLower.endsWith(extLower)
    ? path.dirname(normalized)
    : normalized;
}

export function resolveLocalSnapshotDir(baseDir: string, projectName: string) {
  return path.join(baseDir, ".luie", LUIE_SNAPSHOTS_DIR, projectName);
}

export const extractSnapshotIdFromArtifactPath = (
  artifactPath: string,
): string | null => {
  const match = path.basename(artifactPath).match(SNAPSHOT_ARTIFACT_ID_PATTERN);
  return match?.[1] ?? null;
};

export const collectSnapFilesRecursive = async (
  rootDir: string,
  results: string[],
): Promise<void> => {
  let entries: Dirent[];
  try {
    entries = await fs.readdir(rootDir, { withFileTypes: true });
  } catch (error) {
    const fsError = error as NodeJS.ErrnoException;
    if (fsError?.code === "ENOENT") return;
    logger.warn("Failed to read snapshot artifact directory", {
      rootDir,
      error,
    });
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      await collectSnapFilesRecursive(fullPath, results);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".snap")) continue;
    results.push(fullPath);
  }
};

export const resolveArtifactRoots = async (): Promise<string[]> => {
  const roots = new Set<string>([
    path.join(app.getPath("userData"), SNAPSHOT_BACKUP_DIR),
  ]);
  const projects = await listProjectAttachmentEntries();

  for (const project of projects) {
    if (!project.projectPath) continue;
    const projectDirName = String(project.id);
    try {
      const projectBaseDir = resolveProjectBaseDir(project.projectPath);
      roots.add(resolveLocalSnapshotDir(projectBaseDir, projectDirName));
      roots.add(path.join(projectBaseDir, `backup${projectDirName}`));
    } catch (error) {
      logger.warn("Skipping snapshot artifact roots for invalid projectPath", {
        projectId: project.id,
        projectPath: project.projectPath,
        error,
      });
    }
  }

  return Array.from(roots);
};

export const getArtifactPriority = (artifactPath: string): number => {
  const appBackupRoot = path.join(app.getPath("userData"), SNAPSHOT_BACKUP_DIR);
  if (artifactPath.startsWith(appBackupRoot)) {
    return 3;
  }
  if (artifactPath.includes(`${path.sep}.luie${path.sep}`)) {
    return 1;
  }
  return 2;
};
