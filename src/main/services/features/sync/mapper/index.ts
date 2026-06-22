import { randomUUID } from "node:crypto";
import {
  chooseLatest,
  mergeEntityList,
  mergeWorldDocs,
  toTimestamp,
} from "./entityMerge.js";
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
  SyncMemoryCanonicalRecord,
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
  const memoryCanonicalMerged = mergeMemoryCanonicalRowsWithConflicts(
    local.memoryCanonicalRows ?? [],
    remote.memoryCanonicalRows ?? [],
    options?.conflictResolutions,
  );
  conflictItems.push(...(memoryCanonicalMerged.conflictItems ?? []));

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
    memoryCanonicalRows: memoryCanonicalMerged.merged,
    tombstones: mergeEntityList(local.tombstones, remote.tombstones),
  };

  return {
    merged: applyTombstonesToBundle(merged),
    conflicts: createConflictSummary(
      chapterMerged.conflicts,
      memoMerged.conflicts,
      memoryCanonicalMerged.conflicts,
      conflictItems,
    ),
  };
};

const stringifyMemoryRow = (row: Record<string, unknown>): string =>
  JSON.stringify(row, Object.keys(row).sort());

const buildMemoryConflictTitle = (row: SyncMemoryCanonicalRecord): string => {
  const canonicalId =
    typeof row.row.id === "string" && row.row.id.trim() ? row.row.id : row.id;
  return `${row.tableName}:${canonicalId}`;
};

const mergeMemoryCanonicalRowsWithConflicts = (
  local: SyncMemoryCanonicalRecord[],
  remote: SyncMemoryCanonicalRecord[],
  conflictResolutions?: Record<string, "local" | "remote">,
): {
  merged: SyncMemoryCanonicalRecord[];
  conflicts: number;
  conflictItems: SyncConflictSummary["items"];
} => {
  const merged = new Map<string, SyncMemoryCanonicalRecord>();
  const conflictItems: NonNullable<SyncConflictSummary["items"]> = [];
  let conflicts = 0;

  for (const item of local) {
    merged.set(item.id, item);
  }

  for (const remoteItem of remote) {
    const localItem = merged.get(remoteItem.id);
    if (!localItem) {
      merged.set(remoteItem.id, remoteItem);
      continue;
    }

    const localRow = stringifyMemoryRow(localItem.row);
    const remoteRow = stringifyMemoryRow(remoteItem.row);
    const resolutionKey = `memoryCanonical:${localItem.id}`;
    const forcedResolution = conflictResolutions?.[resolutionKey];
    if (forcedResolution === "local") {
      merged.set(remoteItem.id, localItem);
      continue;
    }
    if (forcedResolution === "remote") {
      merged.set(remoteItem.id, remoteItem);
      continue;
    }

    const [winner] = chooseLatest(localItem, remoteItem);
    if (localRow !== remoteRow) {
      conflicts += 1;
      conflictItems.push({
        type: "memoryCanonical",
        id: localItem.id,
        projectId: localItem.projectId,
        title: buildMemoryConflictTitle(localItem),
        localUpdatedAt: localItem.updatedAt,
        remoteUpdatedAt: remoteItem.updatedAt,
        localPreview: localRow.slice(0, 400),
        remotePreview: remoteRow.slice(0, 400),
      });
    }
    merged.set(remoteItem.id, winner);
  }

  return {
    merged: Array.from(merged.values()),
    conflicts,
    conflictItems,
  };
};
