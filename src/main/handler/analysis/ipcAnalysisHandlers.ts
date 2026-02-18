import { BrowserWindow } from "electron";
import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import type { AnalysisRequest } from "../../../shared/types/analysis.js";
import { analysisStartArgsSchema } from "../../../shared/schemas/index.js";
import { analysisSecurity } from "../../services/features/analysis/analysisSecurity.js";
import { registerIpcHandlers } from "../core/ipcRegistrar.js";
import type { LoggerLike } from "../core/types.js";

type ManuscriptAnalysisServiceLike = {
  startAnalysis: (
    chapterId: string,
    projectId: string,
    window: BrowserWindow
  ) => Promise<void>;
  stopAnalysis: () => void;
  clearAnalysisData: () => void;
};

export function registerAnalysisIPCHandlers(
  logger: LoggerLike,
  service: ManuscriptAnalysisServiceLike
): void {
  const resolveAnalysisWindow = (): BrowserWindow | null => {
    const focused = BrowserWindow.getFocusedWindow();
    if (focused && !focused.isDestroyed()) {
      return focused;
    }

    return (
      BrowserWindow.getAllWindows().find((win) => !win.isDestroyed()) ?? null
    );
  };

  const throwIpcError = (
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ): never => {
    throw { code, message, details };
  };

  registerIpcHandlers(logger, [
    {
      channel: IPC_CHANNELS.ANALYSIS_START,
      logTag: "ANALYSIS_START",
      failMessage: "Failed to start analysis",
      argsSchema: analysisStartArgsSchema,
      handler: async (request: AnalysisRequest) => {
        logger.info("ANALYSIS_START", { request });

        const apiKeyValidation = analysisSecurity.validateAPIKey();
        if (!apiKeyValidation.valid) {
          throwIpcError("API_KEY_MISSING", apiKeyValidation.message);
        }

        const targetWindow = resolveAnalysisWindow();
        if (!targetWindow) {
          throwIpcError("INVALID_REQUEST", "윈도우를 찾을 수 없습니다.");
        }

        const activeWindow = targetWindow as BrowserWindow;
        analysisSecurity.registerSecurityListeners(activeWindow);
        await service.startAnalysis(request.chapterId, request.projectId, activeWindow);

        return true;
      },
    },
    {
      channel: IPC_CHANNELS.ANALYSIS_STOP,
      logTag: "ANALYSIS_STOP",
      failMessage: "Failed to stop analysis",
      handler: () => {
        logger.info("ANALYSIS_STOP");
        service.stopAnalysis();
        return true;
      },
    },
    {
      channel: IPC_CHANNELS.ANALYSIS_CLEAR,
      logTag: "ANALYSIS_CLEAR",
      failMessage: "Failed to clear analysis data",
      handler: () => {
        logger.info("ANALYSIS_CLEAR");
        service.clearAnalysisData();
        analysisSecurity.clearSensitiveData();
        return true;
      },
    },
  ]);

  logger.info("Analysis IPC handlers registered");
}
