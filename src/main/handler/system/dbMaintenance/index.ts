import { IPC_CHANNELS } from "../../../../shared/ipc/channels.js";
import { registerIpcHandlers } from "../../core/ipcRegistrar.js";
import type { LoggerLike } from "../../core/types.js";
import { z } from "zod";

type DbMaintenanceServiceLike = {
  runIntegrityCheck: () => Promise<unknown>;
  getMigrationHealth: () => Promise<unknown>;
};

export function registerDbMaintenanceIPCHandlers(
  logger: LoggerLike,
  dbMaintenanceService: DbMaintenanceServiceLike,
): void {
  registerIpcHandlers(logger, [
    {
      channel: IPC_CHANNELS.DB_RUN_INTEGRITY_CHECK,
      logTag: "DB_RUN_INTEGRITY_CHECK",
      failMessage: "Failed to run integrity check",
      argsSchema: z.tuple([]),
      handler: () => dbMaintenanceService.runIntegrityCheck(),
    },
    {
      channel: IPC_CHANNELS.DB_GET_MIGRATION_HEALTH,
      logTag: "DB_GET_MIGRATION_HEALTH",
      failMessage: "Failed to get migration health",
      argsSchema: z.tuple([]),
      handler: () => dbMaintenanceService.getMigrationHealth(),
    },
  ]);
}
