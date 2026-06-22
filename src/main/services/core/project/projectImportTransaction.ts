import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "../../../infra/database/index.js";
import * as schema from "../../../infra/database/index.js";
import { DEFAULT_PROJECT_AUTO_SAVE_INTERVAL_SECONDS } from "../../../../shared/constants/index.js";
import { WORLD_SCRAP_MEMOS_SCHEMA_VERSION } from "../../../../shared/constants/storage/persistence.js";
import { normalizeWorldScrapPayload } from "../../../../shared/world/worldDocumentCodec.js";
import type { ReplicaWorldDocumentType } from "../../../../shared/types/index.js";
import type {
  CharacterCreateRow,
  ChapterCreateRow,
  EntityRelationCreateRow,
  EventCreateRow,
  FactionCreateRow,
  SnapshotCreateRow,
  TermCreateRow,
  WorldEntityCreateRow,
} from "./projectImportCodec.js";
import {
  applyMemoryCanonicalPackagePayload,
  type MemoryCanonicalPackagePayload,
} from "../../features/memory/persistence/index.js";


const { project, projectSettings, chapter, character, term, faction, event, worldEntity, entityRelation, snapshot: snapshotTable, worldDocument: worldDocumentTable, scrapMemo, projectAttachment } = schema;

type ExistingProjectLookup = { id: string; updatedAt: Date } | null;

type LuieMetaInput = {
  title?: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type ImportedWorldDocumentPayload = Record<string, unknown> | null | undefined;

type ProjectImportTransactionInput = {
  resolvedProjectId: string;
  legacyProjectId: string | null;
  existing: ExistingProjectLookup;
  meta: LuieMetaInput;
  worldSynopsis?: ImportedWorldDocumentPayload;
  worldPlot?: ImportedWorldDocumentPayload;
  worldDrawing?: ImportedWorldDocumentPayload;
  worldMindmap?: ImportedWorldDocumentPayload;
  worldScrapMemos?: ImportedWorldDocumentPayload;
  worldGraph?: ImportedWorldDocumentPayload;
  memoryCanonical?: MemoryCanonicalPackagePayload | null;
  resolvedPath: string;
  chaptersForCreate: ChapterCreateRow[];
  charactersForCreate: CharacterCreateRow[];
  termsForCreate: TermCreateRow[];
  factionsForCreate: FactionCreateRow[];
  eventsForCreate: EventCreateRow[];
  worldEntitiesForCreate: WorldEntityCreateRow[];
  relationsForCreate: EntityRelationCreateRow[];
  snapshotsForCreate: SnapshotCreateRow[];
};

const toJsonString = (value: unknown): string => JSON.stringify(value ?? null);

const parseDateInput = (value: unknown, fallback: Date): Date => {
  if (typeof value !== "string" || value.length === 0) {
    return fallback;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

const toValidTimestamp = (value: unknown): number | null => {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveImportedAt = (input: {
  meta: LuieMetaInput;
  worldSynopsis?: ImportedWorldDocumentPayload;
  worldPlot?: ImportedWorldDocumentPayload;
  worldDrawing?: ImportedWorldDocumentPayload;
  worldMindmap?: ImportedWorldDocumentPayload;
  worldScrapMemos?: ImportedWorldDocumentPayload;
  worldGraph?: ImportedWorldDocumentPayload;
  snapshotsForCreate: SnapshotCreateRow[];
}): Date => {
  let latestTimestamp =
    toValidTimestamp(input.meta.updatedAt) ??
    toValidTimestamp(input.meta.createdAt) ??
    Date.now();

  const collectPayloadUpdatedAt = (payload: ImportedWorldDocumentPayload) => {
    if (!payload || typeof payload !== "object") return;
    const candidate = toValidTimestamp(
      (payload as Record<string, unknown>).updatedAt,
    );
    if (candidate !== null) {
      latestTimestamp = Math.max(latestTimestamp, candidate);
    }
  };

  collectPayloadUpdatedAt(input.worldSynopsis);
  collectPayloadUpdatedAt(input.worldPlot);
  collectPayloadUpdatedAt(input.worldDrawing);
  collectPayloadUpdatedAt(input.worldMindmap);
  collectPayloadUpdatedAt(input.worldScrapMemos);
  collectPayloadUpdatedAt(input.worldGraph);

  for (const snap of input.snapshotsForCreate) {
    latestTimestamp = Math.max(latestTimestamp, snap.createdAt.getTime());
  }

  return new Date(latestTimestamp);
};

const buildImportedWorldDocumentRows = (input: {
  projectId: string;
  importedAt: Date;
  worldSynopsis?: ImportedWorldDocumentPayload;
  worldPlot?: ImportedWorldDocumentPayload;
  worldDrawing?: ImportedWorldDocumentPayload;
  worldMindmap?: ImportedWorldDocumentPayload;
  worldScrapMemos?: ImportedWorldDocumentPayload;
  worldGraph?: ImportedWorldDocumentPayload;
}) => {
  const rows: Array<{
    projectId: string;
    docType: ReplicaWorldDocumentType;
    payload: string;
    createdAt: string;
    updatedAt: string;
  }> = [];

  const pushDocument = (
    docType: ReplicaWorldDocumentType,
    payload: ImportedWorldDocumentPayload,
  ) => {
    if (!payload) return;
    rows.push({
      projectId: input.projectId,
      docType,
      payload: toJsonString(payload),
      createdAt: input.importedAt.toISOString(),
      updatedAt: parseDateInput(
        typeof payload === "object" && payload !== null
          ? (payload as Record<string, unknown>).updatedAt
          : undefined,
        input.importedAt,
      ).toISOString(),
    });
  };

  pushDocument("synopsis", input.worldSynopsis);
  pushDocument("plot", input.worldPlot);
  pushDocument("drawing", input.worldDrawing);
  pushDocument("mindmap", input.worldMindmap);
  pushDocument("scrap", input.worldScrapMemos);
  pushDocument("graph", input.worldGraph);

  return rows;
};

const buildImportedScrapMemoState = (
  projectId: string,
  worldScrapMemos: ImportedWorldDocumentPayload,
  importedAt: Date,
) => {
  if (!worldScrapMemos) {
    return {
      worldDocumentPayload: undefined,
      memoRows: [],
    };
  }

  const normalized = normalizeWorldScrapPayload(worldScrapMemos);
  const worldDocumentPayload = {
    schemaVersion: WORLD_SCRAP_MEMOS_SCHEMA_VERSION,
    memos: normalized.memos,
    updatedAt: normalized.updatedAt,
  };

  return {
    worldDocumentPayload,
    memoRows: normalized.memos.map((memo, index) => ({
      id: memo.id,
      projectId,
      title: memo.title,
      content: memo.content,
      tags: JSON.stringify(memo.tags),
      sortOrder: index,
      createdAt: importedAt.toISOString(),
      updatedAt: parseDateInput(memo.updatedAt, importedAt).toISOString(),
    })),
  };
};

export const applyProjectImportTransaction = async (
  input: ProjectImportTransactionInput,
) => {
  const {
    resolvedProjectId,
    legacyProjectId,
    existing,
    meta,
    worldSynopsis,
    worldPlot,
    worldDrawing,
    worldMindmap,
    worldScrapMemos,
    worldGraph,
    memoryCanonical,
    resolvedPath,
    chaptersForCreate,
    charactersForCreate,
    termsForCreate,
    factionsForCreate,
    eventsForCreate,
    worldEntitiesForCreate,
    relationsForCreate,
    snapshotsForCreate,
  } = input;
  const importedAt = resolveImportedAt({
    meta,
    worldSynopsis,
    worldPlot,
    worldDrawing,
    worldMindmap,
    worldScrapMemos,
    worldGraph,
    snapshotsForCreate,
  });
  const importedSynopsisText =
    worldSynopsis &&
    typeof worldSynopsis === "object" &&
    typeof worldSynopsis.synopsis === "string"
      ? worldSynopsis.synopsis
      : undefined;
  const importedScrapState = buildImportedScrapMemoState(
    resolvedProjectId,
    worldScrapMemos,
    importedAt,
  );
  const worldDocumentsForCreate = buildImportedWorldDocumentRows({
    projectId: resolvedProjectId,
    importedAt,
    worldSynopsis,
    worldPlot,
    worldDrawing,
    worldMindmap,
    worldScrapMemos:
      importedScrapState.worldDocumentPayload ?? worldScrapMemos,
    worldGraph,
  });

  const result = db.getClient().transaction((tx) => {
    if (legacyProjectId) {
      tx.delete(project).where(eq(project.id, legacyProjectId)).run();
    }

    if (existing) {
      tx.delete(project).where(eq(project.id, resolvedProjectId)).run();
    }

    const now = importedAt.toISOString();
    tx.insert(project).values({
      id: resolvedProjectId,
      title: meta.title ?? "Recovered Project",
      description:
        (typeof meta.description === "string" ? meta.description : undefined) ??
        importedSynopsisText ??
        undefined,
      createdAt: meta.createdAt ? new Date(meta.createdAt).toISOString() : now,
      updatedAt: now,
    }).run();

    const createdProject = tx.select().from(project).where(eq(project.id, resolvedProjectId)).get()!;

    tx.insert(projectSettings).values({
      id: resolvedProjectId,
      projectId: resolvedProjectId,
      autoSave: true,
      autoSaveInterval: DEFAULT_PROJECT_AUTO_SAVE_INTERVAL_SECONDS,
    }).run();

    if (chaptersForCreate.length > 0) {
      tx.insert(chapter).values(chaptersForCreate.map((c) => ({
        ...c,
        createdAt: now,
        updatedAt: now,
      }))).run();
    }
    if (charactersForCreate.length > 0) {
      tx.insert(character).values(charactersForCreate.map((c) => ({
        ...c,
        createdAt: now,
        updatedAt: now,
      }))).run();
    }
    if (termsForCreate.length > 0) {
      tx.insert(term).values(termsForCreate.map((t) => ({
        ...t,
        createdAt: now,
        updatedAt: now,
        order: 0,
      }))).run();
    }
    if (factionsForCreate.length > 0) {
      tx.insert(faction).values(factionsForCreate.map((f) => ({
        ...f,
        createdAt: now,
        updatedAt: now,
      }))).run();
    }
    if (eventsForCreate.length > 0) {
      tx.insert(event).values(eventsForCreate.map((e) => ({
        ...e,
        createdAt: now,
        updatedAt: now,
      }))).run();
    }
    if (worldEntitiesForCreate.length > 0) {
      tx.insert(worldEntity).values(worldEntitiesForCreate.map((w) => ({
        ...w,
        createdAt: now,
        updatedAt: now,
      }))).run();
    }
    if (relationsForCreate.length > 0) {
      tx.insert(entityRelation).values(relationsForCreate.map((r) => ({
        ...r,
        createdAt: now,
        updatedAt: now,
      }))).run();
    }
    if (snapshotsForCreate.length > 0) {
      tx.insert(snapshotTable).values(snapshotsForCreate.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
      }))).run();
    }
    for (const wd of worldDocumentsForCreate) {
      tx.insert(worldDocumentTable).values({ ...wd, id: randomUUID() }).run();
    }
    if (importedScrapState.memoRows.length > 0) {
      tx.insert(scrapMemo).values(importedScrapState.memoRows).run();
    }
    applyMemoryCanonicalPackagePayload(tx, {
      projectId: resolvedProjectId,
      importedAt,
      validChapterIds: new Set(chaptersForCreate.map((chapterRow) => chapterRow.id)),
      payload: memoryCanonical,
    });
    const normalizedProjectPath = resolvedPath || null;
    if (normalizedProjectPath) {
      const now2 = new Date().toISOString();
      tx.insert(projectAttachment).values({
        projectId: resolvedProjectId,
        projectPath: normalizedProjectPath,
        updatedAt: now2,
      }).onConflictDoUpdate({
        target: projectAttachment.projectId,
        set: { projectPath: normalizedProjectPath, updatedAt: now2 },
      }).run();
    }
    return createdProject;
  });

  return {
    ...result,
    projectPath: resolvedPath,
  };
};
