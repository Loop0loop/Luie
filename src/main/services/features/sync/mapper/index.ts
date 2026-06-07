import { randomUUID } from "node:crypto";
import { mergeEntityList, mergeWorldDocs, toTimestamp } from "./entityMerge.js";
import {
  createConflictSummary,
  getEntityBaselineTimestamp,
  mergeWithTextConflictCopies,
} from "./textConflicts.js";
import { applyTombstonesToBundle } from "./tombstones.js";
import type {
  MergeSyncBundlesOptions,
  SyncBundle,
  SyncConflictSummary,
} from "./types.js";

export { createEmptySyncBundle } from "./bundle.js";
export type {
  MergeSyncBundlesOptions,
  SyncBundle,
  SyncChapterRecord,
  SyncCharacterRecord,
  SyncEventRecord,
  SyncFactionRecord,
  SyncMemoRecord,
  SyncMemoryCanonicalRecord,
  SyncProjectRecord,
  SyncSnapshotRecord,
  SyncTermRecord,
  SyncTombstoneRecord,
  SyncWorldDocumentRecord,
  SyncWorldDocumentType,
} from "./types.js";

export const mergeSyncBundles = (
  local: SyncBundle,
  remote: SyncBundle,
  options?: MergeSyncBundlesOptions,
): {
  merged: SyncBundle;
  conflicts: SyncConflictSummary;
} => {
  const tombstoneSet = new Set(
    [...local.tombstones, ...remote.tombstones].map(
      (tombstone) => `${tombstone.entityType}:${tombstone.entityId}`,
    ),
  );
  const baselinesByProjectId = options?.baselinesByProjectId;

  const chapterMerged = mergeWithTextConflictCopies(
    local.chapters,
    remote.chapters,
    "chapter",
    (loser) => ({
      ...loser,
      id: randomUUID(),
      title: `${loser.title} (Conflict Copy)`,
      order: loser.order + 10000,
      updatedAt: new Date().toISOString(),
    }),
    (localItem, remoteItem) =>
      localItem.projectId === remoteItem.projectId &&
      !localItem.deletedAt &&
      !remoteItem.deletedAt &&
      !tombstoneSet.has(`chapter:${localItem.id}`) &&
      !tombstoneSet.has(`chapter:${remoteItem.id}`) &&
      (() => {
        const baselineAt = getEntityBaselineTimestamp(
          baselinesByProjectId,
          localItem.projectId,
          "chapter",
          localItem.id,
        );
        if (baselineAt <= 0) return false;
        return (
          toTimestamp(localItem.updatedAt) > baselineAt &&
          toTimestamp(remoteItem.updatedAt) > baselineAt
        );
      })(),
    options?.conflictResolutions,
  );

  const memoMerged = mergeWithTextConflictCopies(
    local.memos,
    remote.memos,
    "memo",
    (loser) => ({
      ...loser,
      id: randomUUID(),
      title: `${loser.title} (Conflict Copy)`,
      updatedAt: new Date().toISOString(),
    }),
    (localItem, remoteItem) =>
      localItem.projectId === remoteItem.projectId &&
      !localItem.deletedAt &&
      !remoteItem.deletedAt &&
      !tombstoneSet.has(`memo:${localItem.id}`) &&
      !tombstoneSet.has(`memo:${remoteItem.id}`) &&
      (() => {
        const baselineAt = getEntityBaselineTimestamp(
          baselinesByProjectId,
          localItem.projectId,
          "memo",
          localItem.id,
        );
        if (baselineAt <= 0) return false;
        return (
          toTimestamp(localItem.updatedAt) > baselineAt &&
          toTimestamp(remoteItem.updatedAt) > baselineAt
        );
      })(),
    options?.conflictResolutions,
  );

  const conflictItems = [
    ...chapterMerged.conflictItems,
    ...memoMerged.conflictItems,
  ];

  const merged: SyncBundle = {
    projects: mergeEntityList(local.projects, remote.projects),
    chapters: chapterMerged.merged,
    characters: mergeEntityList(local.characters, remote.characters),
    events: mergeEntityList(local.events, remote.events),
    factions: mergeEntityList(local.factions, remote.factions),
    terms: mergeEntityList(local.terms, remote.terms),
    worldDocuments: mergeWorldDocs(local.worldDocuments, remote.worldDocuments),
    memos: memoMerged.merged,
    snapshots: mergeEntityList(local.snapshots, remote.snapshots),
    memoryCanonicalRows: mergeEntityList(
      local.memoryCanonicalRows ?? [],
      remote.memoryCanonicalRows ?? [],
    ),
    tombstones: mergeEntityList(local.tombstones, remote.tombstones),
  };

  return {
    merged: applyTombstonesToBundle(merged),
    conflicts: createConflictSummary(
      chapterMerged.conflicts,
      memoMerged.conflicts,
      conflictItems,
    ),
  };
};
