import { app } from "electron";
import { promises as fs, type Dirent } from "fs";
import path from "path";
import { db } from "../../../database/index.js";
import { createLogger } from "../../../../shared/logger/index.js";
import {
  APP_VERSION,
  ErrorCode,
  LUIE_PACKAGE_EXTENSION,
  LUIE_SNAPSHOTS_DIR,
  SNAPSHOT_BACKUP_DIR,
} from "../../../../shared/constants/index.js";
import { sanitizeName } from "../../../../shared/utils/sanitize.js";
import type { SnapshotCreateInput } from "../../../../shared/types/index.js";
import { ServiceError } from "../../../utils/serviceError.js";
import { writeFileAtomic, readMaybeGzip } from "../../../utils/atomicWrite.js";
import { promisify } from "node:util";
import { gzip as gzipCallback } from "node:zlib";
import { ensureSafeAbsolutePath } from "../../../utils/pathValidation.js";
import {
  getProjectAttachmentPath,
  listProjectAttachmentEntries,
} from "../../core/project/projectAttachmentStore.js";
import type { SnapshotRestoreCandidate } from "../../../../shared/types/index.js";

const logger = createLogger("SnapshotArtifacts");
const gzip = promisify(gzipCallback);
const SNAPSHOT_ARTIFACT_ID_PATTERN = /-([0-9a-fA-F-]{36})\.snap$/;
const RESTORE_EXCERPT_MAX_LENGTH = 160;

type FullSnapshotData = {
  meta: {
    version: string;
    timestamp: string;
    snapshotId: string;
    projectId: string;
  };
  data: {
    project: {
      id: string;
      title: string;
      description?: string | null;
      projectPath?: string | null;
      createdAt: string;
      updatedAt: string;
    };
    settings?: unknown;
    chapters: Array<{
      id: string;
      title: string;
      content: string;
      synopsis?: string | null;
      order: number;
      wordCount?: number | null;
      createdAt: string;
      updatedAt: string;
    }>;
    characters: Array<{
      id: string;
      name: string;
      description?: string | null;
      firstAppearance?: string | null;
      attributes?: unknown;
      createdAt: string;
      updatedAt: string;
    }>;
    terms: Array<{
      id: string;
      term: string;
      definition?: string | null;
      category?: string | null;
      firstAppearance?: string | null;
      createdAt: string;
      updatedAt: string;
    }>;
    focus?: {
      chapterId?: string | null;
      content?: string | null;
    };
  };
};

export async function readFullSnapshotArtifact(
  filePath: string,
): Promise<FullSnapshotData> {
  const raw = await readMaybeGzip(filePath);
  const payload = JSON.parse(raw);
  return payload as FullSnapshotData;
}

const toExcerpt = (value: string | null | undefined): string | undefined => {
  if (typeof value !== "string") return undefined;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length === 0) return undefined;
  if (normalized.length <= RESTORE_EXCERPT_MAX_LENGTH) {
    return normalized;
  }
  return `${normalized.slice(0, RESTORE_EXCERPT_MAX_LENGTH).trimEnd()}...`;
};

type ProjectSnapshotRecord = {
  id: string;
  title: string;
  description?: string | null;
  projectPath?: string | null;
  createdAt: Date;
  updatedAt: Date;
  settings?: unknown;
  chapters: Array<{
    id: string;
    title: string;
    content: string;
    synopsis?: string | null;
    order: number;
    wordCount?: number | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  characters: Array<{
    id: string;
    name: string;
    description?: string | null;
    firstAppearance?: string | null;
    attributes?: unknown;
    createdAt: Date;
    updatedAt: Date;
  }>;
  terms: Array<{
    id: string;
    term: string;
    definition?: string | null;
    category?: string | null;
    firstAppearance?: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
};

function resolveProjectBaseDir(projectPath: string) {
  const normalized = ensureSafeAbsolutePath(projectPath, "projectPath");
  const normalizedLower = normalized.toLowerCase();
  const extLower = LUIE_PACKAGE_EXTENSION.toLowerCase();
  return normalizedLower.endsWith(extLower)
    ? path.dirname(normalized)
    : normalized;
}

function resolveLocalSnapshotDir(baseDir: string, projectName: string) {
  return path.join(baseDir, ".luie", LUIE_SNAPSHOTS_DIR, projectName);
}

const extractSnapshotIdFromArtifactPath = (
  artifactPath: string,
): string | null => {
  const match = path.basename(artifactPath).match(SNAPSHOT_ARTIFACT_ID_PATTERN);
  return match?.[1] ?? null;
};

const collectSnapFilesRecursive = async (
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

const resolveArtifactRoots = async (): Promise<string[]> => {
  const roots = new Set<string>([
    path.join(app.getPath("userData"), SNAPSHOT_BACKUP_DIR),
  ]);
  const projects = await listProjectAttachmentEntries();

  for (const project of projects) {
    if (!project.projectPath) continue;
    const safeProjectName = sanitizeName(
      project.title ?? "",
      String(project.id),
    );
    try {
      const projectBaseDir = resolveProjectBaseDir(project.projectPath);
      roots.add(resolveLocalSnapshotDir(projectBaseDir, safeProjectName));
      roots.add(path.join(projectBaseDir, `backup${safeProjectName}`));
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

const resolveRestorePreview = (payload: FullSnapshotData) => {
  const focusChapterId = payload.data.focus?.chapterId ?? null;
  const orderedChapters = [...payload.data.chapters].sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
  const chapter =
    orderedChapters.find((entry) => entry.id === focusChapterId) ??
    orderedChapters[0];
  const excerpt = toExcerpt(payload.data.focus?.content ?? chapter?.content);

  return {
    chapterTitle: chapter?.title,
    excerpt,
  };
};

const getArtifactPriority = (artifactPath: string): number => {
  const appBackupRoot = path.join(app.getPath("userData"), SNAPSHOT_BACKUP_DIR);
  if (artifactPath.startsWith(appBackupRoot)) {
    return 3;
  }
  if (artifactPath.includes(`${path.sep}.luie${path.sep}`)) {
    return 1;
  }
  return 2;
};

export async function listSnapshotRestoreCandidates(): Promise<
  SnapshotRestoreCandidate[]
> {
  const roots = await resolveArtifactRoots();
  const artifactPaths: string[] = [];

  for (const root of roots) {
    await collectSnapFilesRecursive(root, artifactPaths);
  }

  const deduped = new Map<
    string,
    SnapshotRestoreCandidate & { priority: number }
  >();

  for (const artifactPath of artifactPaths) {
    try {
      const payload = await readFullSnapshotArtifact(artifactPath);
      const { chapterTitle, excerpt } = resolveRestorePreview(payload);
      const candidate = {
        snapshotId: payload.meta.snapshotId,
        projectId: payload.meta.projectId,
        projectTitle: payload.data.project.title || "Recovered draft",
        chapterTitle,
        savedAt: payload.meta.timestamp,
        excerpt,
        filePath: artifactPath,
        priority: getArtifactPriority(artifactPath),
      };
      const existing = deduped.get(candidate.snapshotId);
      if (
        !existing ||
        candidate.priority > existing.priority ||
        (candidate.priority === existing.priority &&
          new Date(candidate.savedAt).getTime() >
            new Date(existing.savedAt).getTime())
      ) {
        deduped.set(candidate.snapshotId, candidate);
      }
    } catch (error) {
      logger.warn("Skipping unreadable snapshot restore candidate", {
        artifactPath,
        error,
      });
    }
  }

  return Array.from(deduped.values())
    .sort(
      (left, right) =>
        new Date(right.savedAt).getTime() - new Date(left.savedAt).getTime(),
    )
    .map(({ priority: _priority, ...candidate }) => candidate);
}

export async function cleanupOrphanSnapshotArtifacts(options?: {
  snapshotIds?: string[];
  minAgeMs?: number;
}): Promise<{ scanned: number; deleted: number }> {
  const targetIds =
    options?.snapshotIds && options.snapshotIds.length > 0
      ? new Set(options.snapshotIds)
      : null;
  const minAgeMs =
    typeof options?.minAgeMs === "number" && options.minAgeMs > 0
      ? options.minAgeMs
      : 0;
  const now = Date.now();

  const persistedSnapshots = targetIds
    ? await db.getClient().snapshot.findMany({
        where: { id: { in: Array.from(targetIds) } },
        select: { id: true },
      })
    : await db.getClient().snapshot.findMany({
        select: { id: true },
      });
  const persistedSnapshotIds = new Set(
    persistedSnapshots.map((snapshot: { id: string }) => snapshot.id),
  );

  const roots = await resolveArtifactRoots();
  const artifactPaths: string[] = [];
  for (const root of roots) {
    await collectSnapFilesRecursive(root, artifactPaths);
  }

  let scanned = 0;
  let deleted = 0;

  for (const artifactPath of artifactPaths) {
    const snapshotId = extractSnapshotIdFromArtifactPath(artifactPath);
    if (!snapshotId) continue;
    if (targetIds && !targetIds.has(snapshotId)) continue;

    scanned += 1;
    if (persistedSnapshotIds.has(snapshotId)) continue;

    if (minAgeMs > 0) {
      try {
        const stat = await fs.stat(artifactPath);
        if (now - stat.mtimeMs < minAgeMs) {
          continue;
        }
      } catch {
        continue;
      }
    }

    try {
      await fs.unlink(artifactPath);
      deleted += 1;
    } catch (error) {
      logger.warn("Failed to delete orphan snapshot artifact", {
        artifactPath,
        snapshotId,
        error,
      });
    }
  }

  return { scanned, deleted };
}

export async function writeFullSnapshotArtifact(
  snapshotId: string,
  input: SnapshotCreateInput,
) {
  logger.info("Preparing snapshot artifact", {
    snapshotId,
    projectId: input.projectId,
    chapterId: input.chapterId,
  });

  const [project, projectPath] = await Promise.all([
    db.getClient().project.findUnique({
      where: { id: input.projectId },
      include: {
        settings: true,
        chapters: { orderBy: { order: "asc" } },
        characters: true,
        terms: true,
      },
    }) as Promise<ProjectSnapshotRecord | null>,
    getProjectAttachmentPath(input.projectId),
  ]);

  if (!project) {
    throw new ServiceError(ErrorCode.PROJECT_NOT_FOUND, "Project not found", {
      projectId: input.projectId,
    });
  }

  if (!projectPath) {
    logger.warn(
      "Project path missing for snapshot; skipping local package snapshot",
      {
        snapshotId,
        projectId: input.projectId,
      },
    );
  }

  const snapshotData: FullSnapshotData = {
    meta: {
      version: APP_VERSION,
      timestamp: new Date().toISOString(),
      snapshotId,
      projectId: String(project.id),
    },
    data: {
      project: {
        id: String(project.id),
        title: project.title,
        description: project.description,
        projectPath,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      },
      settings: project.settings ?? undefined,
      chapters: project.chapters.map((chapter) => ({
        id: chapter.id,
        title: chapter.title,
        content: chapter.content,
        synopsis: chapter.synopsis,
        order: chapter.order,
        wordCount: chapter.wordCount,
        createdAt: chapter.createdAt.toISOString(),
        updatedAt: chapter.updatedAt.toISOString(),
      })),
      characters: project.characters.map((character) => ({
        id: character.id,
        name: character.name,
        description: character.description,
        firstAppearance: character.firstAppearance,
        attributes: character.attributes,
        createdAt: character.createdAt.toISOString(),
        updatedAt: character.updatedAt.toISOString(),
      })),
      terms: project.terms.map((term) => ({
        id: term.id,
        term: term.term,
        definition: term.definition,
        category: term.category,
        firstAppearance: term.firstAppearance,
        createdAt: term.createdAt.toISOString(),
        updatedAt: term.updatedAt.toISOString(),
      })),
      focus: {
        chapterId: input.chapterId ?? null,
        content: input.content ?? null,
      },
    },
  };

  const snapshotJson = JSON.stringify(snapshotData);
  const buffer = await gzip(Buffer.from(snapshotJson, "utf8"));
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `${timestamp}-${snapshotId}.snap`;

  let localPath: string | undefined;
  let projectBackupPath: string | undefined;

  const safeProjectName = sanitizeName(project.title ?? "", String(project.id));
  let projectBaseDir: string | null = null;

  if (projectPath) {
    try {
      projectBaseDir = resolveProjectBaseDir(projectPath);
      const localDir = resolveLocalSnapshotDir(projectBaseDir, safeProjectName);
      await fs.mkdir(localDir, { recursive: true });
      localPath = path.join(localDir, fileName);
      await writeFileAtomic(localPath, buffer);
    } catch (error) {
      logger.warn(
        "Skipping project-local snapshot artifact write for invalid projectPath",
        {
          snapshotId,
          projectId: project.id,
          projectPath,
          error,
        },
      );
    }
  }

  const backupDir = path.join(
    app.getPath("userData"),
    SNAPSHOT_BACKUP_DIR,
    safeProjectName,
  );
  await fs.mkdir(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, fileName);
  await writeFileAtomic(backupPath, buffer);

  if (projectBaseDir) {
    const projectBackupDir = path.join(
      projectBaseDir,
      `backup${safeProjectName}`,
    );
    await fs.mkdir(projectBackupDir, { recursive: true });
    projectBackupPath = path.join(projectBackupDir, fileName);
    await writeFileAtomic(projectBackupPath, buffer);
  }

  logger.info("Full snapshot saved", {
    snapshotId,
    projectId: project.id,
    projectPath,
    localPath,
    backupPath,
    projectBackupPath,
  });
}
