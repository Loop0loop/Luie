import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import type { NarrativeMemoryQueryInput, SearchQuery } from "../../../shared/types/index.js";
import { registerIpcHandlers } from "../core/ipcRegistrar.js";
import {
  chapterIdSchema,
  memoryChunkIdSchema,
  memoryChunkSearchSchema,
  memoryEmbeddingStatusSchema,
  memorySummaryStatusSchema,
  narrativeMemoryQuerySchema,
  projectIdSchema,
  rebuildMemoryChunksSchema,
  searchQuerySchema,
} from "../../../shared/schemas/index.js";
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
};

type NarrativeMemoryQueryServiceLike = {
  query: (input: NarrativeMemoryQueryInput) => Promise<unknown>;
};

type ChapterSummaryProjectorLike = {
  getChapterSummary: (chapterId: string) => Promise<unknown>;
  getSummaryStatus: (projectId: string) => Promise<unknown>;
};

type EmbeddingProjectorLike = {
  getEmbeddingStatus: (projectId: string) => Promise<unknown>;
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
): void {
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
      handler: (input: { projectId: string; sourceType?: string; sourceId?: string }) =>
        dbMaintenanceService.rebuildMemoryChunks(input),
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
      channel: IPC_CHANNELS.MEMORY_GET_CHUNK_BACKLINK,
      logTag: "MEMORY_GET_CHUNK_BACKLINK",
      failMessage: "Failed to get memory chunk backlink",
      argsSchema: z.tuple([memoryChunkIdSchema]),
      handler: (chunkId: string) => searchService.getChunkBacklink(chunkId),
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
      channel: IPC_CHANNELS.MEMORY_GET_EMBEDDING_STATUS,
      logTag: "MEMORY_GET_EMBEDDING_STATUS",
      failMessage: "Failed to get embedding status",
      argsSchema: z.tuple([memoryEmbeddingStatusSchema]),
      handler: (input: { projectId: string }) =>
        embeddingProjector.getEmbeddingStatus(input.projectId),
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
