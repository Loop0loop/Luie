import { app } from "electron";
import { promises as fs } from "fs";
import path from "path";
import { inArray } from "drizzle-orm";
import { db } from "../../../database/index.js";
import { snapshot as snapshotTable } from "../../../database/schema.js";
import { createLogger } from "../../../../shared/logger/index.js";
import {
  APP_VERSION,
  SNAPSHOT_BACKUP_DIR,
} from "../../../../shared/constants/index.js";
import type { SnapshotCreateInput } from "../../../../shared/types/index.js";
import { writeFileAtomic, readMaybeGzip } from "../../../utils/atomicWrite.js";
import { promisify } from "node:util";
import { gzip as gzipCallback } from "node:zlib";
import {
  collectSnapFilesRecursive,
  extractSnapshotIdFromArtifactPath,
  getArtifactPriority,
  resolveArtifactRoots,
  resolveLocalSnapshotDir,
  resolveProjectBaseDir,
} from "./snapshotArtifactPaths.js";
import { loadProjectSnapshotRecord } from "./snapshotArtifactProjectLoader.js";
import { resolveRestorePreview } from "./snapshotArtifactPreview.js";
import type { FullSnapshotData } from "./snapshotArtifactTypes.js";
import type { SnapshotRestoreCandidate } from "../../../../shared/types/index.js";

const logger = createLogger("SnapshotArtifacts");
const gzip = promisify(gzipCallback);

export async function readFullSnapshotArtifact(
  filePath: string,
): Promise<FullSnapshotData> {
  const raw = await readMaybeGzip(filePath);
  const payload = JSON.parse(raw);
  return payload as FullSnapshotData;
}

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

  const store = db.getClient();
  const persistedSnapshots = targetIds
    ? await store
        .select({ id: snapshotTable.id })
        .from(snapshotTable)
        .where(inArray(snapshotTable.id, Array.from(targetIds)))
    : await store.select({ id: snapshotTable.id }).from(snapshotTable);
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

  const { project, projectPath } = await loadProjectSnapshotRecord(
    input.projectId,
  );

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

  const projectDirName = String(project.id);
  let projectBaseDir: string | null = null;

  if (projectPath) {
    try {
      projectBaseDir = resolveProjectBaseDir(projectPath);
      const localDir = resolveLocalSnapshotDir(projectBaseDir, projectDirName);
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
    projectDirName,
  );
  await fs.mkdir(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, fileName);
  await writeFileAtomic(backupPath, buffer);

  if (projectBaseDir) {
    const projectBackupDir = path.join(
      projectBaseDir,
      `backup${projectDirName}`,
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
