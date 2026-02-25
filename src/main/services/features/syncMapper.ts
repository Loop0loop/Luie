import { randomUUID } from "node:crypto";
import type {
  SyncConflictSummary,
  SyncEntityBaseline,
} from "../../../shared/types/index.js";

export type SyncWorldDocumentType =
  | "synopsis"
  | "plot"
  | "drawing"
  | "mindmap"
  | "scrap";

type SyncEntityBase = {
  id: string;
  userId: string;
  projectId: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type SyncProjectRecord = {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type SyncChapterRecord = SyncEntityBase & {
  title: string;
  content: string;
  synopsis?: string | null;
  order: number;
  wordCount: number;
  createdAt: string;
};

export type SyncCharacterRecord = SyncEntityBase & {
  name: string;
  description?: string | null;
  firstAppearance?: string | null;
  attributes?: unknown;
  createdAt: string;
};

export type SyncTermRecord = SyncEntityBase & {
  term: string;
  definition?: string | null;
  category?: string | null;
  order: number;
  firstAppearance?: string | null;
  createdAt: string;
};

export type SyncWorldDocumentRecord = SyncEntityBase & {
  docType: SyncWorldDocumentType;
  payload: unknown;
};

export type SyncMemoRecord = SyncEntityBase & {
  title: string;
  content: string;
  tags: string[];
};

export type SyncSnapshotRecord = SyncEntityBase & {
  chapterId?: string | null;
  description?: string | null;
  createdAt: string;
  contentLength: number;
  contentPath?: string | null;
  contentInline?: string | null;
};

export type SyncTombstoneRecord = {
  id: string;
  userId: string;
  projectId: string;
  entityType: string;
  entityId: string;
  deletedAt: string;
  updatedAt: string;
};

export type SyncBundle = {
  projects: SyncProjectRecord[];
  chapters: SyncChapterRecord[];
  characters: SyncCharacterRecord[];
  terms: SyncTermRecord[];
  worldDocuments: SyncWorldDocumentRecord[];
  memos: SyncMemoRecord[];
  snapshots: SyncSnapshotRecord[];
  tombstones: SyncTombstoneRecord[];
};

type MergeSyncBundlesOptions = {
  baselinesByProjectId?: Record<string, SyncEntityBaseline>;
};

export const createEmptySyncBundle = (): SyncBundle => ({
  projects: [],
  chapters: [],
  characters: [],
  terms: [],
  worldDocuments: [],
  memos: [],
  snapshots: [],
  tombstones: [],
});

const toTimestamp = (value: string | undefined | null): number => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getEntityBaselineTimestamp = (
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

const chooseLatest = <T extends { updatedAt: string }>(left: T, right: T): [winner: T, loser: T] => {
  return toTimestamp(left.updatedAt) >= toTimestamp(right.updatedAt)
    ? [left, right]
    : [right, left];
};

const mergeEntityList = <T extends { id: string; updatedAt: string }>(local: T[], remote: T[]): T[] => {
  const merged = new Map<string, T>();
  for (const item of local) {
    merged.set(item.id, item);
  }
  for (const item of remote) {
    const existing = merged.get(item.id);
    if (!existing) {
      merged.set(item.id, item);
      continue;
    }
    const [winner] = chooseLatest(existing, item);
    merged.set(item.id, winner);
  }
  return Array.from(merged.values());
};

const mergeWorldDocs = (
  local: SyncWorldDocumentRecord[],
  remote: SyncWorldDocumentRecord[],
): SyncWorldDocumentRecord[] => {
  const merged = new Map<string, SyncWorldDocumentRecord>();
  for (const item of local) {
    merged.set(`${item.projectId}:${item.docType}`, item);
  }
  for (const item of remote) {
    const key = `${item.projectId}:${item.docType}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, item);
      continue;
    }
    const [winner] = chooseLatest(existing, item);
    merged.set(key, winner);
  }
  return Array.from(merged.values());
};

const mergeWithTextConflictCopies = <
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
  buildConflictCopy: (loser: T) => T,
  shouldCreateConflictCopy?: (localItem: T, remoteItem: T) => boolean,
): { merged: T[]; conflicts: number } => {
  const merged = new Map<string, T>();
  const remoteMap = new Map<string, T>();
  let conflicts = 0;

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
    const [winner, loser] = chooseLatest(localItem, remoteItem);
    if (localItem.content !== remoteItem.content) {
      const shouldCreate = shouldCreateConflictCopy
        ? shouldCreateConflictCopy(localItem, remoteItem)
        : true;
      if (shouldCreate) {
        conflicts += 1;
        const copy = buildConflictCopy(loser);
        merged.set(copy.id, copy);
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
  };
};

const createConflictSummary = (chapterConflicts: number, memoConflicts: number): SyncConflictSummary => ({
  chapters: chapterConflicts,
  memos: memoConflicts,
  total: chapterConflicts + memoConflicts,
});

const applyTombstonesToBundle = (bundle: SyncBundle): SyncBundle => {
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

  const applyChapterTombstone = (chapter: SyncChapterRecord): SyncChapterRecord => {
    const tombstone = latestTombstoneByEntity.get(`chapter:${chapter.id}`);
    if (!tombstone) return chapter;
    const deletedAt = tombstone.deletedAt;
    const updatedAt = toTimestamp(tombstone.updatedAt) > toTimestamp(chapter.updatedAt)
      ? tombstone.updatedAt
      : chapter.updatedAt;
    return {
      ...chapter,
      deletedAt,
      updatedAt,
    };
  };

  const filterByTombstone = <T extends { id: string }>(entityType: string, rows: T[]): T[] =>
    rows.filter((row) => !latestTombstoneByEntity.has(`${entityType}:${row.id}`));

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
      bundle.characters.filter((character) => !isProjectDeleted(character.projectId)),
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
      bundle.snapshots.filter((snapshot) => !isProjectDeleted(snapshot.projectId)),
    ),
  };
};

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
  );

  const memoMerged = mergeWithTextConflictCopies(
    local.memos,
    remote.memos,
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
  );

  const merged: SyncBundle = {
    projects: mergeEntityList(local.projects, remote.projects),
    chapters: chapterMerged.merged,
    characters: mergeEntityList(local.characters, remote.characters),
    terms: mergeEntityList(local.terms, remote.terms),
    worldDocuments: mergeWorldDocs(local.worldDocuments, remote.worldDocuments),
    memos: memoMerged.merged,
    snapshots: mergeEntityList(local.snapshots, remote.snapshots),
    tombstones: mergeEntityList(local.tombstones, remote.tombstones),
  };

  return {
    merged: applyTombstonesToBundle(merged),
    conflicts: createConflictSummary(chapterMerged.conflicts, memoMerged.conflicts),
  };
};
