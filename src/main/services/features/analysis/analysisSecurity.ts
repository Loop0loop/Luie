import type { BrowserWindow } from "electron";
import { createLogger } from "../../../../shared/logger/index.js";
import { manuscriptAnalysisService } from "../manuscriptAnalysisService.js";

const logger = createLogger("AnalysisSecurity");

/**
 * 보안 처리 유틸리티
 * - 윈도우 blur/close 시 자동 삭제
 * - API 키 검증
 * - 메모리 정리
 */
class AnalysisSecurity {
  private isListenerRegistered = false;

  /**
   * 보안 리스너 등록
   * 윈도우 blur/close 시 분석 데이터 자동 삭제
   */
  registerSecurityListeners(window: BrowserWindow): void {
    if (this.isListenerRegistered) {
      logger.warn("Security listeners already registered");
      return;
    }

    // 윈도우 blur (포커스 잃음) 이벤트
    window.on("blur", () => {
      // 분석 중에는 blur 이벤트 무시 (사용자가 다른 창을 봐야 할 수 있음)
      if (manuscriptAnalysisService.isAnalysisInProgress()) {
        logger.info("Window blur detected during analysis, ignoring clear");
        return;
      }
      
      logger.info("Window blur detected, clearing analysis data");
      manuscriptAnalysisService.clearAnalysisData();
    });

    // 윈도우 close 이벤트
    window.on("close", () => {
      logger.info("Window close detected, clearing analysis data");
      manuscriptAnalysisService.stopAnalysis();
      manuscriptAnalysisService.clearAnalysisData();
    });

    this.isListenerRegistered = true;
    logger.info("Security listeners registered");
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

  /**
   * Gemini API 키 검증
   */
  validateAPIKey(): { valid: boolean; message: string } {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return {
        valid: false,
        message: "GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.",
      };
    }

    if (apiKey.length < 20) {
      return {
        valid: false,
        message: "GEMINI_API_KEY가 유효하지 않습니다 (너무 짧음).",
      };
    }

    return {
      valid: true,
      message: "API 키가 유효합니다.",
    };
  }

  /**
   * 네트워크 요청 제한 확인
   * Gemini API 외 외부 전송 차단
   */
  isAllowedRequest(url: string): boolean {
    const allowedDomains = [
      "generativelanguage.googleapis.com",
      "googleapis.com",
    ];

    try {
      const urlObj = new URL(url);
      return allowedDomains.some((domain) => urlObj.hostname.includes(domain));
    } catch {
      return false;
    }
  }
}

export const analysisSecurity = new AnalysisSecurity();
