import type { Prisma } from "@prisma/client";
import { DEFAULT_PROJECT_AUTO_SAVE_INTERVAL_SECONDS } from "../../../../shared/constants/index.js";
import { createLogger } from "../../../../shared/logger/index.js";
import type { WorldScrapMemosData } from "../../../../shared/types/index.js";
import type { SyncBundle } from "./syncMapper.js";
import type { SyncChapterRecord } from "./syncMapper.js";
import {
  normalizeDrawingPayload,
  normalizeGraphPayload,
  normalizeMindmapPayload,
  normalizePlotPayload,
  normalizeScrapPayload,
  normalizeSynopsisPayload,
} from "./syncWorldDocNormalizer.js";

const logger = createLogger("SyncLocalApply");

export const collectDeletedProjectIds = (bundle: SyncBundle): Set<string> => {
  const deletedProjectIds = new Set<string>();
  for (const project of bundle.projects) {
    if (project.deletedAt) deletedProjectIds.add(project.id);
  }
  for (const tombstone of bundle.tombstones) {
    if (tombstone.entityType !== "project") continue;
    deletedProjectIds.add(tombstone.entityId);
    deletedProjectIds.add(tombstone.projectId);
  }
  return deletedProjectIds;
};

export const applyProjectDeletes = async (
  prisma: Prisma.TransactionClient,
  deletedProjectIds: Set<string>,
): Promise<void> => {
  for (const projectId of deletedProjectIds) {
    const existing = (await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    })) as { id?: string } | null;
    if (!existing?.id) continue;
    await prisma.project.delete({ where: { id: projectId } });
  }
};

export const upsertProjects = async (
  prisma: Prisma.TransactionClient,
  projects: SyncBundle["projects"],
  deletedProjectIds: Set<string>,
): Promise<void> => {
  for (const project of projects) {
    if (project.deletedAt || deletedProjectIds.has(project.id)) continue;
    const existing = (await prisma.project.findUnique({
      where: { id: project.id },
      select: { id: true },
    })) as { id?: string } | null;

    if (existing?.id) {
      await prisma.project.update({
        where: { id: project.id },
        data: {
          title: project.title,
          description: project.description,
          updatedAt: new Date(project.updatedAt),
        },
      });
      continue;
    }

    await prisma.project.create({
      data: {
        id: project.id,
        title: project.title,
        description: project.description,
        createdAt: new Date(project.createdAt),
        updatedAt: new Date(project.updatedAt),
        settings: {
          create: {
            autoSave: true,
            autoSaveInterval: DEFAULT_PROJECT_AUTO_SAVE_INTERVAL_SECONDS,
          },
        },
      },
    });
  }
};

export const upsertChapter = async (
  prisma: Prisma.TransactionClient,
  chapter: SyncChapterRecord,
): Promise<void> => {
  const existing = (await prisma.chapter.findUnique({
    where: { id: chapter.id },
    select: { id: true },
  })) as { id?: string } | null;

  const data = {
    title: chapter.title,
    content: chapter.content,
    synopsis: chapter.synopsis,
    order: chapter.order,
    wordCount: chapter.wordCount,
    updatedAt: new Date(chapter.updatedAt),
    deletedAt: chapter.deletedAt ? new Date(chapter.deletedAt) : null,
    project: {
      connect: { id: chapter.projectId },
    },
  };

  if (existing?.id) {
    await prisma.chapter.update({
      where: { id: chapter.id },
      data,
    });
  } else {
    await prisma.chapter.create({
      data: {
        id: chapter.id,
        ...data,
        createdAt: new Date(chapter.createdAt),
      },
    });
  }
};

export const upsertCharacters = async (
  prisma: Prisma.TransactionClient,
  characters: SyncBundle["characters"],
  deletedProjectIds: Set<string>,
): Promise<void> => {
  for (const character of characters) {
    if (deletedProjectIds.has(character.projectId)) continue;
    const existing = (await prisma.character.findUnique({
      where: { id: character.id },
      select: { id: true },
    })) as { id?: string } | null;

    if (character.deletedAt) {
      if (existing?.id) await prisma.character.delete({ where: { id: character.id } });
      continue;
    }

    const data = {
      name: character.name,
      description: character.description,
      firstAppearance: character.firstAppearance,
      attributes:
        typeof character.attributes === "string"
          ? character.attributes
          : JSON.stringify(character.attributes ?? null),
      updatedAt: new Date(character.updatedAt),
      project: {
        connect: { id: character.projectId },
      },
    };

    if (existing?.id) {
      await prisma.character.update({ where: { id: character.id }, data });
    } else {
      await prisma.character.create({
        data: {
          id: character.id,
          ...data,
          createdAt: new Date(character.createdAt),
        },
      });
    }
  }
};

export const upsertEvents = async (
  prisma: Prisma.TransactionClient,
  events: SyncBundle["events"],
  deletedProjectIds: Set<string>,
): Promise<void> => {
  for (const event of events) {
    if (deletedProjectIds.has(event.projectId)) continue;
    const existing = (await prisma.event.findUnique({
      where: { id: event.id },
      select: { id: true },
    })) as { id?: string } | null;

    if (event.deletedAt) {
      if (existing?.id) await prisma.event.delete({ where: { id: event.id } });
      continue;
    }

    const data = {
      name: event.name,
      description: event.description,
      firstAppearance: event.firstAppearance,
      attributes:
        typeof event.attributes === "string"
          ? event.attributes
          : JSON.stringify(event.attributes ?? null),
      updatedAt: new Date(event.updatedAt),
      project: {
        connect: { id: event.projectId },
      },
    };

    if (existing?.id) {
      await prisma.event.update({ where: { id: event.id }, data });
    } else {
      await prisma.event.create({
        data: {
          id: event.id,
          ...data,
          createdAt: new Date(event.createdAt),
        },
      });
    }
  }
};

export const upsertFactions = async (
  prisma: Prisma.TransactionClient,
  factions: SyncBundle["factions"],
  deletedProjectIds: Set<string>,
): Promise<void> => {
  for (const faction of factions) {
    if (deletedProjectIds.has(faction.projectId)) continue;
    const existing = (await prisma.faction.findUnique({
      where: { id: faction.id },
      select: { id: true },
    })) as { id?: string } | null;

    if (faction.deletedAt) {
      if (existing?.id) await prisma.faction.delete({ where: { id: faction.id } });
      continue;
    }

    const data = {
      name: faction.name,
      description: faction.description,
      firstAppearance: faction.firstAppearance,
      attributes:
        typeof faction.attributes === "string"
          ? faction.attributes
          : JSON.stringify(faction.attributes ?? null),
      updatedAt: new Date(faction.updatedAt),
      project: {
        connect: { id: faction.projectId },
      },
    };

    if (existing?.id) {
      await prisma.faction.update({ where: { id: faction.id }, data });
    } else {
      await prisma.faction.create({
        data: {
          id: faction.id,
          ...data,
          createdAt: new Date(faction.createdAt),
        },
      });
    }
  }
};

export const upsertTerms = async (
  prisma: Prisma.TransactionClient,
  terms: SyncBundle["terms"],
  deletedProjectIds: Set<string>,
): Promise<void> => {
  for (const term of terms) {
    if (deletedProjectIds.has(term.projectId)) continue;
    const existing = (await prisma.term.findUnique({
      where: { id: term.id },
      select: { id: true },
    })) as { id?: string } | null;

    if (term.deletedAt) {
      if (existing?.id) await prisma.term.delete({ where: { id: term.id } });
      continue;
    }

    const data = {
      term: term.term,
      definition: term.definition,
      category: term.category,
      order: term.order,
      firstAppearance: term.firstAppearance,
      updatedAt: new Date(term.updatedAt),
      project: {
        connect: { id: term.projectId },
      },
    };

    if (existing?.id) {
      await prisma.term.update({ where: { id: term.id }, data });
    } else {
      await prisma.term.create({
        data: {
          id: term.id,
          ...data,
          createdAt: new Date(term.createdAt),
        },
      });
    }
  }
};

export const applyChapterTombstones = async (
  prisma: Prisma.TransactionClient,
  tombstones: SyncBundle["tombstones"],
  deletedProjectIds: Set<string>,
): Promise<void> => {
  for (const tombstone of tombstones) {
    if (tombstone.entityType !== "chapter") continue;
    if (deletedProjectIds.has(tombstone.projectId)) continue;
    const existing = (await prisma.chapter.findUnique({
      where: { id: tombstone.entityId },
      select: { id: true, projectId: true },
    })) as { id?: string; projectId?: string } | null;
    if (!existing?.id || existing.projectId !== tombstone.projectId) continue;
    await prisma.chapter.update({
      where: { id: tombstone.entityId },
      data: {
        deletedAt: new Date(tombstone.deletedAt),
        updatedAt: new Date(tombstone.updatedAt),
      },
    });
  }
};

const sortByUpdatedAtDesc = <T extends { updatedAt: string }>(rows: T[]): T[] =>
  [...rows].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));

const buildWorldDocumentMap = (
  worldDocuments: SyncBundle["worldDocuments"],
  projectId: string,
) => {
  const active = new Map<
    SyncBundle["worldDocuments"][number]["docType"],
    SyncBundle["worldDocuments"][number]
  >();
  const deleted = new Set<SyncBundle["worldDocuments"][number]["docType"]>();

  for (const doc of sortByUpdatedAtDesc(worldDocuments)) {
    if (doc.projectId !== projectId) continue;
    if (active.has(doc.docType) || deleted.has(doc.docType)) continue;
    if (doc.deletedAt) {
      deleted.add(doc.docType);
      continue;
    }
    active.set(doc.docType, doc);
  }

  return { active, deleted };
};

const normalizeWorldDocumentPayload = (
  projectId: string,
  docType: SyncBundle["worldDocuments"][number]["docType"],
  payload: unknown,
  updatedAt: string,
  memos: Array<{
    id: string;
    title: string;
    content: string;
    tags: string[];
    updatedAt: string;
  }>,
) => {
  switch (docType) {
    case "synopsis":
      return {
        ...normalizeSynopsisPayload(projectId, payload, logger),
        updatedAt,
      };
    case "plot":
      return {
        ...normalizePlotPayload(projectId, payload, logger),
        updatedAt,
      };
    case "drawing":
      return {
        ...normalizeDrawingPayload(projectId, payload, logger),
        updatedAt,
      };
    case "mindmap":
      return {
        ...normalizeMindmapPayload(projectId, payload, logger),
        updatedAt,
      };
    case "graph":
      return {
        ...normalizeGraphPayload(projectId, payload, logger),
        updatedAt,
      };
    case "scrap":
      return normalizeScrapPayload(
        projectId,
        payload,
        memos,
        updatedAt,
        logger,
      );
    default:
      return payload;
  }
};

export const applyReplicaWorldState = async (
  prisma: Prisma.TransactionClient,
  bundle: SyncBundle,
  deletedProjectIds: Set<string>,
): Promise<void> => {
  const activeProjects = bundle.projects.filter(
    (project) => !project.deletedAt && !deletedProjectIds.has(project.id),
  );

  for (const project of activeProjects) {
    const { active: worldDocMap, deleted: deletedDocTypes } = buildWorldDocumentMap(
      bundle.worldDocuments,
      project.id,
    );
    const memos = bundle.memos
      .filter((memo) => memo.projectId === project.id && !memo.deletedAt)
      .map((memo) => ({
        id: memo.id,
        title: memo.title,
        content: memo.content,
        tags: memo.tags,
        updatedAt: memo.updatedAt,
      }));

    for (const docType of deletedDocTypes) {
      await prisma.worldDocument.deleteMany({
        where: {
          projectId: project.id,
          docType,
        },
      });
    }

    for (const [docType, doc] of worldDocMap.entries()) {
      if (docType === "scrap") {
        continue;
      }
      const normalizedPayload = normalizeWorldDocumentPayload(
        project.id,
        docType,
        doc.payload,
        doc.updatedAt,
        memos,
      );
      await prisma.worldDocument.upsert({
        where: {
          projectId_docType: {
            projectId: project.id,
            docType,
          },
        },
        update: {
          payload: JSON.stringify(normalizedPayload),
        },
        create: {
          projectId: project.id,
          docType,
          payload: JSON.stringify(normalizedPayload),
        },
      });
    }

    const normalizedScrapPayload = normalizeScrapPayload(
      project.id,
      worldDocMap.get("scrap")?.payload,
      memos,
      project.updatedAt,
      logger,
    ) as unknown as WorldScrapMemosData;

    if (worldDocMap.has("scrap") || memos.length > 0) {
      await prisma.worldDocument.upsert({
        where: {
          projectId_docType: {
            projectId: project.id,
            docType: "scrap",
          },
        },
        update: {
          payload: JSON.stringify(normalizedScrapPayload),
        },
        create: {
          projectId: project.id,
          docType: "scrap",
          payload: JSON.stringify(normalizedScrapPayload),
        },
      });
    } else if (deletedDocTypes.has("scrap")) {
      await prisma.worldDocument.deleteMany({
        where: {
          projectId: project.id,
          docType: "scrap",
        },
      });
    }

    await prisma.scrapMemo.deleteMany({
      where: { projectId: project.id },
    });

    if (normalizedScrapPayload.memos.length > 0) {
      await prisma.scrapMemo.createMany({
        data: normalizedScrapPayload.memos.map((memo, index) => ({
          id: memo.id,
          projectId: project.id,
          title: memo.title,
          content: memo.content,
          tags: JSON.stringify(memo.tags),
          sortOrder: index,
          createdAt: new Date(memo.updatedAt),
          updatedAt: new Date(memo.updatedAt),
        })),
      });
    }

    if (deletedDocTypes.size > 0 || worldDocMap.size > 0 || memos.length > 0) {
      await prisma.project.update({
        where: { id: project.id },
        data: {
          updatedAt: new Date(),
        },
      });
    }
  }
};
