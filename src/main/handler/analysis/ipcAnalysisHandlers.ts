import { ipcMain, BrowserWindow } from "electron";
import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import type { AnalysisRequest } from "../../../shared/types/analysis.js";

import { analysisSecurity } from "../../services/features/analysis/analysisSecurity.js";
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
  /**
   * 분석 시작
   */
  ipcMain.handle(IPC_CHANNELS.ANALYSIS_START, async (event, request: AnalysisRequest) => {
    try {
      logger.info("ANALYSIS_START", { request });

      // API 키 검증
      const apiKeyValidation = analysisSecurity.validateAPIKey();
      if (!apiKeyValidation.valid) {
        return {
          success: false,
          error: {
            code: "API_KEY_MISSING",
            message: apiKeyValidation.message,
          },
        };
      }

      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) {
        return {
          success: false,
          error: {
            code: "INVALID_REQUEST",
            message: "윈도우를 찾을 수 없습니다.",
          },
        };
      }

      // 보안 리스너 등록
      analysisSecurity.registerSecurityListeners(window);

      await service.startAnalysis(request.chapterId, request.projectId, window);

      return { success: true };
    } catch (error) {
      logger.error("ANALYSIS_START failed", { error, request });
      return {
        success: false,
        error: {
          code: "UNKNOWN",
          message: "분석을 시작하는 중 오류가 발생했습니다.",
          details: error instanceof Error ? error.message : String(error),
        },
      };
    }
  });

  /**
   * 분석 중단
   */
  ipcMain.handle(IPC_CHANNELS.ANALYSIS_STOP, async () => {
    try {
      logger.info("ANALYSIS_STOP");
      service.stopAnalysis();
      return { success: true };
    } catch (error) {
      logger.error("ANALYSIS_STOP failed", { error });
      return {
        success: false,
        error: {
          code: "UNKNOWN",
          message: "분석 중단 중 오류가 발생했습니다.",
        },
      };
    }
  });

  /**
   * 분석 데이터 삭제 (보안)
   */
  ipcMain.handle(IPC_CHANNELS.ANALYSIS_CLEAR, async () => {
    try {
      logger.info("ANALYSIS_CLEAR");
      service.clearAnalysisData();
      analysisSecurity.clearSensitiveData();
      return { success: true };
    } catch (error) {
      logger.error("ANALYSIS_CLEAR failed", { error });
      return {
        success: false,
        error: {
          code: "UNKNOWN",
          message: "분석 데이터 삭제 중 오류가 발생했습니다.",
        },
      };
    }
  });

  logger.info("Analysis IPC handlers registered");
}
