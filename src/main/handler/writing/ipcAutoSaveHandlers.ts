import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import { registerIpcHandler } from "../core/ipcHandler.js";
import { autoSaveArgsSchema } from "../../../shared/schemas/index.js";

type LoggerLike = {
  error: (message: string, data?: unknown) => void;
};

type AutoSaveManagerLike = {
  triggerSave: (chapterId: string, content: string, projectId: string) => Promise<void>;
};

export function registerAutoSaveIPCHandlers(
  logger: LoggerLike,
  autoSaveManager: AutoSaveManagerLike,
): void {
  registerIpcHandler({
    logger,
    channel: IPC_CHANNELS.AUTO_SAVE,
    logTag: "AUTO_SAVE",
    failMessage: "Failed to auto save",
    argsSchema: autoSaveArgsSchema,
    handler: async (chapterId: string, content: string, projectId: string) => {
      await autoSaveManager.triggerSave(chapterId, content, projectId);
      return { success: true };
    },
  });
}
