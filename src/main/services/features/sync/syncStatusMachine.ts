import type {
  SyncEntityBaseline,
  SyncSettings,
  SyncStatus,
} from "../../../../shared/types/index.js";
import type { SyncBundle } from "./syncMapper.js";

export const toSyncedProjectStates = (
  syncMap: Record<string, string> | undefined,
): SyncStatus["projectStateById"] => {
  if (!syncMap) return undefined;
  const entries = Object.entries(syncMap);
  if (entries.length === 0) return undefined;
  return Object.fromEntries(
    entries.map(([projectId, lastSyncedAt]) => [
      projectId,
      {
        state: "synced" as const,
        lastSyncedAt,
      },
    ]),
  );
};

export const withConflictProjectStates = (
  base: SyncStatus["projectStateById"],
  conflicts: SyncStatus["conflicts"],
): SyncStatus["projectStateById"] => {
  const next = { ...(base ?? {}) };
  for (const item of conflicts.items ?? []) {
    next[item.projectId] = {
      state: "pending",
      lastSyncedAt: next[item.projectId]?.lastSyncedAt,
      reason: "SYNC_CONFLICT_DETECTED",
    };
  }
  return Object.keys(next).length > 0 ? next : undefined;
};

export const withErrorProjectStates = (
  base: SyncStatus["projectStateById"],
  reason: string,
): SyncStatus["projectStateById"] => {
  if (!base) return base;
  const next = Object.fromEntries(
    Object.entries(base).map(([projectId, state]) => [
      projectId,
      {
        state: "error" as const,
        lastSyncedAt: state.lastSyncedAt,
        reason,
      },
    ]),
  );
  return Object.keys(next).length > 0 ? next : undefined;
};

export const buildProjectSyncMapForSuccess = (
  syncSettings: SyncSettings,
  merged: SyncBundle,
  syncedAt: string,
  pendingProjectDeleteIds: string[],
): Record<string, string> | undefined => {
  const next = {
    ...(syncSettings.projectLastSyncedAtByProjectId ?? {}),
  };

  for (const projectId of pendingProjectDeleteIds) {
    delete next[projectId];
  }

  for (const project of merged.projects) {
    if (project.deletedAt) {
      delete next[project.id];
      continue;
    }
    next[project.id] = syncedAt;
  }

  for (const tombstone of merged.tombstones) {
    if (tombstone.entityType !== "project") continue;
    delete next[tombstone.entityId];
    delete next[tombstone.projectId];
  }

  return Object.keys(next).length > 0 ? next : undefined;
};

const collectDeletedProjectIdsForBaselines = (merged: SyncBundle): Set<string> => {
  const deletedProjectIds = new Set<string>();
  for (const project of merged.projects) {
    if (project.deletedAt) deletedProjectIds.add(project.id);
  }
  for (const tombstone of merged.tombstones) {
    if (tombstone.entityType !== "project") continue;
    deletedProjectIds.add(tombstone.entityId);
    deletedProjectIds.add(tombstone.projectId);
  }
  return deletedProjectIds;
};

const dropEntityBaselines = (
  baselines: Record<string, SyncEntityBaseline>,
  projectIds: string[],
): void => {
  for (const projectId of projectIds) {
    delete baselines[projectId];
  }
};

const seedActiveProjectBaselines = (
  baselines: Record<string, SyncEntityBaseline>,
  merged: SyncBundle,
  deletedProjectIds: Set<string>,
  syncedAt: string,
): Set<string> => {
  const activeProjectIds = new Set<string>();
  for (const project of merged.projects) {
    if (project.deletedAt || deletedProjectIds.has(project.id)) continue;
    activeProjectIds.add(project.id);
    baselines[project.id] = {
      chapter: {},
      memo: {},
      capturedAt: syncedAt,
    };
  }
  return activeProjectIds;
};

const applyChapterBaselines = (
  baselines: Record<string, SyncEntityBaseline>,
  merged: SyncBundle,
  deletedProjectIds: Set<string>,
  activeProjectIds: Set<string>,
  syncedAt: string,
): void => {
  for (const chapter of merged.chapters) {
    if (chapter.deletedAt || deletedProjectIds.has(chapter.projectId)) continue;
    if (!activeProjectIds.has(chapter.projectId)) continue;
    const baseline = baselines[chapter.projectId];
    if (!baseline) continue;
    baseline.chapter[chapter.id] = chapter.updatedAt;
    baseline.capturedAt = syncedAt;
  }
};

const applyMemoBaselines = (
  baselines: Record<string, SyncEntityBaseline>,
  merged: SyncBundle,
  deletedProjectIds: Set<string>,
  activeProjectIds: Set<string>,
  syncedAt: string,
): void => {
  for (const memo of merged.memos) {
    if (memo.deletedAt || deletedProjectIds.has(memo.projectId)) continue;
    if (!activeProjectIds.has(memo.projectId)) continue;
    const baseline = baselines[memo.projectId];
    if (!baseline) continue;
    baseline.memo[memo.id] = memo.updatedAt;
    baseline.capturedAt = syncedAt;
  }
};

export const buildEntityBaselineMapForSuccess = (
  syncSettings: SyncSettings,
  merged: SyncBundle,
  syncedAt: string,
  pendingProjectDeleteIds: string[],
): Record<string, SyncEntityBaseline> | undefined => {
  const next: Record<string, SyncEntityBaseline> = {
    ...(syncSettings.entityBaselinesByProjectId ?? {}),
  };
  dropEntityBaselines(next, pendingProjectDeleteIds);

  const deletedProjectIds = collectDeletedProjectIdsForBaselines(merged);
  dropEntityBaselines(next, Array.from(deletedProjectIds));

  const activeProjectIds = seedActiveProjectBaselines(
    next,
    merged,
    deletedProjectIds,
    syncedAt,
  );
  applyChapterBaselines(next, merged, deletedProjectIds, activeProjectIds, syncedAt);
  applyMemoBaselines(next, merged, deletedProjectIds, activeProjectIds, syncedAt);

  return Object.keys(next).length > 0 ? next : undefined;
};
