import { createLogger } from "../../../../../shared/logger/index.js";
import {
  MEMORY_CANONICAL_EXPORTABLE_TABLES,
  isMemoryRowExportable,
} from "../../../../../shared/constants/index.js";
import type {
  SyncBundle,
  SyncChapterRecord,
  SyncCharacterRecord,
  SyncEventRecord,
  SyncFactionRecord,
  SyncMemoRecord,
  SyncMemoryCanonicalRecord,
  SyncProjectRecord,
  SyncTermRecord,
  SyncTombstoneRecord,
  SyncWorldDocumentRecord,
} from "../syncMapper.js";
import {
  isPlainObject,
  normalizeJsonValue,
  toIsoString,
  toNullableString,
  toNumber,
  toStringArray,
  toStringOrFallback,
  type DbRow,
} from "./rowUtils.js";

const logger = createLogger("SyncRepository");
const memoryCanonicalTables = new Set<string>(
  MEMORY_CANONICAL_EXPORTABLE_TABLES,
);

const mapProjectRow = (row: DbRow): SyncProjectRecord | null => {
  const id = toNullableString(row.id);
  const userId = toNullableString(row.user_id);
  if (!id || !userId) return null;

  return {
    id,
    userId,
    title: toStringOrFallback(row.title, "Untitled"),
    description: toNullableString(row.description),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    deletedAt: toNullableString(row.deleted_at),
  };
};

const mapChapterRow = (row: DbRow): SyncChapterRecord | null => {
  const id = toNullableString(row.id);
  const userId = toNullableString(row.user_id);
  const projectId = toNullableString(row.project_id);
  if (!id || !userId || !projectId) return null;

  return {
    id,
    userId,
    projectId,
    title: toStringOrFallback(row.title, "Untitled"),
    content: toNullableString(row.content) ?? "",
    synopsis: toNullableString(row.synopsis),
    order: toNumber(row.order),
    wordCount: toNumber(row.word_count),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    deletedAt: toNullableString(row.deleted_at),
  };
};

const mapCharacterRow = (row: DbRow): SyncCharacterRecord | null => {
  const id = toNullableString(row.id);
  const userId = toNullableString(row.user_id);
  const projectId = toNullableString(row.project_id);
  if (!id || !userId || !projectId) return null;

  return {
    id,
    userId,
    projectId,
    name: toStringOrFallback(row.name, "Character"),
    description: toNullableString(row.description),
    firstAppearance: toNullableString(row.first_appearance),
    attributes: normalizeJsonValue(row.attributes),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    deletedAt: toNullableString(row.deleted_at),
  };
};

const mapEventRow = (row: DbRow): SyncEventRecord | null => {
  const id = toNullableString(row.id);
  const userId = toNullableString(row.user_id);
  const projectId = toNullableString(row.project_id);
  if (!id || !userId || !projectId) return null;

  return {
    id,
    userId,
    projectId,
    name: toStringOrFallback(row.name, "Event"),
    description: toNullableString(row.description),
    firstAppearance: toNullableString(row.first_appearance),
    attributes: normalizeJsonValue(row.attributes),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    deletedAt: toNullableString(row.deleted_at),
  };
};

const mapFactionRow = (row: DbRow): SyncFactionRecord | null => {
  const id = toNullableString(row.id);
  const userId = toNullableString(row.user_id);
  const projectId = toNullableString(row.project_id);
  if (!id || !userId || !projectId) return null;

  return {
    id,
    userId,
    projectId,
    name: toStringOrFallback(row.name, "Faction"),
    description: toNullableString(row.description),
    firstAppearance: toNullableString(row.first_appearance),
    attributes: normalizeJsonValue(row.attributes),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    deletedAt: toNullableString(row.deleted_at),
  };
};

const mapTermRow = (row: DbRow): SyncTermRecord | null => {
  const id = toNullableString(row.id);
  const userId = toNullableString(row.user_id);
  const projectId = toNullableString(row.project_id);
  if (!id || !userId || !projectId) return null;

  return {
    id,
    userId,
    projectId,
    term: toStringOrFallback(row.term, "Term"),
    definition: toNullableString(row.definition),
    category: toNullableString(row.category),
    order: toNumber(row.order),
    firstAppearance: toNullableString(row.first_appearance),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    deletedAt: toNullableString(row.deleted_at),
  };
};

const mapWorldDocumentRow = (row: DbRow): SyncWorldDocumentRecord | null => {
  const id = toNullableString(row.id);
  const userId = toNullableString(row.user_id);
  const projectId = toNullableString(row.project_id);
  const docType = toNullableString(row.doc_type);
  if (!id || !userId || !projectId || !docType) return null;

  if (
    docType !== "synopsis" &&
    docType !== "plot" &&
    docType !== "drawing" &&
    docType !== "mindmap" &&
    docType !== "scrap" &&
    docType !== "graph"
  ) {
    return null;
  }

  const normalizedPayload = normalizeJsonValue(row.payload);
  const payload = isPlainObject(normalizedPayload) ? normalizedPayload : {};
  if (!isPlainObject(normalizedPayload)) {
    logger.warn(
      "Invalid world document payload from sync source; using empty payload",
      {
        docType,
        payloadType:
          normalizedPayload === null ? "null" : typeof normalizedPayload,
      },
    );
  }

  return {
    id,
    userId,
    projectId,
    docType,
    payload,
    updatedAt: toIsoString(row.updated_at),
    deletedAt: toNullableString(row.deleted_at),
  };
};

const mapMemoRow = (row: DbRow): SyncMemoRecord | null => {
  const id = toNullableString(row.id);
  const userId = toNullableString(row.user_id);
  const projectId = toNullableString(row.project_id);
  if (!id || !userId || !projectId) return null;

  return {
    id,
    userId,
    projectId,
    title: toStringOrFallback(row.title, "Memo"),
    content: toNullableString(row.content) ?? "",
    tags: toStringArray(row.tags),
    updatedAt: toIsoString(row.updated_at),
    deletedAt: toNullableString(row.deleted_at),
  };
};

const mapMemoryCanonicalRow = (
  row: DbRow,
): SyncMemoryCanonicalRecord | null => {
  const id = toNullableString(row.id);
  const userId = toNullableString(row.user_id);
  const projectId = toNullableString(row.project_id);
  const tableName = toNullableString(row.table_name);
  if (!id || !userId || !projectId || !tableName) return null;
  if (!memoryCanonicalTables.has(tableName)) return null;

  const normalizedRow = normalizeJsonValue(row.row);
  if (!isPlainObject(normalizedRow)) {
    logger.warn("Invalid canonical memory row from sync source; skipping row", {
      id,
      tableName,
      rowType: normalizedRow === null ? "null" : typeof normalizedRow,
    });
    return null;
  }
  const rowId = toNullableString(normalizedRow.id);
  const rowProjectId = toNullableString(normalizedRow.projectId);
  const rowStatus = toNullableString(normalizedRow.status);
  if (!rowId || rowProjectId !== projectId) {
    logger.warn(
      "Invalid canonical memory row identity from sync source; skipping row",
      {
        id,
        tableName,
        rowProjectId,
        projectId,
      },
    );
    return null;
  }
  if (!isMemoryRowExportable({ tableName, status: rowStatus })) {
    logger.warn(
      "Non-exportable canonical memory row from sync source; skipping row",
      {
        id,
        tableName,
        status: rowStatus,
      },
    );
    return null;
  }

  return {
    id,
    userId,
    projectId,
    tableName,
    row: normalizedRow,
    updatedAt: toIsoString(row.updated_at),
    deletedAt: toNullableString(row.deleted_at),
  };
};

const mapTombstoneRow = (row: DbRow): SyncTombstoneRecord | null => {
  const id = toNullableString(row.id);
  const userId = toNullableString(row.user_id);
  const projectId = toNullableString(row.project_id);
  const entityType = toNullableString(row.entity_type);
  const entityId = toNullableString(row.entity_id);
  if (!id || !userId || !projectId || !entityType || !entityId) return null;

  return {
    id,
    userId,
    projectId,
    entityType,
    entityId,
    deletedAt: toIsoString(row.deleted_at),
    updatedAt: toIsoString(row.updated_at),
  };
};

export function mapRemoteRowsToBundle(
  bundle: SyncBundle,
  rows: {
    projects: DbRow[];
    chapters: DbRow[];
    characters: DbRow[];
    events: DbRow[];
    factions: DbRow[];
    terms: DbRow[];
    worldDocuments: DbRow[];
    memos: DbRow[];
    memoryCanonicalRows?: DbRow[];
    tombstones: DbRow[];
  },
): SyncBundle {
  bundle.projects = rows.projects
    .map(mapProjectRow)
    .filter((row): row is SyncProjectRecord => row !== null);
  bundle.chapters = rows.chapters
    .map(mapChapterRow)
    .filter((row): row is SyncChapterRecord => row !== null);
  bundle.characters = rows.characters
    .map(mapCharacterRow)
    .filter((row): row is SyncCharacterRecord => row !== null);
  bundle.events = rows.events
    .map(mapEventRow)
    .filter((row): row is SyncEventRecord => row !== null);
  bundle.factions = rows.factions
    .map(mapFactionRow)
    .filter((row): row is SyncFactionRecord => row !== null);
  bundle.terms = rows.terms
    .map(mapTermRow)
    .filter((row): row is SyncTermRecord => row !== null);
  bundle.worldDocuments = rows.worldDocuments
    .map(mapWorldDocumentRow)
    .filter((row): row is SyncWorldDocumentRecord => row !== null);
  bundle.memos = rows.memos
    .map(mapMemoRow)
    .filter((row): row is SyncMemoRecord => row !== null);
  bundle.memoryCanonicalRows = (rows.memoryCanonicalRows ?? [])
    .map(mapMemoryCanonicalRow)
    .filter((row): row is SyncMemoryCanonicalRecord => row !== null);
  bundle.tombstones = rows.tombstones
    .map(mapTombstoneRow)
    .filter((row): row is SyncTombstoneRecord => row !== null);

  return bundle;
}
