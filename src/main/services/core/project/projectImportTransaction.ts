import type { Prisma } from "@prisma/client";
import { db } from "../../../database/index.js";
import { DEFAULT_PROJECT_AUTO_SAVE_INTERVAL_SECONDS } from "../../../../shared/constants/index.js";
import { WORLD_SCRAP_MEMOS_SCHEMA_VERSION } from "../../../../shared/constants/persistence.js";
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
import { setProjectAttachmentPath } from "./projectAttachmentStore.js";

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
    createdAt: Date;
    updatedAt: Date;
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
      createdAt: input.importedAt,
      updatedAt: parseDateInput(
        typeof payload === "object" && payload !== null
          ? (payload as Record<string, unknown>).updatedAt
          : undefined,
        input.importedAt,
      ),
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
      createdAt: importedAt,
      updatedAt: parseDateInput(memo.updatedAt, importedAt),
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
  const importedAt = parseDateInput(meta.updatedAt, new Date());
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

  const project = (await db.getClient().$transaction(async (
    tx: Prisma.TransactionClient,
  ) => {
    if (legacyProjectId) {
      await tx.project.delete({ where: { id: legacyProjectId } });
    }

    if (existing) {
      await tx.project.delete({ where: { id: resolvedProjectId } });
    }

    const project = await tx.project.create({
      data: {
        id: resolvedProjectId,
        title: meta.title ?? "Recovered Project",
        description:
          (typeof meta.description === "string" ? meta.description : undefined) ??
          importedSynopsisText ??
          undefined,
        createdAt: meta.createdAt ? new Date(meta.createdAt) : undefined,
        updatedAt: meta.updatedAt ? new Date(meta.updatedAt) : undefined,
        settings: {
          create: {
            autoSave: true,
            autoSaveInterval: DEFAULT_PROJECT_AUTO_SAVE_INTERVAL_SECONDS,
          },
        },
      },
      include: { settings: true },
    });

    if (chaptersForCreate.length > 0) {
      await tx.chapter.createMany({ data: chaptersForCreate });
    }
    if (charactersForCreate.length > 0) {
      await tx.character.createMany({ data: charactersForCreate });
    }
    if (termsForCreate.length > 0) {
      await tx.term.createMany({ data: termsForCreate });
    }
    if (factionsForCreate.length > 0) {
      await tx.faction.createMany({ data: factionsForCreate });
    }
    if (eventsForCreate.length > 0) {
      await tx.event.createMany({ data: eventsForCreate });
    }
    if (worldEntitiesForCreate.length > 0) {
      await tx.worldEntity.createMany({ data: worldEntitiesForCreate });
    }
    if (relationsForCreate.length > 0) {
      await tx.entityRelation.createMany({ data: relationsForCreate });
    }
    if (snapshotsForCreate.length > 0) {
      await tx.snapshot.createMany({ data: snapshotsForCreate });
    }
    for (const worldDocument of worldDocumentsForCreate) {
      await tx.worldDocument.create({
        data: worldDocument,
      });
    }
    if (importedScrapState.memoRows.length > 0) {
      await tx.scrapMemo.createMany({
        data: importedScrapState.memoRows,
      });
    }
    await setProjectAttachmentPath(resolvedProjectId, resolvedPath, tx);
    return project;
  })) as {
    id: string;
    title: string;
    description?: string | null;
    projectPath?: string | null;
    createdAt: Date;
    updatedAt: Date;
    settings?: unknown;
  };

  return {
    ...project,
    projectPath: resolvedPath,
  };
};
