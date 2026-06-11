import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import type {
  MemoryConflictQueueInput,
  MemoryEvidenceRepairInput,
  MemoryEvidenceRepairResult,
  MemoryEpisodeCalibrationRequest,
  MemoryEpisodeConfirmInput,
  MemoryEpisodeRejectInput,
  MemoryEpisodeReviewQueueInput,
  MemoryChunkWindowQuery,
  MemoryEntityConfirmInput,
  MemoryEntityRejectInput,
  MemoryEntityReviewQueueInput,
  MemoryEntityAliasConfirmInput,
  MemoryEntityAliasRejectInput,
  MemoryEntityAliasReviewQueueInput,
  MemoryEntityAliasSplitInput,
  MemoryEntityMergeInput,
  MemoryEvalRunRequest,
  MemoryReviewBacklogInput,
  MemoryStaleEvidenceReviewActionInput,
  NarrativeMemoryIntentCalibrationRequest,
  MemoryTemporalFactConfirmInput,
  MemoryTemporalFactConflictResolveInput,
  MemoryTemporalFactRejectInput,
  MemoryTemporalFactReviewQueueInput,
  NarrativeMemoryQueryInput,
  SearchQuery,
} from "../../../shared/types/index.js";
import { registerIpcHandlers } from "../core/ipcRegistrar.js";
import {
  chapterIdSchema,
  memoryChunkIdSchema,
  memoryChunkSearchSchema,
  memoryChunkWindowSchema,
  memoryBuildJobControlSchema,
  memoryConflictQueueQuerySchema,
  memoryEmbeddingStatusSchema,
  memoryEpisodeConfirmSchema,
  memoryEpisodeRejectSchema,
  memoryEpisodeReviewQueueSchema,
  memoryEntityAliasConfirmSchema,
  memoryEntityAliasRejectSchema,
  memoryEntityAliasReviewQueueSchema,
  memoryEntityAliasSplitSchema,
  memoryEntityConfirmSchema,
  memoryEntityRejectSchema,
  memoryEntityReviewQueueSchema,
  memoryEntityMergeSchema,
  memoryEvidenceRepairSchema,
  memoryReviewBacklogSchema,
  memoryStaleEvidenceReviewActionSchema,
  memoryEvalRunSchema,
  memoryEpisodeCalibrationRunSchema,
  memoryIntentCalibrationRunSchema,
  memoryTemporalFactConfirmSchema,
  memoryTemporalFactConflictResolveSchema,
  memoryTemporalFactRejectSchema,
  memoryTemporalFactReviewQueueSchema,
  memoryNarrativeSummaryStatusSchema,
  memorySummaryStatusSchema,
  narrativeMemoryQuerySchema,
  projectIdSchema,
  rebuildMemoryChunksSchema,
  searchQuerySchema,
} from "../../../shared/schemas/index.js";
import {
  cancelMemoryBuildJobs,
  getMemoryBuildJobProgress,
  pauseMemoryBuildJobs,
  resumeMemoryBuildJobs,
} from "../../services/features/memory/jobControl.js";
import { z } from "zod";
import type { LoggerLike } from "../core/types.js";

type SearchServiceLike = {
  search: (input: SearchQuery) => Promise<unknown>;
  searchChunks: (input: {
    projectId: string;
    query: string;
    limit?: number;
  }) => Promise<unknown>;
  getChunkBacklink: (chunkId: string) => Promise<unknown>;
  getChunkWindow: (input: MemoryChunkWindowQuery) => Promise<unknown>;
};

type NarrativeMemoryQueryServiceLike = {
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
  runIntentCalibration: (
    input: NarrativeMemoryIntentCalibrationRequest,
  ) => Promise<unknown>;
  runEpisodeCalibration: (
    input: MemoryEpisodeCalibrationRequest,
  ) => Promise<unknown>;
};

type ChapterSummaryProjectorLike = {
  getChapterSummary: (chapterId: string) => Promise<unknown>;
  getSummaryStatus: (projectId: string) => Promise<unknown>;
};

type EmbeddingProjectorLike = {
  getEmbeddingStatus: (projectId: string) => Promise<unknown>;
};

type NarrativeSummaryStatusServiceLike = {
  getStatus: (input: { projectId: string }) => Promise<unknown>;
};

type PackagePersistenceLike = {
  persistPackageAfterMutation: (projectId: string, reason: string) => Promise<void>;
};

type MemoryReviewMutationResult = {
  updated?: unknown;
};

type DbMaintenanceServiceLike = {
  getSearchIndexStatus: (projectId: string) => Promise<unknown>;
  rebuildSearchIndex: (projectId: string) => Promise<unknown>;
  rebuildMemoryChunks: (input: {
    projectId: string;
    sourceType?: string;
    sourceId?: string;
  }) => Promise<unknown>;
  getMemoryJobStatus: (projectId: string) => Promise<unknown>;
  runIntegrityCheck: () => Promise<unknown>;
  getMigrationHealth: () => Promise<unknown>;
};

export function registerSearchIPCHandlers(
  logger: LoggerLike,
  searchService: SearchServiceLike,
  dbMaintenanceService: DbMaintenanceServiceLike,
  chapterSummaryProjector: ChapterSummaryProjectorLike,
  embeddingProjector: EmbeddingProjectorLike,
  narrativeMemoryQueryService: NarrativeMemoryQueryServiceLike,
  narrativeSummaryStatusService?: NarrativeSummaryStatusServiceLike,
  packagePersistence?: PackagePersistenceLike,
): void {
  const persistAfterUpdatedReviewMutation = async (
    projectId: string,
    reason: string,
    operation: () => Promise<unknown>,
  ): Promise<unknown> => {
    const result = (await operation()) as MemoryReviewMutationResult;
    if (result?.updated === true) {
      await packagePersistence?.persistPackageAfterMutation(projectId, reason);
    }
    return result;
  };

  const persistAfterRepairedEvidenceLinks = async (
    projectId: string,
    reason: string,
    operation: () => Promise<unknown>,
  ): Promise<unknown> => {
    const result = (await operation()) as MemoryEvidenceRepairResult;
    const repairedCount =
      result.episodeEvidenceRepaired +
      result.entityMentionRepaired +
      result.evalEvidenceRepaired;
    if (repairedCount > 0) {
      await packagePersistence?.persistPackageAfterMutation(projectId, reason);
    }
    return result;
  };

  registerIpcHandlers(logger, [
    {
      channel: IPC_CHANNELS.SEARCH,
      logTag: "SEARCH",
      failMessage: "Failed to search",
      argsSchema: z.tuple([searchQuerySchema]),
      handler: (input: SearchQuery) => searchService.search(input),
    },
    {
      channel: IPC_CHANNELS.SEARCH_INDEX_STATUS,
      logTag: "SEARCH_INDEX_STATUS",
      failMessage: "Failed to get search index status",
      argsSchema: z.tuple([projectIdSchema]),
      handler: (projectId: string) =>
        dbMaintenanceService.getSearchIndexStatus(projectId),
    },
    {
      channel: IPC_CHANNELS.SEARCH_REBUILD_INDEX,
      logTag: "SEARCH_REBUILD_INDEX",
      failMessage: "Failed to rebuild search index",
      argsSchema: z.tuple([projectIdSchema]),
      handler: (projectId: string) =>
        dbMaintenanceService.rebuildSearchIndex(projectId),
    },
    {
      channel: IPC_CHANNELS.MEMORY_REBUILD_CHUNKS,
      logTag: "MEMORY_REBUILD_CHUNKS",
      failMessage: "Failed to rebuild memory chunks",
      argsSchema: z.tuple([rebuildMemoryChunksSchema]),
      handler: (input: {
        projectId: string;
        sourceType?: string;
        sourceId?: string;
      }) => dbMaintenanceService.rebuildMemoryChunks(input),
    },
    {
      channel: IPC_CHANNELS.MEMORY_JOB_STATUS,
      logTag: "MEMORY_JOB_STATUS",
      failMessage: "Failed to get memory job status",
      argsSchema: z.tuple([projectIdSchema]),
      handler: (projectId: string) =>
        dbMaintenanceService.getMemoryJobStatus(projectId),
    },
    {
      channel: IPC_CHANNELS.MEMORY_SEARCH_CHUNKS,
      logTag: "MEMORY_SEARCH_CHUNKS",
      failMessage: "Failed to search memory chunks",
      argsSchema: z.tuple([memoryChunkSearchSchema]),
      handler: (input: { projectId: string; query: string; limit?: number }) =>
        searchService.searchChunks(input),
    },
    {
      channel: IPC_CHANNELS.MEMORY_QUERY_NARRATIVE,
      logTag: "MEMORY_QUERY_NARRATIVE",
      failMessage: "Failed to query narrative memory",
      argsSchema: z.tuple([narrativeMemoryQuerySchema]),
      handler: (input: NarrativeMemoryQueryInput) =>
        narrativeMemoryQueryService.query(input),
    },
    {
      channel: IPC_CHANNELS.MEMORY_REVIEW_BACKLOG,
      logTag: "MEMORY_REVIEW_BACKLOG",
      failMessage: "Failed to get memory review backlog",
      argsSchema: z.tuple([memoryReviewBacklogSchema]),
      handler: (input: MemoryReviewBacklogInput) =>
        narrativeMemoryQueryService.getReviewBacklog(input),
    },
    {
      channel: IPC_CHANNELS.MEMORY_GET_CONFLICT_QUEUE,
      logTag: "MEMORY_GET_CONFLICT_QUEUE",
      failMessage: "Failed to get conflict queue",
      argsSchema: z.tuple([memoryConflictQueueQuerySchema]),
      handler: (input: MemoryConflictQueueInput) =>
        narrativeMemoryQueryService.getConflictQueue(input),
    },
    {
      channel: IPC_CHANNELS.MEMORY_EPISODE_REVIEW_QUEUE,
      logTag: "MEMORY_EPISODE_REVIEW_QUEUE",
      failMessage: "Failed to get episode review queue",
      argsSchema: z.tuple([memoryEpisodeReviewQueueSchema]),
      handler: (input: MemoryEpisodeReviewQueueInput) =>
        narrativeMemoryQueryService.listSuggestedEpisodes(input),
    },
    {
      channel: IPC_CHANNELS.MEMORY_EPISODE_CONFIRM,
      logTag: "MEMORY_EPISODE_CONFIRM",
      failMessage: "Failed to confirm episode",
      argsSchema: z.tuple([memoryEpisodeConfirmSchema]),
      handler: (input: MemoryEpisodeConfirmInput) =>
        persistAfterUpdatedReviewMutation(input.projectId, "memory:episode-confirm", () =>
          narrativeMemoryQueryService.confirmEpisode(input),
        ),
    },
    {
      channel: IPC_CHANNELS.MEMORY_EPISODE_REJECT,
      logTag: "MEMORY_EPISODE_REJECT",
      failMessage: "Failed to reject episode",
      argsSchema: z.tuple([memoryEpisodeRejectSchema]),
      handler: (input: MemoryEpisodeRejectInput) =>
        persistAfterUpdatedReviewMutation(input.projectId, "memory:episode-reject", () =>
          narrativeMemoryQueryService.rejectEpisode(input),
        ),
    },
    {
      channel: IPC_CHANNELS.MEMORY_FACT_REVIEW_QUEUE,
      logTag: "MEMORY_FACT_REVIEW_QUEUE",
      failMessage: "Failed to get fact review queue",
      argsSchema: z.tuple([memoryTemporalFactReviewQueueSchema]),
      handler: (input: MemoryTemporalFactReviewQueueInput) =>
        narrativeMemoryQueryService.listSuggestedFacts(input),
    },
    {
      channel: IPC_CHANNELS.MEMORY_FACT_CONFIRM,
      logTag: "MEMORY_FACT_CONFIRM",
      failMessage: "Failed to confirm fact",
      argsSchema: z.tuple([memoryTemporalFactConfirmSchema]),
      handler: (input: MemoryTemporalFactConfirmInput) =>
        persistAfterUpdatedReviewMutation(input.projectId, "memory:fact-confirm", () =>
          narrativeMemoryQueryService.confirmFact(input),
        ),
    },
    {
      channel: IPC_CHANNELS.MEMORY_FACT_REJECT,
      logTag: "MEMORY_FACT_REJECT",
      failMessage: "Failed to reject fact",
      argsSchema: z.tuple([memoryTemporalFactRejectSchema]),
      handler: (input: MemoryTemporalFactRejectInput) =>
        persistAfterUpdatedReviewMutation(input.projectId, "memory:fact-reject", () =>
          narrativeMemoryQueryService.rejectFact(input),
        ),
    },
    {
      channel: IPC_CHANNELS.MEMORY_CONFLICT_RESOLVE,
      logTag: "MEMORY_CONFLICT_RESOLVE",
      failMessage: "Failed to resolve fact conflict",
      argsSchema: z.tuple([memoryTemporalFactConflictResolveSchema]),
      handler: (input: MemoryTemporalFactConflictResolveInput) =>
        persistAfterUpdatedReviewMutation(input.projectId, "memory:fact-conflict-resolve", () =>
          narrativeMemoryQueryService.resolveFactConflict(input),
        ),
    },
    {
      channel: IPC_CHANNELS.MEMORY_ENTITY_ALIAS_REVIEW_QUEUE,
      logTag: "MEMORY_ENTITY_ALIAS_REVIEW_QUEUE",
      failMessage: "Failed to get entity alias review queue",
      argsSchema: z.tuple([memoryEntityAliasReviewQueueSchema]),
      handler: (input: MemoryEntityAliasReviewQueueInput) =>
        narrativeMemoryQueryService.listSuggestedEntityAliases(input),
    },
    {
      channel: IPC_CHANNELS.MEMORY_ENTITY_REVIEW_QUEUE,
      logTag: "MEMORY_ENTITY_REVIEW_QUEUE",
      failMessage: "Failed to get entity review queue",
      argsSchema: z.tuple([memoryEntityReviewQueueSchema]),
      handler: (input: MemoryEntityReviewQueueInput) =>
        narrativeMemoryQueryService.listSuggestedEntities(input),
    },
    {
      channel: IPC_CHANNELS.MEMORY_ENTITY_CONFIRM,
      logTag: "MEMORY_ENTITY_CONFIRM",
      failMessage: "Failed to confirm entity",
      argsSchema: z.tuple([memoryEntityConfirmSchema]),
      handler: (input: MemoryEntityConfirmInput) =>
        persistAfterUpdatedReviewMutation(input.projectId, "memory:entity-confirm", () =>
          narrativeMemoryQueryService.confirmEntity(input),
        ),
    },
    {
      channel: IPC_CHANNELS.MEMORY_ENTITY_REJECT,
      logTag: "MEMORY_ENTITY_REJECT",
      failMessage: "Failed to reject entity",
      argsSchema: z.tuple([memoryEntityRejectSchema]),
      handler: (input: MemoryEntityRejectInput) =>
        persistAfterUpdatedReviewMutation(input.projectId, "memory:entity-reject", () =>
          narrativeMemoryQueryService.rejectEntity(input),
        ),
    },
    {
      channel: IPC_CHANNELS.MEMORY_ENTITY_ALIAS_CONFIRM,
      logTag: "MEMORY_ENTITY_ALIAS_CONFIRM",
      failMessage: "Failed to confirm entity alias",
      argsSchema: z.tuple([memoryEntityAliasConfirmSchema]),
      handler: (input: MemoryEntityAliasConfirmInput) =>
        persistAfterUpdatedReviewMutation(input.projectId, "memory:entity-alias-confirm", () =>
          narrativeMemoryQueryService.confirmEntityAlias(input),
        ),
    },
    {
      channel: IPC_CHANNELS.MEMORY_ENTITY_ALIAS_REJECT,
      logTag: "MEMORY_ENTITY_ALIAS_REJECT",
      failMessage: "Failed to reject entity alias",
      argsSchema: z.tuple([memoryEntityAliasRejectSchema]),
      handler: (input: MemoryEntityAliasRejectInput) =>
        persistAfterUpdatedReviewMutation(input.projectId, "memory:entity-alias-reject", () =>
          narrativeMemoryQueryService.rejectEntityAlias(input),
        ),
    },
    {
      channel: IPC_CHANNELS.MEMORY_ENTITY_ALIAS_SPLIT,
      logTag: "MEMORY_ENTITY_ALIAS_SPLIT",
      failMessage: "Failed to split entity alias",
      argsSchema: z.tuple([memoryEntityAliasSplitSchema]),
      handler: (input: MemoryEntityAliasSplitInput) =>
        persistAfterUpdatedReviewMutation(input.projectId, "memory:entity-alias-split", () =>
          narrativeMemoryQueryService.splitEntityAlias(input),
        ),
    },
    {
      channel: IPC_CHANNELS.MEMORY_ENTITY_MERGE,
      logTag: "MEMORY_ENTITY_MERGE",
      failMessage: "Failed to merge memory entity",
      argsSchema: z.tuple([memoryEntityMergeSchema]),
      handler: (input: MemoryEntityMergeInput) =>
        persistAfterUpdatedReviewMutation(input.projectId, "memory:entity-merge", () =>
          narrativeMemoryQueryService.mergeEntity(input),
        ),
    },
    {
      channel: IPC_CHANNELS.MEMORY_STALE_EVIDENCE_REVIEW_ACTION,
      logTag: "MEMORY_STALE_EVIDENCE_REVIEW_ACTION",
      failMessage: "Failed to review stale evidence",
      argsSchema: z.tuple([memoryStaleEvidenceReviewActionSchema]),
      handler: (input: MemoryStaleEvidenceReviewActionInput) =>
        persistAfterUpdatedReviewMutation(
          input.projectId,
          "memory:stale-evidence-review-action",
          () => narrativeMemoryQueryService.reviewStaleEvidence(input),
        ),
    },
    {
      channel: IPC_CHANNELS.MEMORY_REPAIR_EVIDENCE_LINKS,
      logTag: "MEMORY_REPAIR_EVIDENCE_LINKS",
      failMessage: "Failed to repair memory evidence links",
      argsSchema: z.tuple([memoryEvidenceRepairSchema]),
      handler: (input: MemoryEvidenceRepairInput) =>
        persistAfterRepairedEvidenceLinks(
          input.projectId,
          "memory:repair-evidence-links",
          () => narrativeMemoryQueryService.repairEvidenceLinks(input),
        ),
    },
    {
      channel: IPC_CHANNELS.MEMORY_RUN_EVAL_SUITE,
      logTag: "MEMORY_RUN_EVAL_SUITE",
      failMessage: "Failed to run memory eval suite",
      argsSchema: z.tuple([memoryEvalRunSchema]),
      handler: (input: MemoryEvalRunRequest) =>
        narrativeMemoryQueryService.runEvalSuite(input),
    },
    {
      channel: IPC_CHANNELS.MEMORY_RUN_INTENT_CALIBRATION,
      logTag: "MEMORY_RUN_INTENT_CALIBRATION",
      failMessage: "Failed to run memory intent calibration",
      argsSchema: z.tuple([memoryIntentCalibrationRunSchema]),
      handler: (input: NarrativeMemoryIntentCalibrationRequest) =>
        narrativeMemoryQueryService.runIntentCalibration(input),
    },
    {
      channel: IPC_CHANNELS.MEMORY_RUN_EPISODE_CALIBRATION,
      logTag: "MEMORY_RUN_EPISODE_CALIBRATION",
      failMessage: "Failed to run memory episode calibration",
      argsSchema: z.tuple([memoryEpisodeCalibrationRunSchema]),
      handler: (input: MemoryEpisodeCalibrationRequest) =>
        narrativeMemoryQueryService.runEpisodeCalibration(input),
    },
    {
      channel: IPC_CHANNELS.MEMORY_GET_CHUNK_BACKLINK,
      logTag: "MEMORY_GET_CHUNK_BACKLINK",
      failMessage: "Failed to get memory chunk backlink",
      argsSchema: z.tuple([memoryChunkIdSchema]),
      handler: (chunkId: string) => searchService.getChunkBacklink(chunkId),
    },
    {
      channel: IPC_CHANNELS.MEMORY_GET_CHUNK_WINDOW,
      logTag: "MEMORY_GET_CHUNK_WINDOW",
      failMessage: "Failed to get memory chunk window",
      argsSchema: z.tuple([memoryChunkWindowSchema]),
      handler: (input: MemoryChunkWindowQuery) =>
        searchService.getChunkWindow(input),
    },
    {
      channel: IPC_CHANNELS.MEMORY_GET_CHAPTER_SUMMARY,
      logTag: "MEMORY_GET_CHAPTER_SUMMARY",
      failMessage: "Failed to get chapter summary",
      argsSchema: z.tuple([chapterIdSchema]),
      handler: (chapterId: string) =>
        chapterSummaryProjector.getChapterSummary(chapterId),
    },
    {
      channel: IPC_CHANNELS.MEMORY_GET_SUMMARY_STATUS,
      logTag: "MEMORY_GET_SUMMARY_STATUS",
      failMessage: "Failed to get summary status",
      argsSchema: z.tuple([memorySummaryStatusSchema]),
      handler: (input: { projectId: string }) =>
        chapterSummaryProjector.getSummaryStatus(input.projectId),
    },
    {
      channel: IPC_CHANNELS.MEMORY_GET_NARRATIVE_SUMMARY_STATUS,
      logTag: "MEMORY_GET_NARRATIVE_SUMMARY_STATUS",
      failMessage: "Failed to get narrative summary status",
      argsSchema: z.tuple([memoryNarrativeSummaryStatusSchema]),
      handler: (input: { projectId: string }) =>
        narrativeSummaryStatusService?.getStatus(input) ??
        Promise.resolve({
          projectId: input.projectId,
          totalCount: 0,
          staleCount: 0,
          byType: {},
          summaries: [],
        }),
    },
    {
      channel: IPC_CHANNELS.MEMORY_GET_EMBEDDING_STATUS,
      logTag: "MEMORY_GET_EMBEDDING_STATUS",
      failMessage: "Failed to get embedding status",
      argsSchema: z.tuple([memoryEmbeddingStatusSchema]),
      handler: (input: { projectId: string }) =>
        embeddingProjector.getEmbeddingStatus(input.projectId),
    },
    {
      channel: IPC_CHANNELS.MEMORY_PAUSE_BUILD_JOBS,
      logTag: "MEMORY_PAUSE_BUILD_JOBS",
      failMessage: "Failed to pause memory build jobs",
      argsSchema: z.tuple([memoryBuildJobControlSchema]),
      handler: (input: { projectId: string }) => pauseMemoryBuildJobs(input),
    },
    {
      channel: IPC_CHANNELS.MEMORY_RESUME_BUILD_JOBS,
      logTag: "MEMORY_RESUME_BUILD_JOBS",
      failMessage: "Failed to resume memory build jobs",
      argsSchema: z.tuple([memoryBuildJobControlSchema]),
      handler: (input: { projectId: string }) => resumeMemoryBuildJobs(input),
    },
    {
      channel: IPC_CHANNELS.MEMORY_CANCEL_BUILD_JOBS,
      logTag: "MEMORY_CANCEL_BUILD_JOBS",
      failMessage: "Failed to cancel memory build jobs",
      argsSchema: z.tuple([memoryBuildJobControlSchema]),
      handler: (input: { projectId: string }) => cancelMemoryBuildJobs(input),
    },
    {
      channel: IPC_CHANNELS.MEMORY_GET_BUILD_JOB_PROGRESS,
      logTag: "MEMORY_GET_BUILD_JOB_PROGRESS",
      failMessage: "Failed to get memory build job progress",
      argsSchema: z.tuple([memoryBuildJobControlSchema]),
      handler: (input: { projectId: string }) => getMemoryBuildJobProgress(input),
    },
    {
      channel: IPC_CHANNELS.DB_RUN_INTEGRITY_CHECK,
      logTag: "DB_RUN_INTEGRITY_CHECK",
      failMessage: "Failed to run integrity check",
      argsSchema: z.tuple([]),
      handler: () => dbMaintenanceService.runIntegrityCheck(),
    },
    {
      channel: IPC_CHANNELS.DB_GET_MIGRATION_HEALTH,
      logTag: "DB_GET_MIGRATION_HEALTH",
      failMessage: "Failed to get migration health",
      argsSchema: z.tuple([]),
      handler: () => dbMaintenanceService.getMigrationHealth(),
    },
  ]);
}
