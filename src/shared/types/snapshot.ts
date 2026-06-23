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
