import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import { registerIpcHandlers } from "../core/ipcRegistrar.js";
import { autoSaveArgsSchema } from "../../../shared/schemas/index.js";
import type { LoggerLike } from "../core/types.js";

type AutoSaveManagerLike = {
  triggerSave: (
    chapterId: string,
    content: string,
    projectId: string,
  ) => Promise<void>;
  flushAll: () => Promise<void>;
  getRuntimeStats?: () => unknown;
};

export function registerAutoSaveIPCHandlers(
  logger: LoggerLike,
  autoSaveManager: AutoSaveManagerLike,
): void {
  registerIpcHandlers(logger, [
    {
      channel: IPC_CHANNELS.AUTO_SAVE,
      logTag: "AUTO_SAVE",
      failMessage: "Failed to auto save",
      argsSchema: autoSaveArgsSchema,
      handler: async (
        chapterId: string,
        content: string,
        projectId: string,
      ) => {
        await autoSaveManager.triggerSave(chapterId, content, projectId);
        logger.info("AUTO_SAVE accepted", {
          chapterId,
          projectId,
          stats: autoSaveManager.getRuntimeStats?.(),
        });
        return { success: true };
      },
    },
    {
      channel: IPC_CHANNELS.MANUAL_SAVE,
      logTag: "MANUAL_SAVE",
      failMessage: "Failed to manual save",
      handler: async () => {
        await autoSaveManager.flushAll();
        logger.info("MANUAL_SAVE completed", {
          stats: autoSaveManager.getRuntimeStats?.(),
        });
        return { success: true };
      },
    },
  ]);
}
