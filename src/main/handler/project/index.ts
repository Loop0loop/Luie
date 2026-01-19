import type { createLogger } from "../../../shared/logger/index.js";
import { registerChapterIPCHandlers } from "./ipcChapterHandlers.js";
import { registerProjectIPCHandlers } from "./ipcProjectHandlers.js";

type LoggerLike = ReturnType<typeof createLogger>;

export function registerProjectHandlers(options: {
  logger: LoggerLike;
  projectService: Parameters<typeof registerProjectIPCHandlers>[1];
  chapterService: Parameters<typeof registerChapterIPCHandlers>[1];
}): void {
  registerProjectIPCHandlers(options.logger, options.projectService);
  registerChapterIPCHandlers(options.logger, options.chapterService);
}
