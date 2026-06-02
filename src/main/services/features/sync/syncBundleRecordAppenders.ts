import type { SyncPendingProjectDelete } from "../../../../shared/types/index.js";
import type { SyncBundle } from "./syncMapper.js";
import {
  toIsoString,
  toNullableString,
  toNumber,
} from "./syncBundleCollectorTypes.js";

export const appendProjectRecord = (
  bundle: SyncBundle,
  userId: string,
  projectRow: Record<string, unknown>,
): {
  projectId: string;
  projectPath: string | null;
  projectUpdatedAt: string;
} | null => {
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

export const appendChapterRecords = (
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

export const appendCharacterRecords = (
  bundle: SyncBundle,
  userId: string,
  projectId: string,
  characters: Array<Record<string, unknown>>,
): void => {
  for (const row of characters) {
    const characterId = toNullableString(row.id);
    if (!characterId) continue;
    const characterDeletedAt = toNullableString(row.deletedAt);
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
      deletedAt: characterDeletedAt,
    });
  }
};

export const appendEventRecords = (
  bundle: SyncBundle,
  userId: string,
  projectId: string,
  events: Array<Record<string, unknown>>,
): void => {
  for (const row of events) {
    const eventId = toNullableString(row.id);
    if (!eventId) continue;
    const eventDeletedAt = toNullableString(row.deletedAt);
    bundle.events.push({
      id: eventId,
      userId,
      projectId,
      name: toNullableString(row.name) ?? "Event",
      description: toNullableString(row.description),
      firstAppearance: toNullableString(row.firstAppearance),
      attributes: toNullableString(row.attributes),
      createdAt: toIsoString(row.createdAt),
      updatedAt: toIsoString(row.updatedAt),
      deletedAt: eventDeletedAt,
    });
  }
};

export const appendFactionRecords = (
  bundle: SyncBundle,
  userId: string,
  projectId: string,
  factions: Array<Record<string, unknown>>,
): void => {
  for (const row of factions) {
    const factionId = toNullableString(row.id);
    if (!factionId) continue;
    const factionDeletedAt = toNullableString(row.deletedAt);
    bundle.factions.push({
      id: factionId,
      userId,
      projectId,
      name: toNullableString(row.name) ?? "Faction",
      description: toNullableString(row.description),
      firstAppearance: toNullableString(row.firstAppearance),
      attributes: toNullableString(row.attributes),
      createdAt: toIsoString(row.createdAt),
      updatedAt: toIsoString(row.updatedAt),
      deletedAt: factionDeletedAt,
    });
  }
};

export const appendTermRecords = (
  bundle: SyncBundle,
  userId: string,
  projectId: string,
  terms: Array<Record<string, unknown>>,
): void => {
  for (const row of terms) {
    const termId = toNullableString(row.id);
    if (!termId) continue;
    const termDeletedAt = toNullableString(row.deletedAt);
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
      deletedAt: termDeletedAt,
    });
  }
};

export const appendPendingProjectDeleteTombstones = (
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
