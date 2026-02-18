import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import { registerIpcHandlers } from "../core/ipcRegistrar.js";
import type { LoggerLike } from "../core/types.js";
import { syncSetAutoArgsSchema } from "../../../shared/schemas/index.js";
import { syncService } from "../../services/features/syncService.js";

export function registerSyncIPCHandlers(logger: LoggerLike): void {
  registerIpcHandlers(logger, [
    {
      channel: IPC_CHANNELS.SYNC_GET_STATUS,
      logTag: "SYNC_GET_STATUS",
      failMessage: "Failed to get sync status",
      handler: async () => syncService.getStatus(),
    },
    {
      channel: IPC_CHANNELS.SYNC_CONNECT_GOOGLE,
      logTag: "SYNC_CONNECT_GOOGLE",
      failMessage: "Failed to start Google sync connect",
      handler: async () => syncService.connectGoogle(),
    },
    {
      channel: IPC_CHANNELS.SYNC_DISCONNECT,
      logTag: "SYNC_DISCONNECT",
      failMessage: "Failed to disconnect sync account",
      handler: async () => syncService.disconnect(),
    },
    {
      channel: IPC_CHANNELS.SYNC_RUN_NOW,
      logTag: "SYNC_RUN_NOW",
      failMessage: "Failed to run sync",
      handler: async () => syncService.runNow(),
    },
    {
      channel: IPC_CHANNELS.SYNC_SET_AUTO,
      logTag: "SYNC_SET_AUTO",
      failMessage: "Failed to update auto sync setting",
      argsSchema: syncSetAutoArgsSchema,
      handler: async (settings: { enabled: boolean }) =>
        syncService.setAutoSync(settings.enabled),
    },
  ]);
}
