import { DEFAULT_PROJECT_AUTO_SAVE_INTERVAL_SECONDS } from "../../../../shared/constants/index.js";
import type { SyncBundle } from "./syncMapper.js";
import type { SyncChapterRecord } from "./syncMapper.js";
import type { db } from "../../../database/index.js";

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
  prisma: ReturnType<(typeof db)["getClient"]>,
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
  prisma: ReturnType<(typeof db)["getClient"]>,
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
  prisma: ReturnType<(typeof db)["getClient"]>,
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
  prisma: ReturnType<(typeof db)["getClient"]>,
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

export const upsertTerms = async (
  prisma: ReturnType<(typeof db)["getClient"]>,
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
  prisma: ReturnType<(typeof db)["getClient"]>,
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
