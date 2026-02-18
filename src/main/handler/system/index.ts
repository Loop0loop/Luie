import { registerFsIPCHandlers } from "./ipcFsHandlers.js";
import { registerLoggerIPCHandlers } from "./ipcLoggerHandlers.js";
import { registerRecoveryIPCHandlers } from "./ipcRecoveryHandlers.js";
import { registerSettingsIPCHandlers } from "./ipcSettingsHandlers.js";
import { registerSyncIPCHandlers } from "./ipcSyncHandlers.js";
import { registerWindowIPCHandlers } from "./ipcWindowHandlers.js";
import type { AppLogger } from "../core/types.js";
export function registerSystemHandlers(options: { logger: AppLogger }): void {
  registerLoggerIPCHandlers(options.logger);
  registerFsIPCHandlers(options.logger);
  registerWindowIPCHandlers(options.logger);
  registerSettingsIPCHandlers(options.logger);
  registerRecoveryIPCHandlers(options.logger);
  registerSyncIPCHandlers(options.logger);
}
