import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import {
  projectIdSchema,
  searchQuerySchema,
} from "../../../shared/schemas/index.js";
import type { SearchQuery } from "../../../shared/types/index.js";
import { registerIpcHandlers } from "../core/ipcRegistrar.js";
import type { LoggerLike } from "../core/types.js";
import { z } from "zod";

type SearchServiceLike = {
  search: (input: SearchQuery) => Promise<unknown>;
};

type SearchMaintenanceServiceLike = {
  getSearchIndexStatus: (projectId: string) => Promise<unknown>;
  rebuildSearchIndex: (projectId: string) => Promise<unknown>;
};

export function registerSearchIPCHandlers(
  logger: LoggerLike,
  searchService: SearchServiceLike,
  searchMaintenanceService: SearchMaintenanceServiceLike,
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
        searchMaintenanceService.getSearchIndexStatus(projectId),
    },
    {
      channel: IPC_CHANNELS.SEARCH_REBUILD_INDEX,
      logTag: "SEARCH_REBUILD_INDEX",
      failMessage: "Failed to rebuild search index",
      argsSchema: z.tuple([projectIdSchema]),
      handler: (projectId: string) =>
        searchMaintenanceService.rebuildSearchIndex(projectId),
    },
  ]);
}
