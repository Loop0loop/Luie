export interface SearchIndexStatus {
  projectId: string;
  projectionCount: number;
  ftsCount: number | null;
  pendingQueueCount: number;
  pendingCount?: number;
  runningCount?: number;
  failedCount?: number;
  lastProcessedAt?: string | null;
}

export interface MemoryJobStatus {
  projectId: string;
  pendingCount: number;
  runningCount: number;
  failedCount: number;
  lastProcessedAt: string | null;
}

export interface MemoryBuildJobProgress {
  projectId: string;
  total: number;
  activeCount: number;
  doneCount: number;
  byStatus: Record<string, number>;
  attention: {
    retryableFailedCount: number;
    retryBackoffCount: number;
    exhaustedFailedCount: number;
    staleCancellationRequestedCount: number;
    latestError: string | null;
  };
  byJobType: Record<
    string,
    {
      total: number;
      activeCount: number;
      doneCount: number;
      byStatus: Record<string, number>;
    }
  >;
}

export interface MigrationHealth {
  chapterCount: number;
  chapterBodyCount: number;
  missingBodyCount: number;
  hashMismatchCount: number;
  hashMismatchSampled: boolean;
  vectorSearchEnabled: boolean;
  invalidEmbeddingCount: number;
  relationPointerMismatchCount: number;
}

export interface ChapterSummaryResult {
  chapterId: string;
  summary: string;
  isFallback: boolean;
  model: string | null;
  generatedAt: string;
}

export interface ChapterSummaryStatus {
  projectId: string;
  pendingCount: number;
  runningCount: number;
  failedCount: number;
  completedCount: number;
}

export interface NarrativeSummaryStatusItem {
  id: string;
  title: string;
  summary: string;
  summaryType: string;
  scopeType: string;
  scopeId: string | null;
  status: string;
  confidence: number;
  sourceContentHash: string;
  generatedAt: string;
  updatedAt: string;
  sourceCount: number;
  isStale: boolean;
}

export interface NarrativeSummaryStatus {
  projectId: string;
  totalCount: number;
  staleCount: number;
  byType: Record<string, number>;
  summaries: NarrativeSummaryStatusItem[];
}

export interface MemoryEmbeddingStatus {
  projectId: string;
  pendingCount: number;
  runningCount: number;
  failedCount: number;
  completedCount: number;
  skippedCount?: number;
  chunkCount?: number;
  embeddingCount?: number;
  unembeddedChunkCount?: number;
  staleEmbeddingCount?: number;
  currentModel?: string | null;
  ready?: boolean;
}
