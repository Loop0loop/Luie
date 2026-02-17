import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import type { LoggerLike } from "../core/types.js";
import { dbRecoveryService } from "../../services/features/dbRecoveryService.js";
import { registerIpcHandlers } from "../core/ipcRegistrar.js";
import { recoveryRunDbArgsSchema } from "../../../shared/schemas/index.js";

export function registerRecoveryIPCHandlers(logger: LoggerLike): void {
  registerIpcHandlers(logger, [
    {
      channel: IPC_CHANNELS.RECOVERY_DB_RUN,
      logTag: "RECOVERY_DB_RUN",
      failMessage: "Failed to run DB recovery",
      argsSchema: recoveryRunDbArgsSchema,
      handler: async (options?: { dryRun?: boolean }) => {
        logger.info("RECOVERY_DB_RUN", { options });
        return dbRecoveryService.recoverFromWal(options);
      },
    },
  ]);
}
