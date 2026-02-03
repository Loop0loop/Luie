import { registerChapterIPCHandlers } from "./ipcChapterHandlers.js";
import { registerProjectIPCHandlers } from "./ipcProjectHandlers.js";
import type { AppLogger } from "../core/types.js";

export function registerProjectHandlers(options: {
  logger: AppLogger;
  projectService: Parameters<typeof registerProjectIPCHandlers>[1];
  chapterService: Parameters<typeof registerChapterIPCHandlers>[1];
}): void {
  registerProjectIPCHandlers(options.logger, options.projectService);
  registerChapterIPCHandlers(options.logger, options.chapterService);
}
