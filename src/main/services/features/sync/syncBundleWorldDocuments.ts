import { randomUUID } from "node:crypto";
import {
  LUIE_WORLD_DIR,
  LUIE_WORLD_DRAWING_FILE,
  LUIE_WORLD_GRAPH_FILE,
  LUIE_WORLD_MINDMAP_FILE,
  LUIE_WORLD_PLOT_FILE,
  LUIE_WORLD_SCRAP_MEMOS_FILE,
  LUIE_WORLD_SYNOPSIS_FILE,
} from "../../../../shared/constants/index.js";
import {
  normalizeWorldScrapPayload,
  parseWorldJsonSafely,
  toWorldUpdatedAt,
} from "../../../../shared/world/worldDocumentCodec.js";
import { readLuieContainerEntry } from "../../io/luieContainer.js";
import type { SyncBundle } from "./syncMapper.js";
import {
  toIsoString,
  toNullableString,
  toStringArray,
  type LoggerLike,
  type WorldDocumentType,
} from "./syncBundleCollectorTypes.js";

const WORLD_DOCUMENT_FILE_BY_TYPE: Record<WorldDocumentType, string> = {
  synopsis: LUIE_WORLD_SYNOPSIS_FILE,
  plot: LUIE_WORLD_PLOT_FILE,
  drawing: LUIE_WORLD_DRAWING_FILE,
  mindmap: LUIE_WORLD_MINDMAP_FILE,
  graph: LUIE_WORLD_GRAPH_FILE,
  scrap: LUIE_WORLD_SCRAP_MEMOS_FILE,
};

export const WORLD_DOCUMENT_TYPES: WorldDocumentType[] = [
  "synopsis",
  "plot",
  "drawing",
  "mindmap",
  "graph",
  "scrap",
];

const isWorldDocumentType = (value: string): value is WorldDocumentType =>
  WORLD_DOCUMENT_TYPES.includes(value as WorldDocumentType);

export const addWorldDocumentRecord = (
  bundle: SyncBundle,
  userId: string,
  projectId: string,
  docType: WorldDocumentType,
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
  let raw: string | null;
  try {
    raw = await readLuieContainerEntry(projectPath, entryPath, logger);
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

export const appendScrapMemos = (
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

export const collectReplicaWorldDocuments = (
  projectRow: Record<string, unknown>,
  projectId: string,
  logger: LoggerLike,
): Map<WorldDocumentType, unknown> => {
  const collected = new Map<WorldDocumentType, unknown>();
  const rows = Array.isArray(projectRow.worldDocuments)
    ? (projectRow.worldDocuments as Array<Record<string, unknown>>)
    : [];

  for (const row of rows) {
    const docType = toNullableString(row.docType);
    if (!docType || !isWorldDocumentType(docType) || collected.has(docType)) {
      continue;
    }

    const rawPayload = toNullableString(row.payload);
    if (!rawPayload) continue;

    const parsed = parseWorldJsonSafely(rawPayload);
    if (parsed === null) {
      logger.warn("Skipping invalid replica world document payload during sync collect", {
        projectId,
        docType,
      });
      continue;
    }

    collected.set(docType, parsed);
  }

  return collected;
};

export const appendReplicaScrapMemoRecords = (
  bundle: SyncBundle,
  userId: string,
  projectId: string,
  projectRow: Record<string, unknown>,
): boolean => {
  const rows = Array.isArray(projectRow.scrapMemos)
    ? (projectRow.scrapMemos as Array<Record<string, unknown>>)
    : [];
  if (rows.length === 0) return false;

  for (const row of rows) {
    const memoId = toNullableString(row.id);
    if (!memoId) continue;
    bundle.memos.push({
      id: memoId,
      userId,
      projectId,
      title: toNullableString(row.title) ?? "Memo",
      content: toNullableString(row.content) ?? "",
      tags: toStringArray(parseWorldJsonSafely(toNullableString(row.tags))),
      updatedAt: toIsoString(row.updatedAt),
    });
  }

  return bundle.memos.some((memo) => memo.projectId === projectId);
};

export const hydrateMissingWorldDocsFromPackage = async (
  worldDocs: Map<WorldDocumentType, unknown>,
  projectPath: string,
  logger: LoggerLike,
  skippedDocTypes: Set<WorldDocumentType> = new Set(),
): Promise<void> => {
  const missingDocTypes = WORLD_DOCUMENT_TYPES.filter(
    (docType) => !worldDocs.has(docType) && !skippedDocTypes.has(docType),
  );
  if (missingDocTypes.length === 0) return;

  await Promise.all(
    missingDocTypes.map(async (docType) => {
      const payload = await readWorldDocumentPayload(
        projectPath,
        docType,
        logger,
      );
      if (payload !== null) {
        worldDocs.set(docType, payload);
      }
    }),
  );
};
