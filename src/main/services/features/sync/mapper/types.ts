import type {
  SyncConflictItem,
  SyncConflictSummary,
  SyncEntityBaseline,
} from "../../../../../shared/types/index.js";

export type SyncWorldDocumentType =
  | "synopsis"
  | "plot"
  | "drawing"
  | "mindmap"
  | "scrap"
  | "graph";

export type SyncEntityBase = {
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

export type SyncEventRecord = SyncEntityBase & {
  name: string;
  description?: string | null;
  firstAppearance?: string | null;
  attributes?: unknown;
  createdAt: string;
};

export type SyncFactionRecord = SyncEntityBase & {
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
  events: SyncEventRecord[];
  factions: SyncFactionRecord[];
  terms: SyncTermRecord[];
  worldDocuments: SyncWorldDocumentRecord[];
  memos: SyncMemoRecord[];
  snapshots: SyncSnapshotRecord[];
  tombstones: SyncTombstoneRecord[];
};

export type MergeSyncBundlesOptions = {
  baselinesByProjectId?: Record<string, SyncEntityBaseline>;
  conflictResolutions?: Record<string, "local" | "remote">;
};

export type MergeTextConflictResult<T> = {
  merged: T[];
  conflicts: number;
  conflictItems: SyncConflictItem[];
};

export type { SyncConflictItem, SyncConflictSummary, SyncEntityBaseline };
