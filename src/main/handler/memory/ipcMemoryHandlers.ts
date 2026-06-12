import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import {
  chapterIdSchema,
  memoryBuildJobControlSchema,
  memoryChunkIdSchema,
  memoryChunkSearchSchema,
  memoryChunkWindowSchema,
  memoryConflictQueueQuerySchema,
  memoryEmbeddingStatusSchema,
  memoryEntityAliasConfirmSchema,
  memoryEntityAliasRejectSchema,
  memoryEntityAliasReviewQueueSchema,
  memoryEntityAliasSplitSchema,
  memoryEntityConfirmSchema,
  memoryEntityMergeSchema,
  memoryEntityRejectSchema,
  memoryEntityReviewQueueSchema,
  memoryEpisodeCalibrationRunSchema,
  memoryEpisodeConfirmSchema,
  memoryEpisodeRejectSchema,
  memoryEpisodeReviewQueueSchema,
  memoryEvalRunSchema,
  memoryEvidenceRepairSchema,
  memoryIntentCalibrationRunSchema,
  memoryNarrativeSummaryStatusSchema,
  memoryReviewBacklogSchema,
  memoryStaleEvidenceReviewActionSchema,
  memorySummaryStatusSchema,
  memoryTemporalFactConfirmSchema,
  memoryTemporalFactConflictResolveSchema,
  memoryTemporalFactConflictReviewSchema,
  memoryTemporalFactRejectSchema,
  memoryTemporalFactReviewQueueSchema,
  narrativeMemoryQuerySchema,
  projectIdSchema,
  rebuildMemoryChunksSchema,
} from "../../../shared/schemas/index.js";
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
  MemoryEvalRunRequest,
  MemoryEvidenceRepairInput,
  MemoryEvidenceRepairResult,
  MemoryReviewBacklogInput,
  MemoryStaleEvidenceReviewActionInput,
  MemoryTemporalFactConfirmInput,
  MemoryTemporalFactConflictResolveInput,
  MemoryTemporalFactConflictReviewInput,
  MemoryTemporalFactRejectInput,
  MemoryTemporalFactReviewQueueInput,
  NarrativeMemoryIntentCalibrationRequest,
  NarrativeMemoryQueryInput,
} from "../../../shared/types/index.js";
import type {
  ChapterSummaryProjectorLike,
  EmbeddingProjectorLike,
  MemoryChunkSearchServiceLike,
  MemoryMaintenanceServiceLike,
  MemoryReviewMutationResult,
  NarrativeMemoryQueryServiceLike,
  NarrativeSummaryStatusServiceLike,
  PackagePersistenceLike,
} from "./types.js";
import {
  cancelMemoryBuildJobs,
  getMemoryBuildJobProgress,
  pauseMemoryBuildJobs,
  resumeMemoryBuildJobs,
} from "../../services/features/memory/index.js";
import { registerIpcHandlers } from "../core/ipcRegistrar.js";
import type { LoggerLike } from "../core/types.js";
import { z } from "zod";

export function registerMemoryIPCHandlers(
  logger: LoggerLike,
  chunkSearchService: MemoryChunkSearchServiceLike,
  memoryMaintenanceService: MemoryMaintenanceServiceLike,
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
      channel: IPC_CHANNELS.MEMORY_REBUILD_CHUNKS,
      logTag: "MEMORY_REBUILD_CHUNKS",
      failMessage: "Failed to rebuild memory chunks",
      argsSchema: z.tuple([rebuildMemoryChunksSchema]),
      handler: (input: {
        projectId: string;
        sourceType?: string;
        sourceId?: string;
      }) => memoryMaintenanceService.rebuildMemoryChunks(input),
    },
    {
      channel: IPC_CHANNELS.MEMORY_JOB_STATUS,
      logTag: "MEMORY_JOB_STATUS",
      failMessage: "Failed to get memory job status",
      argsSchema: z.tuple([projectIdSchema]),
      handler: (projectId: string) =>
        memoryMaintenanceService.getMemoryJobStatus(projectId),
    },
    {
      channel: IPC_CHANNELS.MEMORY_SEARCH_CHUNKS,
      logTag: "MEMORY_SEARCH_CHUNKS",
      failMessage: "Failed to search memory chunks",
      argsSchema: z.tuple([memoryChunkSearchSchema]),
      handler: (input: { projectId: string; query: string; limit?: number }) =>
        chunkSearchService.searchChunks(input),
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
      channel: IPC_CHANNELS.MEMORY_CONFLICT_REVIEW_ACTION,
      logTag: "MEMORY_CONFLICT_REVIEW_ACTION",
      failMessage: "Failed to update fact conflict review",
      argsSchema: z.tuple([memoryTemporalFactConflictReviewSchema]),
      handler: (input: MemoryTemporalFactConflictReviewInput) =>
        persistAfterUpdatedReviewMutation(input.projectId, "memory:fact-conflict-review", () =>
          narrativeMemoryQueryService.reviewFactConflict(input),
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
      handler: (chunkId: string) => chunkSearchService.getChunkBacklink(chunkId),
    },
    {
      channel: IPC_CHANNELS.MEMORY_GET_CHUNK_WINDOW,
      logTag: "MEMORY_GET_CHUNK_WINDOW",
      failMessage: "Failed to get memory chunk window",
      argsSchema: z.tuple([memoryChunkWindowSchema]),
      handler: (input: MemoryChunkWindowQuery) =>
        chunkSearchService.getChunkWindow(input),
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
  ]);
}
