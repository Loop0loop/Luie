import { BrowserWindow } from "electron";
import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import { ErrorCode } from "../../../shared/constants/errorCode.js";
import type { AnalysisRequest } from "../../../shared/types/analysis.js";
import { analysisStartArgsSchema } from "../../../shared/schemas/index.js";
import { analysisSecurity } from "../../services/features/analysis/analysisSecurity.js";
import { registerIpcHandlers } from "../core/ipcRegistrar.js";
import type { LoggerLike } from "../core/types.js";
import { ServiceError } from "../../utils/serviceError.js";
import { windowManager } from "../../manager/windowManager.js";

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
    const mainWindow = windowManager.getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      return mainWindow;
    }

    const focused = BrowserWindow.getFocusedWindow();
    if (focused && !focused.isDestroyed()) {
      return focused;
    }

    return (
      BrowserWindow.getAllWindows().find((win) => !win.isDestroyed()) ?? null
    );
  };

  const throwIpcError = (
    code: (typeof ErrorCode)[keyof typeof ErrorCode],
    message: string,
    details?: Record<string, unknown>,
  ): never => {
    throw new ServiceError(code, message, details);
  };

  registerIpcHandlers(logger, [
    {
      channel: IPC_CHANNELS.ANALYSIS_START,
      logTag: "ANALYSIS_START",
      failMessage: "분석을 시작하는 중 오류가 발생했습니다.",
      argsSchema: analysisStartArgsSchema,
      handler: async (request: AnalysisRequest) => {
        logger.info("ANALYSIS_START", { request });

        const apiKeyValidation = analysisSecurity.validateAPIKey();
        if (!apiKeyValidation.valid) {
          throwIpcError(ErrorCode.ANALYSIS_API_KEY_MISSING, apiKeyValidation.message);
        }

        const targetWindow = resolveAnalysisWindow();
        if (!targetWindow) {
          throwIpcError(
            ErrorCode.ANALYSIS_INVALID_REQUEST,
            "윈도우를 찾을 수 없습니다.",
          );
        }

        analysisSecurity.registerSecurityListeners(targetWindow);
        await service.startAnalysis(request.chapterId, request.projectId, targetWindow);

        return true;
      },
    },
    {
      channel: IPC_CHANNELS.ANALYSIS_STOP,
      logTag: "ANALYSIS_STOP",
      failMessage: "분석 중단 중 오류가 발생했습니다.",
      handler: () => {
        logger.info("ANALYSIS_STOP");
        service.stopAnalysis();
        return true;
      },
    },
    {
      channel: IPC_CHANNELS.ANALYSIS_CLEAR,
      logTag: "ANALYSIS_CLEAR",
      failMessage: "분석 데이터 삭제 중 오류가 발생했습니다.",
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
