import { app } from "electron";
import { promises as fs } from "fs";
import path from "path";
import { promisify } from "node:util";
import { gzip as gzipCallback, gunzip as gunzipCallback } from "node:zlib";
import { db } from "../../database/index.js";
import { createLogger } from "../../../shared/logger/index.js";
import {
  APP_VERSION,
  ErrorCode,
  LUIE_PACKAGE_EXTENSION,
  LUIE_SNAPSHOTS_DIR,
  SNAPSHOT_BACKUP_DIR,
} from "../../../shared/constants/index.js";
import type { SnapshotCreateInput } from "../../../shared/types/index.js";
import { ServiceError } from "../../utils/serviceError.js";

const logger = createLogger("SnapshotArtifacts");
const gzip = promisify(gzipCallback);
const gunzip = promisify(gunzipCallback);

function sanitizeDirName(input: string, fallback: string) {
  const trimmed = input.trim();
  if (!trimmed) return fallback;
  return trimmed.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
}

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

export async function readFullSnapshotArtifact(filePath: string): Promise<FullSnapshotData> {
  const buffer = await fs.readFile(filePath);
  const jsonBuffer = await gunzip(buffer);
  const payload = JSON.parse(jsonBuffer.toString("utf8"));
  return payload as FullSnapshotData;
}

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

function resolveLocalSnapshotDir(projectPath: string, projectId: string) {
  const normalized = projectPath.trim();
  const baseDir = normalized.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION)
    ? path.dirname(normalized)
    : normalized;
  return path.join(baseDir, ".luie", LUIE_SNAPSHOTS_DIR, projectId);
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

  const project = (await db.getClient().project.findUnique({
    where: { id: input.projectId },
    include: {
      settings: true,
      chapters: { orderBy: { order: "asc" } },
      characters: true,
      terms: true,
    },
  })) as ProjectSnapshotRecord | null;

  if (!project) {
    throw new ServiceError(ErrorCode.PROJECT_NOT_FOUND, "Project not found", {
      projectId: input.projectId,
    });
  }

  if (!project.projectPath) {
    logger.error("Project path missing for snapshot", {
      snapshotId,
      projectId: input.projectId,
    });
    throw new ServiceError(
      ErrorCode.REQUIRED_FIELD_MISSING,
      "Project path is required for full snapshot",
      { projectId: input.projectId },
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
        projectPath: project.projectPath,
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

  const localDir = resolveLocalSnapshotDir(project.projectPath, project.id);
  await fs.mkdir(localDir, { recursive: true });
  const localPath = path.join(localDir, fileName);
  await fs.writeFile(localPath, buffer);

  const safeProjectName = sanitizeDirName(project.title ?? "", String(project.id));
  const backupDir = path.join(app.getPath("userData"), SNAPSHOT_BACKUP_DIR, safeProjectName);
  await fs.mkdir(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, fileName);
  await fs.writeFile(backupPath, buffer);

  logger.info("Full snapshot saved", {
    snapshotId,
    projectId: project.id,
    projectPath: project.projectPath,
    localPath,
    backupPath,
  });
}
