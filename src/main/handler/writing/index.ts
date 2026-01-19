import type { createLogger } from "../../../shared/logger/index.js";
import { registerAutoSaveIPCHandlers } from "./ipcAutoSaveHandlers.js";
import { registerSnapshotIPCHandlers } from "./ipcSnapshotHandlers.js";

type LoggerLike = ReturnType<typeof createLogger>;

export function registerWritingHandlers(options: {
  logger: LoggerLike;
  autoSaveManager: Parameters<typeof registerAutoSaveIPCHandlers>[1];
  snapshotService: Parameters<typeof registerSnapshotIPCHandlers>[1];
}): void {
  registerAutoSaveIPCHandlers(options.logger, options.autoSaveManager);
  registerSnapshotIPCHandlers(options.logger, options.snapshotService);
}
