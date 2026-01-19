import type { createLogger } from "../../../shared/logger/index.js";
import { registerFsIPCHandlers } from "./ipcFsHandlers.js";
import { registerLoggerIPCHandlers } from "./ipcLoggerHandlers.js";
import { registerSettingsIPCHandlers } from "./ipcSettingsHandlers.js";
import { registerWindowIPCHandlers } from "./ipcWindowHandlers.js";

type LoggerLike = ReturnType<typeof createLogger>;

export function registerSystemHandlers(options: { logger: LoggerLike }): void {
  registerLoggerIPCHandlers(options.logger);
  registerFsIPCHandlers(options.logger);
  registerWindowIPCHandlers(options.logger);
  registerSettingsIPCHandlers(options.logger);
}
