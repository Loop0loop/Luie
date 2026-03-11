import type { Prisma } from "@prisma/client";
import { db } from "../../../database/index.js";
import { DEFAULT_PROJECT_AUTO_SAVE_INTERVAL_SECONDS } from "../../../../shared/constants/index.js";
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

type ProjectImportTransactionInput = {
  resolvedProjectId: string;
  legacyProjectId: string | null;
  existing: ExistingProjectLookup;
  meta: LuieMetaInput;
  worldSynopsis?: string;
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

export const applyProjectImportTransaction = async (
  input: ProjectImportTransactionInput,
) => {
  const {
    resolvedProjectId,
    legacyProjectId,
    existing,
    meta,
    worldSynopsis,
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
          worldSynopsis ??
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
