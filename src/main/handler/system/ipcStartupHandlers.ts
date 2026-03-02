import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import { registerIpcHandlers } from "../core/ipcRegistrar.js";
import type { LoggerLike } from "../core/types.js";
import { startupReadinessService } from "../../services/features/startupReadinessService.js";

export function registerStartupIPCHandlers(logger: LoggerLike): void {
  registerIpcHandlers(logger, [
    {
      channel: IPC_CHANNELS.STARTUP_GET_READINESS,
      logTag: "STARTUP_GET_READINESS",
      failMessage: "Failed to fetch startup readiness",
      handler: async () => startupReadinessService.getReadiness(),
    },
    {
      channel: IPC_CHANNELS.STARTUP_COMPLETE_WIZARD,
      logTag: "STARTUP_COMPLETE_WIZARD",
      failMessage: "Failed to complete startup wizard",
      handler: async () => startupReadinessService.completeWizard(),
    },
  ]);
}
