import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import type { SearchQuery } from "../../../shared/types/index.js";
import { registerIpcHandlers } from "../core/ipcRegistrar.js";
import { searchQuerySchema } from "../../../shared/schemas/index.js";
import { z } from "zod";
import type { LoggerLike } from "../core/types.js";

type SearchServiceLike = {
  search: (input: SearchQuery) => Promise<unknown>;
};

export function registerSearchIPCHandlers(
  logger: LoggerLike,
  searchService: SearchServiceLike,
): void {
  registerIpcHandlers(logger, [
    {
      channel: IPC_CHANNELS.SEARCH,
      logTag: "SEARCH",
      failMessage: "Failed to search",
      argsSchema: z.tuple([searchQuerySchema]),
      handler: (input: SearchQuery) => searchService.search(input),
    },
  ]);
}
