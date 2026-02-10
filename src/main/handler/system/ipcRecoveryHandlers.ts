import { ipcMain } from "electron";
import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import type { LoggerLike } from "../core/types.js";
import { dbRecoveryService } from "../../services/features/dbRecoveryService.js";

export function registerRecoveryIPCHandlers(logger: LoggerLike): void {
  ipcMain.handle(IPC_CHANNELS.RECOVERY_DB_RUN, async (_event, options?: { dryRun?: boolean }) => {
    try {
      logger.info("RECOVERY_DB_RUN", { options });
      const result = await dbRecoveryService.recoverFromWal(options);
      return { success: true, data: result };
    } catch (error) {
      logger.error("RECOVERY_DB_RUN failed", { error });
      return {
        success: false,
        error: {
          code: "RECOVERY_FAILED",
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  });
}
