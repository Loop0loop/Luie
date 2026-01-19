import type { createLogger } from "../../../shared/logger/index.js";
import { registerSearchIPCHandlers } from "./ipcSearchHandlers.js";

type LoggerLike = ReturnType<typeof createLogger>;

export function registerSearchHandlers(options: {
  logger: LoggerLike;
  searchService: Parameters<typeof registerSearchIPCHandlers>[1];
}): void {
  registerSearchIPCHandlers(options.logger, options.searchService);
}
