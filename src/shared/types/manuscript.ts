export interface Chapter {
  id: string;
  projectId: string;
  title: string;
  content: string;
  synopsis?: string | null;
  order: number;
  wordCount?: number | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  deletedAt?: string | Date | null;
}

export interface Scene {
  id: string;
  projectId: string;
  chapterId: string;
  title: string;
  body: string;
  startOffset?: number | null;
  endOffset?: number | null;
  order: number;
  createdAt: string | Date;
  updatedAt: string | Date;
  deletedAt?: string | Date | null;
}

export type ChapterSaveStateType =
  | "idle"
  | "dirty"
  | "saving"
  | "saved"
  | "failed";

export interface DerivedSyncState {
  search: "queued" | "synced" | "failed";
  memory: "queued" | "synced" | "failed";
}

export interface ChapterSaveResult extends Chapter {
  saveState: {
    type: ChapterSaveStateType;
    at: number;
    error?: string;
  };
  derivedSyncState: DerivedSyncState;
}

export interface Note {
  id: string;
  projectId: string;
  chapterId?: string | null;
  title: string;
  body: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  deletedAt?: string | Date | null;
}

export interface Synopsis {
  id: string;
  projectId: string;
  chapterId?: string | null;
  title: string;
  body: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  deletedAt?: string | Date | null;
}

export interface Plot {
  id: string;
  projectId: string;
  title: string;
  body: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  deletedAt?: string | Date | null;
}

export interface ChapterCreateInput {
  projectId: string;
  title: string;
  synopsis?: string;
  order?: number;
  clientMutationId?: string;
}

export interface ChapterUpdateInput {
  id: string;
  title?: string;
  content?: string;
  synopsis?: string;
}

export interface SceneCreateInput {
  projectId: string;
  chapterId: string;
  title: string;
  body?: string;
  startOffset?: number;
  endOffset?: number;
  order?: number;
}

export interface SceneUpdateInput {
  id: string;
  chapterId?: string;
  title?: string;
  body?: string;
  startOffset?: number | null;
  endOffset?: number | null;
  order?: number;
}

export interface NoteCreateInput {
  projectId: string;
  chapterId?: string;
  title: string;
  body?: string;
}

export interface NoteUpdateInput {
  id: string;
  chapterId?: string | null;
  title?: string;
  body?: string;
}

export interface SynopsisCreateInput {
  projectId: string;
  chapterId?: string;
  title: string;
  body?: string;
}

export interface SynopsisUpdateInput {
  id: string;
  chapterId?: string | null;
  title?: string;
  body?: string;
}

export interface PlotCreateInput {
  projectId: string;
  title: string;
  body?: string;
}

export interface PlotUpdateInput {
  id: string;
  title?: string;
  body?: string;
}
