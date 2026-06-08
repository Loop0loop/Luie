export interface MemoryChunkSearchQuery {
  projectId: string;
  query: string;
  limit?: number;
}

export interface MemoryChunkSearchResult {
  chunkId: string;
  chapterId: string | null;
  content: string;
  startOffset: number | null;
  endOffset: number | null;
  score: number;
  parentWindow?: {
    chunkIds: string[];
    content: string;
    startOffset: number | null;
    endOffset: number | null;
    paragraphStartIndex: number | null;
    paragraphEndIndex: number | null;
  };
}

export interface MemoryChunkBacklink {
  chunkId: string;
  chapterId: string | null;
  offset: number;
  endOffset: number | null;
}

export interface MemoryChunkWindowQuery {
  projectId: string;
  chunkId: string;
  unit?: "chunk" | "paragraph";
  before?: number;
  after?: number;
}

export interface MemoryChunkWindowItem {
  chunkId: string;
  chunkIndex: number;
  chapterId: string | null;
  sceneId: string | null;
  content: string;
  startOffset: number | null;
  endOffset: number | null;
  paragraphStartIndex: number | null;
  paragraphEndIndex: number | null;
}

export interface MemoryChunkWindowResult {
  projectId: string;
  anchorChunkId: string;
  sourceType: string;
  sourceId: string;
  chapterId: string | null;
  sceneId: string | null;
  contextLabel: string | null;
  sourceContentHash: string;
  startOffset: number | null;
  endOffset: number | null;
  paragraphStartIndex: number | null;
  paragraphEndIndex: number | null;
  content: string;
  chunks: MemoryChunkWindowItem[];
}
