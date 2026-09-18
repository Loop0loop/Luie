import { createHash } from "node:crypto";
import { createEmptySyncBundle, type SyncBundle } from "./syncMapper.js";

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, current]) => current !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, current]) => [key, canonicalize(current)]),
  );
};

const recordHash = (value: unknown): string =>
  createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");

const changedRecords = <T extends { id: string; updatedAt: string }>(
  baseline: T[],
  target: T[],
  getKey: (row: T) => string = (row) => row.id,
  getComparable: (row: T) => unknown = (row) => row,
): T[] => {
  const baselineById = new Map(
    baseline.map((row) => [getKey(row), row] as const),
  );
  return target.filter((row) => {
    const previous = baselineById.get(getKey(row));
    if (!previous || previous.updatedAt !== row.updatedAt) return true;
    return (
      recordHash(getComparable(previous)) !== recordHash(getComparable(row))
    );
  });
};

export const buildSyncDeltaBundle = (
  baseline: SyncBundle,
  target: SyncBundle,
): SyncBundle => ({
  projects: changedRecords(
    baseline.projects,
    target.projects,
    (row) => row.id,
    (row) => ({ ...row, localRevision: undefined }),
  ),
  chapters: changedRecords(baseline.chapters, target.chapters),
  characters: changedRecords(baseline.characters, target.characters),
  events: changedRecords(baseline.events, target.events),
  factions: changedRecords(baseline.factions, target.factions),
  terms: changedRecords(baseline.terms, target.terms),
  worldDocuments: changedRecords(
    baseline.worldDocuments,
    target.worldDocuments,
    (row) => `${row.projectId}:${row.docType}`,
    (row) => ({ ...row, id: undefined }),
  ),
  memos: changedRecords(baseline.memos, target.memos),
  snapshots: [],
  memoryCanonicalRows: changedRecords(
    baseline.memoryCanonicalRows ?? [],
    target.memoryCanonicalRows ?? [],
  ),
  tombstones: changedRecords(baseline.tombstones, target.tombstones),
});

export const collectSyncBundleProjectIds = (
  bundle: SyncBundle,
): Set<string> => {
  const projectIds = new Set(bundle.projects.map((row) => row.id));
  for (const rows of [
    bundle.chapters,
    bundle.characters,
    bundle.events,
    bundle.factions,
    bundle.terms,
    bundle.worldDocuments,
    bundle.memos,
    bundle.snapshots,
    bundle.memoryCanonicalRows ?? [],
    bundle.tombstones,
  ]) {
    for (const row of rows) projectIds.add(row.projectId);
  }
  for (const tombstone of bundle.tombstones) {
    if (tombstone.entityType === "project") {
      projectIds.add(tombstone.entityId);
    }
  }
  return projectIds;
};

export const filterSyncBundleByProjectIds = (
  bundle: SyncBundle,
  projectIds: Set<string>,
): SyncBundle => {
  const filtered = createEmptySyncBundle();
  filtered.projects = bundle.projects.filter((row) => projectIds.has(row.id));
  filtered.chapters = bundle.chapters.filter((row) =>
    projectIds.has(row.projectId),
  );
  filtered.characters = bundle.characters.filter((row) =>
    projectIds.has(row.projectId),
  );
  filtered.events = bundle.events.filter((row) =>
    projectIds.has(row.projectId),
  );
  filtered.factions = bundle.factions.filter((row) =>
    projectIds.has(row.projectId),
  );
  filtered.terms = bundle.terms.filter((row) => projectIds.has(row.projectId));
  filtered.worldDocuments = bundle.worldDocuments.filter((row) =>
    projectIds.has(row.projectId),
  );
  filtered.memos = bundle.memos.filter((row) => projectIds.has(row.projectId));
  filtered.snapshots = bundle.snapshots.filter((row) =>
    projectIds.has(row.projectId),
  );
  filtered.memoryCanonicalRows = (bundle.memoryCanonicalRows ?? []).filter(
    (row) => projectIds.has(row.projectId),
  );
  filtered.tombstones = bundle.tombstones.filter((row) =>
    projectIds.has(row.projectId),
  );
  return filtered;
};
