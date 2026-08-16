import type {
  MemoryChunkWindowQuery,
  MemoryEpisodeCalibrationRequest,
  MemoryEvalFeedbackRecordRequest,
  MemoryEvalRunRequest,
  NarrativeMemoryIntentCalibrationRequest,
  NarrativeMemoryQueryInput,
} from "../../../shared/types/index.js";

export type MemoryChunkSearchServiceLike = {
  searchChunks: (input: {
    projectId: string;
    query: string;
    limit?: number;
  }) => Promise<unknown>;
  getChunkBacklink: (chunkId: string) => Promise<unknown>;
  getChunkWindow: (input: MemoryChunkWindowQuery) => Promise<unknown>;
};

export type NarrativeMemoryQueryServiceLike = {
  query: (input: NarrativeMemoryQueryInput) => Promise<unknown>;
  runEvalSuite: (input: MemoryEvalRunRequest) => Promise<unknown>;
  recordEvalFeedback: (
    input: MemoryEvalFeedbackRecordRequest,
  ) => Promise<unknown>;
  runIntentCalibration: (
    input: NarrativeMemoryIntentCalibrationRequest,
  ) => Promise<unknown>;
  runEpisodeCalibration: (
    input: MemoryEpisodeCalibrationRequest,
  ) => Promise<unknown>;
};

export type ChapterSummaryProjectorLike = {
  getChapterSummary: (chapterId: string) => Promise<unknown>;
  getSummaryStatus: (projectId: string) => Promise<unknown>;
};

export type EmbeddingProjectorLike = {
  getEmbeddingStatus: (projectId: string) => Promise<unknown>;
};

export type NarrativeSummaryStatusServiceLike = {
  getStatus: (input: { projectId: string }) => Promise<unknown>;
};

export type MemoryMaintenanceServiceLike = {
  rebuildMemoryChunks: (input: {
    projectId: string;
    sourceType?: string;
    sourceId?: string;
  }) => Promise<unknown>;
  getMemoryJobStatus: (projectId: string) => Promise<unknown>;
};
