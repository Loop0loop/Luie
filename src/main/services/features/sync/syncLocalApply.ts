import { and, eq } from "drizzle-orm";
import { DEFAULT_PROJECT_AUTO_SAVE_INTERVAL_SECONDS } from "../../../../shared/constants/index.js";
import { createLogger } from "../../../../shared/logger/index.js";
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
import type { DbLike } from "../../../database/databaseTypes.js";
import {
  chapter,
  character,
  event,
  faction,
  project,
  projectSettings,
  scrapMemo,
  term,
  worldDocument,
} from "../../../database/schema.js";

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
  tx: DbLike,
  deletedProjectIds: Set<string>,
): Promise<void> => {
  for (const projectId of deletedProjectIds) {
    const existingRows = await tx.select({ id: project.id })
      .from(project)
      .where(eq(project.id, projectId))
      .limit(1);
    const existing = existingRows[0] ?? null;
    if (!existing?.id) continue;
    await tx.delete(project).where(eq(project.id, projectId));
  }
};

export const upsertProjects = async (
  tx: DbLike,
  projects: SyncBundle["projects"],
  deletedProjectIds: Set<string>,
): Promise<void> => {
  for (const proj of projects) {
    if (proj.deletedAt || deletedProjectIds.has(proj.id)) continue;
    const existingRows = await tx.select({ id: project.id })
      .from(project)
      .where(eq(project.id, proj.id))
      .limit(1);
    const existing = existingRows[0] ?? null;

    if (existing?.id) {
      await tx.update(project)
        .set({
          title: proj.title,
          description: proj.description,
          updatedAt: new Date(proj.updatedAt).toISOString(),
        })
        .where(eq(project.id, proj.id));
      continue;
    }

    await tx.insert(project).values({
      id: proj.id,
      title: proj.title,
      description: proj.description,
      createdAt: new Date(proj.createdAt).toISOString(),
      updatedAt: new Date(proj.updatedAt).toISOString(),
    });

    await tx.insert(projectSettings).values({
      id: proj.id,
      projectId: proj.id,
      autoSave: true,
      autoSaveInterval: DEFAULT_PROJECT_AUTO_SAVE_INTERVAL_SECONDS,
    });
  }
};

export const upsertChapter = async (
  tx: DbLike,
  ch: SyncChapterRecord,
): Promise<void> => {
  const existingRows = await tx.select({ id: chapter.id })
    .from(chapter)
    .where(eq(chapter.id, ch.id))
    .limit(1);
  const existing = existingRows[0] ?? null;

  const data = {
    title: ch.title,
    content: ch.content,
    synopsis: ch.synopsis,
    order: ch.order,
    wordCount: ch.wordCount,
    updatedAt: new Date(ch.updatedAt).toISOString(),
    deletedAt: ch.deletedAt ? new Date(ch.deletedAt).toISOString() : null,
    projectId: ch.projectId,
  };

  if (existing?.id) {
    await tx.update(chapter)
      .set(data)
      .where(eq(chapter.id, ch.id));
  } else {
    await tx.insert(chapter).values({
      id: ch.id,
      ...data,
      createdAt: new Date(ch.createdAt).toISOString(),
    });
  }
};

export const upsertCharacters = async (
  tx: DbLike,
  characters: SyncBundle["characters"],
  deletedProjectIds: Set<string>,
): Promise<void> => {
  for (const char of characters) {
    if (deletedProjectIds.has(char.projectId)) continue;
    const existingRows = await tx.select({ id: character.id })
      .from(character)
      .where(eq(character.id, char.id))
      .limit(1);
    const existing = existingRows[0] ?? null;

    if (char.deletedAt) {
      if (existing?.id) await tx.delete(character).where(eq(character.id, char.id));
      continue;
    }

    const data = {
      name: char.name,
      description: char.description,
      firstAppearance: char.firstAppearance,
      attributes:
        typeof char.attributes === "string"
          ? char.attributes
          : JSON.stringify(char.attributes ?? null),
      updatedAt: new Date(char.updatedAt).toISOString(),
      projectId: char.projectId,
    };

    if (existing?.id) {
      await tx.update(character).set(data).where(eq(character.id, char.id));
    } else {
      await tx.insert(character).values({
        id: char.id,
        ...data,
        createdAt: new Date(char.createdAt).toISOString(),
      });
    }
  }
};

export const upsertEvents = async (
  tx: DbLike,
  events: SyncBundle["events"],
  deletedProjectIds: Set<string>,
): Promise<void> => {
  for (const ev of events) {
    if (deletedProjectIds.has(ev.projectId)) continue;
    const existingRows = await tx.select({ id: event.id })
      .from(event)
      .where(eq(event.id, ev.id))
      .limit(1);
    const existing = existingRows[0] ?? null;

    if (ev.deletedAt) {
      if (existing?.id) await tx.delete(event).where(eq(event.id, ev.id));
      continue;
    }

    const data = {
      name: ev.name,
      description: ev.description,
      firstAppearance: ev.firstAppearance,
      attributes:
        typeof ev.attributes === "string"
          ? ev.attributes
          : JSON.stringify(ev.attributes ?? null),
      updatedAt: new Date(ev.updatedAt).toISOString(),
      projectId: ev.projectId,
    };

    if (existing?.id) {
      await tx.update(event).set(data).where(eq(event.id, ev.id));
    } else {
      await tx.insert(event).values({
        id: ev.id,
        ...data,
        createdAt: new Date(ev.createdAt).toISOString(),
      });
    }
  }
};

export const upsertFactions = async (
  tx: DbLike,
  factions: SyncBundle["factions"],
  deletedProjectIds: Set<string>,
): Promise<void> => {
  for (const fac of factions) {
    if (deletedProjectIds.has(fac.projectId)) continue;
    const existingRows = await tx.select({ id: faction.id })
      .from(faction)
      .where(eq(faction.id, fac.id))
      .limit(1);
    const existing = existingRows[0] ?? null;

    if (fac.deletedAt) {
      if (existing?.id) await tx.delete(faction).where(eq(faction.id, fac.id));
      continue;
    }

    const data = {
      name: fac.name,
      description: fac.description,
      firstAppearance: fac.firstAppearance,
      attributes:
        typeof fac.attributes === "string"
          ? fac.attributes
          : JSON.stringify(fac.attributes ?? null),
      updatedAt: new Date(fac.updatedAt).toISOString(),
      projectId: fac.projectId,
    };

    if (existing?.id) {
      await tx.update(faction).set(data).where(eq(faction.id, fac.id));
    } else {
      await tx.insert(faction).values({
        id: fac.id,
        ...data,
        createdAt: new Date(fac.createdAt).toISOString(),
      });
    }
  }
};

export const upsertTerms = async (
  tx: DbLike,
  terms: SyncBundle["terms"],
  deletedProjectIds: Set<string>,
): Promise<void> => {
  for (const t of terms) {
    if (deletedProjectIds.has(t.projectId)) continue;
    const existingRows = await tx.select({ id: term.id })
      .from(term)
      .where(eq(term.id, t.id))
      .limit(1);
    const existing = existingRows[0] ?? null;

    if (t.deletedAt) {
      if (existing?.id) await tx.delete(term).where(eq(term.id, t.id));
      continue;
    }

    const data = {
      term: t.term,
      definition: t.definition,
      category: t.category,
      order: t.order,
      firstAppearance: t.firstAppearance,
      updatedAt: new Date(t.updatedAt).toISOString(),
      projectId: t.projectId,
    };

    if (existing?.id) {
      await tx.update(term).set(data).where(eq(term.id, t.id));
    } else {
      await tx.insert(term).values({
        id: t.id,
        ...data,
        createdAt: new Date(t.createdAt).toISOString(),
      });
    }
  }
};

export const applyChapterTombstones = async (
  tx: DbLike,
  tombstones: SyncBundle["tombstones"],
  deletedProjectIds: Set<string>,
): Promise<void> => {
  for (const tombstone of tombstones) {
    if (tombstone.entityType !== "chapter") continue;
    if (deletedProjectIds.has(tombstone.projectId)) continue;
    const existingRows = await tx.select({ id: chapter.id, projectId: chapter.projectId })
      .from(chapter)
      .where(eq(chapter.id, tombstone.entityId))
      .limit(1);
    const existing = existingRows[0] ?? null;
    if (!existing?.id || existing.projectId !== tombstone.projectId) continue;
    await tx.update(chapter)
      .set({
        deletedAt: new Date(tombstone.deletedAt).toISOString(),
        updatedAt: new Date(tombstone.updatedAt).toISOString(),
      })
      .where(eq(chapter.id, tombstone.entityId));
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
  tx: DbLike,
  bundle: SyncBundle,
  deletedProjectIds: Set<string>,
): Promise<void> => {
  const activeProjects = bundle.projects.filter(
    (proj) => !proj.deletedAt && !deletedProjectIds.has(proj.id),
  );

  for (const proj of activeProjects) {
    const { active: worldDocMap, deleted: deletedDocTypes } = buildWorldDocumentMap(
      bundle.worldDocuments,
      proj.id,
    );
    const memos = bundle.memos
      .filter((memo) => memo.projectId === proj.id && !memo.deletedAt)
      .map((memo) => ({
        id: memo.id,
        title: memo.title,
        content: memo.content,
        tags: memo.tags,
        updatedAt: memo.updatedAt,
      }));

    for (const docType of deletedDocTypes) {
      await tx.delete(worldDocument)
        .where(and(eq(worldDocument.projectId, proj.id), eq(worldDocument.docType, docType)));
    }

    for (const [docType, doc] of worldDocMap.entries()) {
      if (docType === "scrap") {
        continue;
      }
      const normalizedPayload = normalizeWorldDocumentPayload(
        proj.id,
        docType,
        doc.payload,
        doc.updatedAt,
        memos,
      );
      await tx.insert(worldDocument)
        .values({
          id: `${proj.id}:${docType}`,
          projectId: proj.id,
          docType,
          payload: JSON.stringify(normalizedPayload),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .onConflictDoUpdate({
          target: [worldDocument.projectId, worldDocument.docType],
          set: {
            payload: JSON.stringify(normalizedPayload),
            updatedAt: new Date().toISOString(),
          },
        });
    }

    const normalizedScrapPayload = normalizeScrapPayload(
      proj.id,
      worldDocMap.get("scrap")?.payload,
      memos,
      proj.updatedAt,
      logger,
    );

    if (worldDocMap.has("scrap") || memos.length > 0) {
      await tx.insert(worldDocument)
        .values({
          id: `${proj.id}:scrap`,
          projectId: proj.id,
          docType: "scrap",
          payload: JSON.stringify(normalizedScrapPayload),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .onConflictDoUpdate({
          target: [worldDocument.projectId, worldDocument.docType],
          set: {
            payload: JSON.stringify(normalizedScrapPayload),
            updatedAt: new Date().toISOString(),
          },
        });
    } else if (deletedDocTypes.has("scrap")) {
      await tx.delete(worldDocument)
        .where(and(eq(worldDocument.projectId, proj.id), eq(worldDocument.docType, "scrap")));
    }

    await tx.delete(scrapMemo).where(eq(scrapMemo.projectId, proj.id));

    const scrapMemoRows = normalizedScrapPayload.memos.map((memo, index) => ({
      id: memo.id,
      projectId: proj.id,
      title: memo.title,
      content: memo.content,
      tags: JSON.stringify(memo.tags),
      sortOrder: index,
      createdAt: new Date(memo.updatedAt).toISOString(),
      updatedAt: new Date(memo.updatedAt).toISOString(),
    }));
    if (scrapMemoRows.length > 0) {
      await tx.insert(scrapMemo).values(scrapMemoRows);
    }

    if (deletedDocTypes.size > 0 || worldDocMap.size > 0 || memos.length > 0) {
      await tx.update(project)
        .set({ updatedAt: new Date().toISOString() })
        .where(eq(project.id, proj.id));
    }
  }
};
