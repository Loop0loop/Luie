import { chooseLatest, toTimestamp } from "./entityMerge.js";
import type {
  SyncBundle,
  SyncChapterRecord,
  SyncTombstoneRecord,
} from "./types.js";

export const applyTombstonesToBundle = (bundle: SyncBundle): SyncBundle => {
  const latestTombstoneByEntity = new Map<string, SyncTombstoneRecord>();
  for (const tombstone of bundle.tombstones) {
    const key = `${tombstone.entityType}:${tombstone.entityId}`;
    const existing = latestTombstoneByEntity.get(key);
    if (!existing) {
      latestTombstoneByEntity.set(key, tombstone);
      continue;
    }
    const [winner] = chooseLatest(existing, tombstone);
    latestTombstoneByEntity.set(key, winner);
  }

  const deletedProjectIds = new Set<string>();
  for (const project of bundle.projects) {
    if (project.deletedAt) {
      deletedProjectIds.add(project.id);
    }
  }
  for (const tombstone of latestTombstoneByEntity.values()) {
    if (tombstone.entityType !== "project") continue;
    deletedProjectIds.add(tombstone.entityId);
    deletedProjectIds.add(tombstone.projectId);
  }

  const isProjectDeleted = (projectId: string): boolean =>
    deletedProjectIds.has(projectId);

  const applyChapterTombstone = (
    chapter: SyncChapterRecord,
  ): SyncChapterRecord => {
    const tombstone = latestTombstoneByEntity.get(`chapter:${chapter.id}`);
    if (!tombstone) return chapter;
    const deletedAt = tombstone.deletedAt;
    const updatedAt =
      toTimestamp(tombstone.updatedAt) > toTimestamp(chapter.updatedAt)
        ? tombstone.updatedAt
        : chapter.updatedAt;
    return {
      ...chapter,
      deletedAt,
      updatedAt,
    };
  };

  const filterByTombstone = <T extends { id: string }>(
    entityType: string,
    rows: T[],
  ): T[] =>
    rows.filter(
      (row) => !latestTombstoneByEntity.has(`${entityType}:${row.id}`),
    );

  return {
    ...bundle,
    projects: filterByTombstone(
      "project",
      bundle.projects.filter((project) => !isProjectDeleted(project.id)),
    ),
    chapters: bundle.chapters
      .filter((chapter) => !isProjectDeleted(chapter.projectId))
      .map(applyChapterTombstone),
    characters: filterByTombstone(
      "character",
      bundle.characters.filter(
        (character) => !isProjectDeleted(character.projectId),
      ),
    ),
    events: filterByTombstone(
      "event",
      bundle.events.filter((event) => !isProjectDeleted(event.projectId)),
    ),
    factions: filterByTombstone(
      "faction",
      bundle.factions.filter((faction) => !isProjectDeleted(faction.projectId)),
    ),
    terms: filterByTombstone(
      "term",
      bundle.terms.filter((term) => !isProjectDeleted(term.projectId)),
    ),
    worldDocuments: bundle.worldDocuments.filter(
      (doc) => !isProjectDeleted(doc.projectId),
    ),
    memos: filterByTombstone(
      "memo",
      bundle.memos.filter((memo) => !isProjectDeleted(memo.projectId)),
    ),
    snapshots: filterByTombstone(
      "snapshot",
      bundle.snapshots.filter(
        (snapshot) => !isProjectDeleted(snapshot.projectId),
      ),
    ),
    memoryCanonicalRows: (bundle.memoryCanonicalRows ?? []).filter(
      (row) => !isProjectDeleted(row.projectId),
    ),
  };
};
