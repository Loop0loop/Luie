import { eq } from "drizzle-orm";
import { DEFAULT_PROJECT_AUTO_SAVE_INTERVAL_SECONDS } from "../../../../shared/constants/index.js";
import type { SyncBundle } from "./syncMapper.js";
import type { SyncChapterRecord } from "./syncMapper.js";
import type { DbLike } from "../../../database/databaseTypes.js";
import {
  chapter,
  character,
  event,
  faction,
  project,
  projectSettings,
  term,
} from "../../../database/schema.js";
export { applyReplicaWorldState } from "./localApply/index.js";

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

export const applyProjectDeletes = (
  tx: DbLike,
  deletedProjectIds: Set<string>,
): void => {
  for (const projectId of deletedProjectIds) {
    const existing = tx.select({ id: project.id })
      .from(project)
      .where(eq(project.id, projectId))
      .limit(1)
      .get();
    if (!existing?.id) continue;
    tx.delete(project).where(eq(project.id, projectId)).run();
  }
};

export const upsertProjects = (
  tx: DbLike,
  projects: SyncBundle["projects"],
  deletedProjectIds: Set<string>,
): void => {
  for (const proj of projects) {
    if (proj.deletedAt || deletedProjectIds.has(proj.id)) continue;
    const existing = tx.select({ id: project.id })
      .from(project)
      .where(eq(project.id, proj.id))
      .limit(1)
      .get();

    if (existing?.id) {
      tx.update(project)
        .set({
          title: proj.title,
          description: proj.description,
          updatedAt: new Date(proj.updatedAt).toISOString(),
        })
        .where(eq(project.id, proj.id))
        .run();
      continue;
    }

    tx.insert(project).values({
      id: proj.id,
      title: proj.title,
      description: proj.description,
      createdAt: new Date(proj.createdAt).toISOString(),
      updatedAt: new Date(proj.updatedAt).toISOString(),
    }).run();

    tx.insert(projectSettings).values({
      id: proj.id,
      projectId: proj.id,
      autoSave: true,
      autoSaveInterval: DEFAULT_PROJECT_AUTO_SAVE_INTERVAL_SECONDS,
    }).run();
  }
};

export const upsertChapter = (
  tx: DbLike,
  ch: SyncChapterRecord,
): void => {
  const existing = tx.select({ id: chapter.id })
    .from(chapter)
    .where(eq(chapter.id, ch.id))
    .limit(1)
    .get();

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
    tx.update(chapter)
      .set(data)
      .where(eq(chapter.id, ch.id))
      .run();
  } else {
    tx.insert(chapter).values({
      id: ch.id,
      ...data,
      createdAt: new Date(ch.createdAt).toISOString(),
    }).run();
  }
};

export const upsertCharacters = (
  tx: DbLike,
  characters: SyncBundle["characters"],
  deletedProjectIds: Set<string>,
): void => {
  for (const char of characters) {
    if (deletedProjectIds.has(char.projectId)) continue;
    const existing = tx.select({ id: character.id })
      .from(character)
      .where(eq(character.id, char.id))
      .limit(1)
      .get();

    if (char.deletedAt) {
      if (existing?.id) tx.delete(character).where(eq(character.id, char.id)).run();
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
      tx.update(character).set(data).where(eq(character.id, char.id)).run();
    } else {
      tx.insert(character).values({
        id: char.id,
        ...data,
        createdAt: new Date(char.createdAt).toISOString(),
      }).run();
    }
  }
};

export const upsertEvents = (
  tx: DbLike,
  events: SyncBundle["events"],
  deletedProjectIds: Set<string>,
): void => {
  for (const ev of events) {
    if (deletedProjectIds.has(ev.projectId)) continue;
    const existing = tx.select({ id: event.id })
      .from(event)
      .where(eq(event.id, ev.id))
      .limit(1)
      .get();

    if (ev.deletedAt) {
      if (existing?.id) tx.delete(event).where(eq(event.id, ev.id)).run();
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
      tx.update(event).set(data).where(eq(event.id, ev.id)).run();
    } else {
      tx.insert(event).values({
        id: ev.id,
        ...data,
        createdAt: new Date(ev.createdAt).toISOString(),
      }).run();
    }
  }
};

export const upsertFactions = (
  tx: DbLike,
  factions: SyncBundle["factions"],
  deletedProjectIds: Set<string>,
): void => {
  for (const fac of factions) {
    if (deletedProjectIds.has(fac.projectId)) continue;
    const existing = tx.select({ id: faction.id })
      .from(faction)
      .where(eq(faction.id, fac.id))
      .limit(1)
      .get();

    if (fac.deletedAt) {
      if (existing?.id) tx.delete(faction).where(eq(faction.id, fac.id)).run();
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
      tx.update(faction).set(data).where(eq(faction.id, fac.id)).run();
    } else {
      tx.insert(faction).values({
        id: fac.id,
        ...data,
        createdAt: new Date(fac.createdAt).toISOString(),
      }).run();
    }
  }
};

export const upsertTerms = (
  tx: DbLike,
  terms: SyncBundle["terms"],
  deletedProjectIds: Set<string>,
): void => {
  for (const t of terms) {
    if (deletedProjectIds.has(t.projectId)) continue;
    const existing = tx.select({ id: term.id })
      .from(term)
      .where(eq(term.id, t.id))
      .limit(1)
      .get();

    if (t.deletedAt) {
      if (existing?.id) tx.delete(term).where(eq(term.id, t.id)).run();
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
      tx.update(term).set(data).where(eq(term.id, t.id)).run();
    } else {
      tx.insert(term).values({
        id: t.id,
        ...data,
        createdAt: new Date(t.createdAt).toISOString(),
      }).run();
    }
  }
};

export const applyChapterTombstones = (
  tx: DbLike,
  tombstones: SyncBundle["tombstones"],
  deletedProjectIds: Set<string>,
): void => {
  for (const tombstone of tombstones) {
    if (tombstone.entityType !== "chapter") continue;
    if (deletedProjectIds.has(tombstone.projectId)) continue;
    const existing = tx.select({ id: chapter.id, projectId: chapter.projectId })
      .from(chapter)
      .where(eq(chapter.id, tombstone.entityId))
      .limit(1)
      .get();
    if (!existing?.id || existing.projectId !== tombstone.projectId) continue;
    tx.update(chapter)
      .set({
        deletedAt: new Date(tombstone.deletedAt).toISOString(),
        updatedAt: new Date(tombstone.updatedAt).toISOString(),
      })
      .where(eq(chapter.id, tombstone.entityId))
      .run();
  }
};
