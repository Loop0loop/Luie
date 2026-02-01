import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import type { SearchQuery } from "../../../shared/types/index.js";
import { registerIpcHandler } from "../core/ipcHandler.js";
import { projectIdSchema, searchQuerySchema } from "../../../shared/schemas/index.js";
import { z } from "zod";

type LoggerLike = {
  error: (message: string, data?: unknown) => void;
};

type SearchServiceLike = {
  search: (input: SearchQuery) => Promise<unknown>;
  getQuickAccess: (projectId: string) => Promise<unknown>;
};

export function registerSearchIPCHandlers(
  logger: LoggerLike,
  searchService: SearchServiceLike,
): void {
  registerIpcHandler({
    logger,
    channel: IPC_CHANNELS.SEARCH,
    logTag: "SEARCH",
    failMessage: "Failed to search",
    argsSchema: z.tuple([searchQuerySchema]),
    handler: (input: SearchQuery) => searchService.search(input),
  });

  registerIpcHandler({
    logger,
    channel: "search:quick-access",
    logTag: "SEARCH_QUICK_ACCESS",
    failMessage: "Failed to get quick access",
    argsSchema: z.tuple([projectIdSchema]),
    handler: (projectId: string) => searchService.getQuickAccess(projectId),
  });
}
