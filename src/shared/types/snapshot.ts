export interface Snapshot {
  id: string;
  projectId: string;
  chapterId?: string | null;
  content: string;
  contentLength?: number;
  type?: "AUTO" | "MANUAL";
  description?: string | null;
  createdAt: string | Date;
}

// 목록 조회용 요약 행. content(원고 전문)는 목록 IPC 페이로드에서 제외한다 —
// 스냅샷 수 × 원고 크기의 직렬화 비용을 막기 위함. 전문은 get(id)로 개별 조회.
export type SnapshotSummary = Omit<Snapshot, "content">;

// 스냅샷 식별 참조. 요약(전문 없음)과 전문 행을 모두 수용한다.
// 전문이 필요한 소비자는 content가 없을 때 개별 조회로 해소한다.
export type SnapshotRef = Omit<Snapshot, "content"> & { content?: string };

export interface SnapshotRestoreCandidate {
  snapshotId: string;
  projectId: string;
  projectTitle: string;
  chapterTitle?: string;
  savedAt: string;
  excerpt?: string;
  filePath: string;
}

export interface SnapshotCreateInput {
  projectId: string;
  chapterId?: string;
  content: string;
  description?: string;
  type?: "AUTO" | "MANUAL";
}
