import { toTimestamp } from "./entityMerge.js";
import type {
  MergeTextConflictResult,
  SyncConflictItem,
  SyncConflictSummary,
  SyncEntityBaseline,
} from "./types.js";
import { chooseLatest } from "./entityMerge.js";

export const getEntityBaselineTimestamp = (
  baselinesByProjectId: Record<string, SyncEntityBaseline> | undefined,
  projectId: string,
  entityType: "chapter" | "memo",
  entityId: string,
): number => {
  const projectBaseline = baselinesByProjectId?.[projectId];
  if (!projectBaseline) return 0;
  const entityMap =
    entityType === "chapter" ? projectBaseline.chapter : projectBaseline.memo;
  return toTimestamp(entityMap[entityId]);
};

export const mergeWithTextConflictCopies = <
  T extends {
    id: string;
    projectId: string;
    userId: string;
    updatedAt: string;
    content: string;
    title: string;
    deletedAt?: string | null;
  },
>(
  local: T[],
  remote: T[],
  entityType: "chapter" | "memo",
  buildConflictCopy: (loser: T) => T,
  shouldCreateConflictCopy?: (localItem: T, remoteItem: T) => boolean,
  conflictResolutions?: Record<string, "local" | "remote">,
): MergeTextConflictResult<T> => {
  const merged = new Map<string, T>();
  const remoteMap = new Map<string, T>();
  let conflicts = 0;
  const conflictItems: SyncConflictItem[] = [];

  for (const item of remote) {
    remoteMap.set(item.id, item);
  }

  for (const item of local) {
    merged.set(item.id, item);
  }

  for (const remoteItem of remote) {
    const localItem = merged.get(remoteItem.id);
    if (!localItem) {
      merged.set(remoteItem.id, remoteItem);
      continue;
    }
    const [initialWinner, conflictCopySource] = chooseLatest(
      localItem,
      remoteItem,
    );
    let winner = initialWinner;
    if (localItem.content !== remoteItem.content) {
      const shouldCreate = shouldCreateConflictCopy
        ? shouldCreateConflictCopy(localItem, remoteItem)
        : true;
      if (shouldCreate) {
        const resolutionKey = `${entityType}:${localItem.id}`;
        const forcedResolution = conflictResolutions?.[resolutionKey];
        if (forcedResolution === "local") {
          winner = localItem;
        } else if (forcedResolution === "remote") {
          winner = remoteItem;
        } else {
          conflicts += 1;
          conflictItems.push({
            type: entityType,
            id: localItem.id,
            projectId: localItem.projectId,
            title: localItem.title,
            localUpdatedAt: localItem.updatedAt,
            remoteUpdatedAt: remoteItem.updatedAt,
            localPreview: localItem.content.slice(0, 400),
            remotePreview: remoteItem.content.slice(0, 400),
          });
          const copy = buildConflictCopy(conflictCopySource);
          merged.set(copy.id, copy);
        }
      }
    }
    merged.set(remoteItem.id, winner);
  }

  for (const [id, item] of remoteMap.entries()) {
    if (!merged.has(id)) {
      merged.set(id, item);
    }
  }

  return {
    merged: Array.from(merged.values()),
    conflicts,
    conflictItems,
  };
};

export const createConflictSummary = (
  chapterConflicts: number,
  memoConflicts: number,
  memoryCanonicalConflicts: number,
  items: SyncConflictItem[],
): SyncConflictSummary => {
  const total = chapterConflicts + memoConflicts + memoryCanonicalConflicts;
  return {
    chapters: chapterConflicts,
    memos: memoConflicts,
    memoryCanonical: memoryCanonicalConflicts,
    total,
    items: items.length > 0 ? items : undefined,
  };
};
