import type { BrowserWindow } from "electron";
import { createLogger } from "../../../../shared/logger/index.js";
import { manuscriptAnalysisService } from "../analysis/manuscriptAnalysisService.js";

const logger = createLogger("AnalysisSecurity");

class AnalysisSecurity {
  private readonly registeredWindowIds = new Set<number>();

  /** window 종료 시 분석 결과가 메모리에 남지 않도록 정리 listener를 등록한다. */
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

  /** 분석 결과를 메모리에서 제거하고 가능한 경우 즉시 GC한다. */
  clearSensitiveData(): void {
    try {
      manuscriptAnalysisService.clearAnalysisData();

      // NOTE: --expose-gc 환경에서만 분석 window memory를 즉시 회수한다.
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
