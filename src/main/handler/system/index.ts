import { registerDbMaintenanceIPCHandlers } from "./dbMaintenance/index.js";
import { registerFsIPCHandlers } from "./fs/index.js";
import { registerLoggerIPCHandlers } from "./logger/index.js";
import { registerPluginIPCHandlers } from "./plugin/index.js";
import { registerRecoveryIPCHandlers } from "./recovery/index.js";
import { registerSettingsIPCHandlers } from "./settings/index.js";
import { registerStartupIPCHandlers } from "./startup/index.js";
import { registerSyncIPCHandlers } from "./sync/index.js";
import { registerWindowIPCHandlers } from "./window/index.js";
import type { AppLogger } from "../core/types.js";
export function registerSystemHandlers(options: {
  logger: AppLogger;
  dbMaintenanceService: Parameters<typeof registerDbMaintenanceIPCHandlers>[1];
  graphPluginService: Parameters<typeof registerPluginIPCHandlers>[1];
}): void {
  registerDbMaintenanceIPCHandlers(options.logger, options.dbMaintenanceService);
  registerLoggerIPCHandlers(options.logger);
  registerFsIPCHandlers(options.logger);
  registerWindowIPCHandlers(options.logger);
  registerSettingsIPCHandlers(options.logger);
  registerStartupIPCHandlers(options.logger);
  registerRecoveryIPCHandlers(options.logger);
  registerSyncIPCHandlers(options.logger);
  registerPluginIPCHandlers(options.logger, options.graphPluginService);
}
