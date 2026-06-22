import type {
  MemoryChunkWindowQuery,
  MemoryConflictQueueInput,
  MemoryEntityAliasConfirmInput,
  MemoryEntityAliasRejectInput,
  MemoryEntityAliasReviewQueueInput,
  MemoryEntityAliasSplitInput,
  MemoryEntityConfirmInput,
  MemoryEntityMergeInput,
  MemoryEntityRejectInput,
  MemoryEntityReviewQueueInput,
  MemoryEpisodeCalibrationRequest,
  MemoryEpisodeConfirmInput,
  MemoryEpisodeRejectInput,
  MemoryEpisodeReviewQueueInput,
  MemoryEvalFeedbackRecordRequest,
  MemoryEvalRunRequest,
  MemoryEvidenceRepairInput,
  MemoryStaleEvidenceReviewActionInput,
  MemoryTemporalFactConfirmInput,
  MemoryTemporalFactConflictResolveInput,
  MemoryTemporalFactConflictReviewInput,
  MemoryTemporalFactRejectInput,
  MemoryTemporalFactReviewQueueInput,
  NarrativeMemoryIntentCalibrationRequest,
  NarrativeMemoryQueryInput,
  MemoryReviewBacklogInput,
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
  getReviewBacklog: (input: MemoryReviewBacklogInput) => Promise<unknown>;
  getConflictQueue: (input: MemoryConflictQueueInput) => Promise<unknown>;
  listSuggestedEpisodes: (input: MemoryEpisodeReviewQueueInput) => Promise<unknown>;
  confirmEpisode: (input: MemoryEpisodeConfirmInput) => Promise<unknown>;
  rejectEpisode: (input: MemoryEpisodeRejectInput) => Promise<unknown>;
  listSuggestedFacts: (input: MemoryTemporalFactReviewQueueInput) => Promise<unknown>;
  confirmFact: (input: MemoryTemporalFactConfirmInput) => Promise<unknown>;
  rejectFact: (input: MemoryTemporalFactRejectInput) => Promise<unknown>;
  resolveFactConflict: (input: MemoryTemporalFactConflictResolveInput) => Promise<unknown>;
  reviewFactConflict: (input: MemoryTemporalFactConflictReviewInput) => Promise<unknown>;
  listSuggestedEntityAliases: (input: MemoryEntityAliasReviewQueueInput) => Promise<unknown>;
  listSuggestedEntities: (input: MemoryEntityReviewQueueInput) => Promise<unknown>;
  confirmEntity: (input: MemoryEntityConfirmInput) => Promise<unknown>;
  rejectEntity: (input: MemoryEntityRejectInput) => Promise<unknown>;
  confirmEntityAlias: (input: MemoryEntityAliasConfirmInput) => Promise<unknown>;
  rejectEntityAlias: (input: MemoryEntityAliasRejectInput) => Promise<unknown>;
  splitEntityAlias: (input: MemoryEntityAliasSplitInput) => Promise<unknown>;
  mergeEntity: (input: MemoryEntityMergeInput) => Promise<unknown>;
  reviewStaleEvidence: (
    input: MemoryStaleEvidenceReviewActionInput,
  ) => Promise<unknown>;
  repairEvidenceLinks: (input: MemoryEvidenceRepairInput) => Promise<unknown>;
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

export type PackagePersistenceLike = {
  persistPackageAfterMutation: (projectId: string, reason: string) => Promise<void>;
};

export type MemoryReviewMutationResult = {
  updated?: unknown;
};

export type MemoryMaintenanceServiceLike = {
  rebuildMemoryChunks: (input: {
    projectId: string;
    sourceType?: string;
    sourceId?: string;
  }) => Promise<unknown>;
  getMemoryJobStatus: (projectId: string) => Promise<unknown>;
};
