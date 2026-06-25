import type { BrowserWindow } from "electron";
import { createLogger } from "../../../../shared/logger/index.js";
import { manuscriptAnalysisService } from "../analysis/manuscriptAnalysisService.js";

const logger = createLogger("AnalysisSecurity");

/**
 * 보안 처리 유틸리티
 * - 윈도우 blur/close 시 자동 삭제
 * - 메모리 정리
 */
class AnalysisSecurity {
  private readonly registeredWindowIds = new Set<number>();

  /**
   * 보안 리스너 등록
   * 윈도우 close 시 분석 데이터 자동 삭제
   */
  registerSecurityListeners(window: BrowserWindow): void {
    if (window.isDestroyed()) {
      logger.warn(
        "Security listener registration skipped for destroyed window",
      );
      return;
    }

    if (this.registeredWindowIds.has(window.id)) {
      return;
    }
    this.registeredWindowIds.add(window.id);

    // 윈도우 close 이벤트
    window.once("close", () => {
      logger.info("Window close detected, clearing analysis data");
      manuscriptAnalysisService.stopAnalysis();
      manuscriptAnalysisService.clearAnalysisData();
      this.registeredWindowIds.delete(window.id);
    });

    window.once("closed", () => {
      this.registeredWindowIds.delete(window.id);
    });

    logger.info("Security listeners registered", { windowId: window.id });
  }

  /**
   * 민감 데이터 정리
   * 메모리에서 분석 결과 완전 삭제
   */
  clearSensitiveData(): void {
    try {
      manuscriptAnalysisService.clearAnalysisData();

      // 강제 GC 요청 (Node.js --expose-gc 필요)
      if (global.gc) {
        global.gc();
        logger.info("Forced garbage collection");
      }

      logger.info("Sensitive data cleared");
    } catch (error) {
      logger.error("Failed to clear sensitive data", { error });
    }
  }
}

export const analysisSecurity = new AnalysisSecurity();
