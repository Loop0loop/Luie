import { registerFsIPCHandlers } from "./ipcFsHandlers.js";
import { registerHapticIPCHandlers } from "./ipcHapticHandlers.js";
import { registerLoggerIPCHandlers } from "./ipcLoggerHandlers.js";
import { registerPluginIPCHandlers } from "./ipcPluginHandlers.js";
import { registerRecoveryIPCHandlers } from "./ipcRecoveryHandlers.js";
import { registerSettingsIPCHandlers } from "./ipcSettingsHandlers.js";
import { registerStartupIPCHandlers } from "./ipcStartupHandlers.js";
import { registerSyncIPCHandlers } from "./ipcSyncHandlers.js";
import { registerWindowIPCHandlers } from "./ipcWindowHandlers.js";
import type { AppLogger } from "../core/types.js";
export function registerSystemHandlers(options: {
  logger: AppLogger;
  graphPluginService: Parameters<typeof registerPluginIPCHandlers>[1];
}): void {
  registerLoggerIPCHandlers(options.logger);
  registerFsIPCHandlers(options.logger);
  registerWindowIPCHandlers(options.logger);
  registerHapticIPCHandlers(options.logger);
  registerSettingsIPCHandlers(options.logger);
  registerStartupIPCHandlers(options.logger);
  registerRecoveryIPCHandlers(options.logger);
  registerSyncIPCHandlers(options.logger);
  registerPluginIPCHandlers(options.logger, options.graphPluginService);
}
