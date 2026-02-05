import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import { registerIpcHandlers } from "../core/ipcRegistrar.js";
import { autoSaveArgsSchema } from "../../../shared/schemas/index.js";
import type { LoggerLike } from "../core/types.js";

type AutoSaveManagerLike = {
  triggerSave: (chapterId: string, content: string, projectId: string) => Promise<void>;
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
      handler: async (chapterId: string, content: string, projectId: string) => {
        await autoSaveManager.triggerSave(chapterId, content, projectId);
        return { success: true };
      },
    },
  ]);
}
