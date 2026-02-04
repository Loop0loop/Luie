import { registerSearchIPCHandlers } from "./ipcSearchHandlers.js";
import type { AppLogger } from "../core/types.js";

export function registerSearchHandlers(options: {
  logger: AppLogger;
  searchService: Parameters<typeof registerSearchIPCHandlers>[1];
}): void {
  registerSearchIPCHandlers(options.logger, options.searchService);
}
