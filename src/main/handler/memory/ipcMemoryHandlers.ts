import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import {
  chapterIdSchema,
  memoryBuildJobControlSchema,
  memoryChunkIdSchema,
  memoryChunkSearchSchema,
  memoryChunkWindowSchema,
  memoryEmbeddingStatusSchema,
  memoryEpisodeCalibrationRunSchema,
  memoryEvalFeedbackRecordSchema,
  memoryEvalRunSchema,
  memoryIntentCalibrationRunSchema,
  memoryNarrativeSummaryStatusSchema,
  memorySummaryStatusSchema,
  narrativeMemoryQuerySchema,
  projectIdSchema,
  rebuildMemoryChunksSchema,
} from "../../../shared/schemas/index.js";
import type {
  MemoryChunkWindowQuery,
  MemoryEpisodeCalibrationRequest,
  MemoryEvalFeedbackRecordRequest,
  MemoryEvalRunRequest,
  NarrativeMemoryIntentCalibrationRequest,
  NarrativeMemoryQueryInput,
} from "../../../shared/types/index.js";
import type {
  ChapterSummaryProjectorLike,
  EmbeddingProjectorLike,
  MemoryChunkSearchServiceLike,
  MemoryMaintenanceServiceLike,
  NarrativeMemoryQueryServiceLike,
  NarrativeSummaryStatusServiceLike,
} from "./types.js";
import {
  cancelMemoryBuildJobs,
  getMemoryBuildJobProgress,
  pauseMemoryBuildJobs,
  resumeMemoryBuildJobs,
} from "../../services/features/memory/jobControl.js";
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
): void {
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
      channel: IPC_CHANNELS.MEMORY_RUN_EVAL_SUITE,
      logTag: "MEMORY_RUN_EVAL_SUITE",
      failMessage: "Failed to run memory eval suite",
      argsSchema: z.tuple([memoryEvalRunSchema]),
      handler: (input: MemoryEvalRunRequest) =>
        narrativeMemoryQueryService.runEvalSuite(input),
    },
    {
      channel: IPC_CHANNELS.MEMORY_RECORD_EVAL_FEEDBACK,
      logTag: "MEMORY_RECORD_EVAL_FEEDBACK",
      failMessage: "Failed to record memory eval feedback",
      argsSchema: z.tuple([memoryEvalFeedbackRecordSchema]),
      handler: (input: MemoryEvalFeedbackRecordRequest) =>
        narrativeMemoryQueryService.recordEvalFeedback(input),
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
