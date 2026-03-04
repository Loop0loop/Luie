import { randomUUID } from "node:crypto";
import {
  LUIE_PACKAGE_EXTENSION,
  LUIE_WORLD_DIR,
  LUIE_WORLD_DRAWING_FILE,
  LUIE_WORLD_GRAPH_FILE,
  LUIE_WORLD_MINDMAP_FILE,
  LUIE_WORLD_PLOT_FILE,
  LUIE_WORLD_SCRAP_MEMOS_FILE,
  LUIE_WORLD_SYNOPSIS_FILE,
} from "../../../../shared/constants/index.js";
import type { SyncPendingProjectDelete } from "../../../../shared/types/index.js";
import {
  isRecord,
  normalizeWorldScrapPayload,
  parseWorldJsonSafely,
  toWorldUpdatedAt,
} from "../../../../shared/world/worldDocumentCodec.js";
import { readLuieEntry } from "../../../utils/luiePackage.js";
import { ensureSafeAbsolutePath } from "../../../utils/pathValidation.js";
import {
  createEmptySyncBundle,
  type SyncBundle,
} from "./syncMapper.js";
import type { LoggerLike as LuieWriterLogger } from "../../io/luiePackageTypes.js";

type LoggerLike = LuieWriterLogger & {
  warn: (message: string, details?: unknown) => void;
};

type WorldDocumentType = SyncBundle["worldDocuments"][number]["docType"];

const WORLD_DOCUMENT_FILES: Array<{
  docType: "synopsis" | "plot" | "drawing" | "mindmap" | "graph";
  fileName: string;
}> = [
  { docType: "synopsis", fileName: LUIE_WORLD_SYNOPSIS_FILE },
  { docType: "plot", fileName: LUIE_WORLD_PLOT_FILE },
  { docType: "drawing", fileName: LUIE_WORLD_DRAWING_FILE },
  { docType: "mindmap", fileName: LUIE_WORLD_MINDMAP_FILE },
  { docType: "graph", fileName: LUIE_WORLD_GRAPH_FILE },
];

const WORLD_DOCUMENT_FILE_BY_TYPE: Record<WorldDocumentType, string> = {
  synopsis: LUIE_WORLD_SYNOPSIS_FILE,
  plot: LUIE_WORLD_PLOT_FILE,
  drawing: LUIE_WORLD_DRAWING_FILE,
  mindmap: LUIE_WORLD_MINDMAP_FILE,
  graph: LUIE_WORLD_GRAPH_FILE,
  scrap: LUIE_WORLD_SCRAP_MEMOS_FILE,
};

const WORLD_DOCUMENT_TYPES: WorldDocumentType[] = [
  "synopsis",
  "plot",
  "drawing",
  "mindmap",
  "graph",
  "scrap",
];

const toIsoString = (value: unknown, fallback = new Date().toISOString()): string => {
  if (typeof value === "string" && value.length > 0) return value;
  if (value instanceof Date) return value.toISOString();
  return fallback;
};

const toNullableString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const toNumber = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const appendProjectRecord = (
  bundle: SyncBundle,
  userId: string,
  projectRow: Record<string, unknown>,
): { projectId: string; projectPath: string | null; projectUpdatedAt: string } | null => {
  const projectId = toNullableString(projectRow.id);
  if (!projectId) return null;
  const projectUpdatedAt = toIsoString(projectRow.updatedAt);

  bundle.projects.push({
    id: projectId,
    userId,
    title: toNullableString(projectRow.title) ?? "Untitled",
    description: toNullableString(projectRow.description),
    createdAt: toIsoString(projectRow.createdAt),
    updatedAt: projectUpdatedAt,
  });

  return {
    projectId,
    projectPath: toNullableString(projectRow.projectPath),
    projectUpdatedAt,
  };
};

const appendChapterRecords = (
  bundle: SyncBundle,
  userId: string,
  projectId: string,
  chapters: Array<Record<string, unknown>>,
): void => {
  for (const row of chapters) {
    const chapterId = toNullableString(row.id);
    if (!chapterId) continue;
    const chapterDeletedAt = toNullableString(row.deletedAt);
    bundle.chapters.push({
      id: chapterId,
      userId,
      projectId,
      title: toNullableString(row.title) ?? "Untitled",
      content: toNullableString(row.content) ?? "",
      synopsis: toNullableString(row.synopsis),
      order: toNumber(row.order),
      wordCount: toNumber(row.wordCount),
      createdAt: toIsoString(row.createdAt),
      updatedAt: toIsoString(row.updatedAt),
      deletedAt: chapterDeletedAt,
    });

    if (!chapterDeletedAt) continue;
    bundle.tombstones.push({
      id: `${projectId}:chapter:${chapterId}`,
      userId,
      projectId,
      entityType: "chapter",
      entityId: chapterId,
      deletedAt: chapterDeletedAt,
      updatedAt: chapterDeletedAt,
    });
  }
};

const appendCharacterRecords = (
  bundle: SyncBundle,
  userId: string,
  projectId: string,
  characters: Array<Record<string, unknown>>,
): void => {
  for (const row of characters) {
    const characterId = toNullableString(row.id);
    if (!characterId) continue;
    bundle.characters.push({
      id: characterId,
      userId,
      projectId,
      name: toNullableString(row.name) ?? "Character",
      description: toNullableString(row.description),
      firstAppearance: toNullableString(row.firstAppearance),
      attributes: toNullableString(row.attributes),
      createdAt: toIsoString(row.createdAt),
      updatedAt: toIsoString(row.updatedAt),
    });
  }
};

const appendTermRecords = (
  bundle: SyncBundle,
  userId: string,
  projectId: string,
  terms: Array<Record<string, unknown>>,
): void => {
  for (const row of terms) {
    const termId = toNullableString(row.id);
    if (!termId) continue;
    bundle.terms.push({
      id: termId,
      userId,
      projectId,
      term: toNullableString(row.term) ?? "Term",
      definition: toNullableString(row.definition),
      category: toNullableString(row.category),
      order: toNumber(row.order),
      firstAppearance: toNullableString(row.firstAppearance),
      createdAt: toIsoString(row.createdAt),
      updatedAt: toIsoString(row.updatedAt),
    });
  }
};

const appendPendingProjectDeleteTombstones = (
  bundle: SyncBundle,
  userId: string,
  pendingProjectDeletes: SyncPendingProjectDelete[],
): void => {
  for (const pendingDelete of pendingProjectDeletes) {
    bundle.tombstones.push({
      id: `${pendingDelete.projectId}:project:${pendingDelete.projectId}`,
      userId,
      projectId: pendingDelete.projectId,
      entityType: "project",
      entityId: pendingDelete.projectId,
      deletedAt: pendingDelete.deletedAt,
      updatedAt: pendingDelete.deletedAt,
    });
  }
};

const addWorldDocumentRecord = (
  bundle: SyncBundle,
  userId: string,
  projectId: string,
  docType: SyncBundle["worldDocuments"][number]["docType"],
  payload: unknown,
  updatedAtFallback: string,
): void => {
  bundle.worldDocuments.push({
    id: `${projectId}:${docType}`,
    userId,
    projectId,
    docType,
    payload,
    updatedAt: toWorldUpdatedAt(payload) ?? updatedAtFallback,
  });
};

const readWorldDocumentPayload = async (
  projectPath: string,
  docType: WorldDocumentType,
  logger: LoggerLike,
): Promise<unknown | null> => {
  const fileName = WORLD_DOCUMENT_FILE_BY_TYPE[docType];
  const entryPath = `${LUIE_WORLD_DIR}/${fileName}`;
  let raw: string | null = null;
  try {
    raw = await readLuieEntry(projectPath, entryPath, logger);
  } catch (error) {
    logger.warn("Failed to read .luie world document for sync; skipping doc", {
      projectPath,
      entryPath,
      docType,
      error,
    });
    return null;
  }

  if (raw === null) {
    return null;
  }

  const parsed = parseWorldJsonSafely(raw);
  if (parsed === null) {
    logger.warn("Failed to parse .luie world document for sync; skipping doc", {
      projectPath,
      entryPath,
      docType,
    });
    return null;
  }

  return parsed;
};

const appendScrapMemos = (
  bundle: SyncBundle,
  userId: string,
  projectId: string,
  payload: unknown,
  updatedAtFallback: string,
): void => {
  const normalizedScrap = normalizeWorldScrapPayload(payload);
  for (const memo of normalizedScrap.memos) {
    bundle.memos.push({
      id: memo.id || randomUUID(),
      userId,
      projectId,
      title: memo.title || "Memo",
      content: memo.content,
      tags: memo.tags,
      updatedAt: memo.updatedAt || updatedAtFallback,
    });
  }
};

const collectWorldDocuments = async (input: {
  bundle: SyncBundle;
  userId: string;
  projectId: string;
  projectPath: string;
  updatedAtFallback: string;
  logger: LoggerLike;
}): Promise<void> => {
  for (const descriptor of WORLD_DOCUMENT_FILES) {
    const payload = await readWorldDocumentPayload(
      input.projectPath,
      descriptor.docType,
      input.logger,
    );
    if (!payload) continue;
    addWorldDocumentRecord(
      input.bundle,
      input.userId,
      input.projectId,
      descriptor.docType,
      payload,
      input.updatedAtFallback,
    );
  }

  const scrapPayload = await readWorldDocumentPayload(
    input.projectPath,
    "scrap",
    input.logger,
  );
  if (!isRecord(scrapPayload)) return;

  addWorldDocumentRecord(
    input.bundle,
    input.userId,
    input.projectId,
    "scrap",
    scrapPayload,
    input.updatedAtFallback,
  );
  appendScrapMemos(
    input.bundle,
    input.userId,
    input.projectId,
    scrapPayload,
    input.updatedAtFallback,
  );
};

const collectProjectBundleData = async (
  bundle: SyncBundle,
  userId: string,
  projectRow: Record<string, unknown>,
  logger: LoggerLike,
): Promise<void> => {
  const project = appendProjectRecord(bundle, userId, projectRow);
  if (!project) return;
  const { projectId, projectPath, projectUpdatedAt } = project;

  appendChapterRecords(
    bundle,
    userId,
    projectId,
    Array.isArray(projectRow.chapters)
      ? (projectRow.chapters as Array<Record<string, unknown>>)
      : [],
  );
  appendCharacterRecords(
    bundle,
    userId,
    projectId,
    Array.isArray(projectRow.characters)
      ? (projectRow.characters as Array<Record<string, unknown>>)
      : [],
  );
  appendTermRecords(
    bundle,
    userId,
    projectId,
    Array.isArray(projectRow.terms)
      ? (projectRow.terms as Array<Record<string, unknown>>)
      : [],
  );

  if (projectPath && projectPath.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION)) {
    try {
      const safeProjectPath = ensureSafeAbsolutePath(projectPath, "projectPath");
      await collectWorldDocuments({
        bundle,
        userId,
        projectId,
        projectPath: safeProjectPath,
        updatedAtFallback: projectUpdatedAt,
        logger,
      });
    } catch (error) {
      logger.warn("Skipping sync world document read for invalid projectPath", {
        projectId,
        projectPath,
        error,
      });
    }
  }
};

export const buildLocalSyncBundle = async (input: {
  userId: string;
  pendingProjectDeletes: SyncPendingProjectDelete[];
  projectRows: Array<Record<string, unknown>>;
  logger: LoggerLike;
}): Promise<SyncBundle> => {
  const bundle = createEmptySyncBundle();
  for (const projectRow of input.projectRows) {
    await collectProjectBundleData(bundle, input.userId, projectRow, input.logger);
  }
  appendPendingProjectDeleteTombstones(
    bundle,
    input.userId,
    input.pendingProjectDeletes,
  );
  return bundle;
};

export const hydrateMissingWorldDocsFromPackage = async (
  worldDocs: Map<WorldDocumentType, unknown>,
  projectPath: string,
  logger: LoggerLike,
): Promise<void> => {
  const missingDocTypes = WORLD_DOCUMENT_TYPES.filter((docType) => !worldDocs.has(docType));
  if (missingDocTypes.length === 0) return;

  await Promise.all(
    missingDocTypes.map(async (docType) => {
      const payload = await readWorldDocumentPayload(projectPath, docType, logger);
      if (payload !== null) {
        worldDocs.set(docType, payload);
      }
    }),
  );
};
