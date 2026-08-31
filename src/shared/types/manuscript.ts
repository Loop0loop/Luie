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

/**
 * 목록 조회용 챕터. 본문(content)을 제외한다.
 *
 * NOTE: 장편 프로젝트는 챕터 수 × 본문 크기가 그대로 렌더러 힙에 상주한다. 목록 UI는
 * 제목/순서만 그리므로 목록 경계에서는 본문을 나르지 않는다. 본문이 필요한 화면은
 * 활성 챕터 단건 조회(`api.chapter.get`)로 받는다.
 *
 * 이름 주의: `ChapterSummaryResult`/`ChapterSummaryStatus`는 AI 메모리 요약이라 별개 개념이다.
 */
export type ChapterListItem = Omit<Chapter, "content">;

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

export interface ChapterSaveProtectedPayload {
  chapterId: string;
  projectId: string;
  reason: "empty-wipe" | "large-deletion";
  oldLength: number;
  newLength: number;
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
