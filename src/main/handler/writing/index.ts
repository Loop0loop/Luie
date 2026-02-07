import { registerAutoSaveIPCHandlers } from "./ipcAutoSaveHandlers.js";
import { registerSnapshotIPCHandlers } from "./ipcSnapshotHandlers.js";
import { registerExportHandlers } from "./ipcExportHandlers.js";
import type { AppLogger } from "../core/types.js";

export function registerWritingHandlers(options: {
  logger: AppLogger;
  autoSaveManager: Parameters<typeof registerAutoSaveIPCHandlers>[1];
  snapshotService: Parameters<typeof registerSnapshotIPCHandlers>[1];
}): void {
  registerAutoSaveIPCHandlers(options.logger, options.autoSaveManager);
  registerSnapshotIPCHandlers(options.logger, options.snapshotService);
  registerExportHandlers();
}
