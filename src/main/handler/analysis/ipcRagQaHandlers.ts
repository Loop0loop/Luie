import { BrowserWindow } from "electron";
import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import { ragQaRequestSchema, ragQaStopSchema } from "../../../shared/schemas/index.js";
import type { RagQaRequest } from "../../../shared/types/index.js";
import { registerIpcHandlers } from "../core/ipcRegistrar.js";
import type { LoggerLike } from "../core/types.js";
import { windowManager } from "../../manager/windowManager.js";
import { ServiceError } from "../../utils/serviceError.js";
import { ErrorCode } from "../../../shared/constants/errorCode.js";
import { z } from "zod";

type RagQaServiceLike = {
  ask: (input: RagQaRequest, window: BrowserWindow) => Promise<unknown>;
  stop: (runId?: string) => Promise<unknown> | unknown;
};

function resolveTargetWindow(): BrowserWindow | null {
  const mainWindow = windowManager.getMainWindow();
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;
  const focused = BrowserWindow.getFocusedWindow();
  if (focused && !focused.isDestroyed()) return focused;
  return BrowserWindow.getAllWindows().find((win) => !win.isDestroyed()) ?? null;
}

export function registerRagQaIPCHandlers(
  logger: LoggerLike,
  ragService: RagQaServiceLike,
): void {
  registerIpcHandlers(logger, [
    {
      channel: IPC_CHANNELS.RAG_QA_ASK,
      logTag: "RAG_QA_ASK",
      failMessage: "Failed to start RAG QA",
      argsSchema: z.tuple([ragQaRequestSchema]),
      handler: async (input: RagQaRequest) => {
        const targetWindow = resolveTargetWindow();
        if (!targetWindow) {
          throw new ServiceError(
            ErrorCode.ANALYSIS_INVALID_REQUEST,
            "윈도우를 찾을 수 없습니다.",
          );
        }
        try {
          return await ragService.ask(input, targetWindow);
        } catch (error) {
          const cause = error instanceof Error ? error.message : String(error);
          throw new ServiceError(
            ErrorCode.RAG_QA_FAILED,
            `Failed to start RAG QA: ${cause}`,
            {
              cause,
            },
          );
        }
      },
    },
    {
      channel: IPC_CHANNELS.RAG_QA_STOP,
      logTag: "RAG_QA_STOP",
      failMessage: "Failed to stop RAG QA",
      argsSchema: z.tuple([ragQaStopSchema.optional()]),
      handler: (input?: { runId?: string }) => ragService.stop(input?.runId),
    },
  ]);
}
