import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { createLogger } from "../../../shared/logger/index.js";
import { db } from "../../database/index.js";
import { manuscriptAnalyzer } from "../../core/manuscriptAnalyzer.js";
import {
  ANALYSIS_SYSTEM_INSTRUCTION,
  ANALYSIS_FEW_SHOT_EXAMPLES,
  GEMINI_ANALYSIS_RESPONSE_SCHEMA,
  formatAnalysisContext,
  AnalysisItemSchema,
  type AnalysisItemResult,
} from "./analysis/analysisPrompt.js";
import type { AnalysisItem, AnalysisContext } from "../../../shared/types/analysis.js";
import type { Chapter, Character, Term } from "../../../shared/types/index.js";
import type { BrowserWindow } from "electron";

const logger = createLogger("ManuscriptAnalysisService");
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3-flash-preview";

/**
 * 원고 분석 서비스
 * Gemini API를 활용한 실시간 스트리밍 분석
 */
class ManuscriptAnalysisService {
  private isAnalyzing = false;
  private currentWindow: BrowserWindow | null = null;
  private analysisCache: Map<string, AnalysisItem[]> = new Map();

  /**
   * 분석 시작
   */
  async startAnalysis(
    chapterId: string,
    projectId: string,
    window: BrowserWindow
  ): Promise<void> {
    if (this.isAnalyzing) {
      logger.warn("Analysis already in progress");
      throw new Error("Analysis already in progress");
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.error("GEMINI_API_KEY not set");
      throw new Error("GEMINI_API_KEY not found in environment variables");
    }

    this.isAnalyzing = true;
    this.currentWindow = window;

    logger.info("Window assigned for analysis", {
      hasWindow: !!this.currentWindow,
      isDestroyed: this.currentWindow?.isDestroyed(),
      windowId: this.currentWindow?.id,
    });

    try {
      // 1. DB에서 데이터 조회
      const [chapter, characters, terms] = await Promise.all([
        db.getClient().chapter.findUnique({
          where: { id: chapterId },
        }),
        db.getClient().character.findMany({
          where: { projectId },
          select: { name: true, description: true },
        }),
        db.getClient().term.findMany({
          where: { projectId },
          select: { term: true, definition: true, category: true },
        }),
      ]);

      if (!chapter) {
        throw new Error(`Chapter not found: ${chapterId}`);
      }

      // 2. 분석 컨텍스트 구성
      const context = manuscriptAnalyzer.buildAnalysisContext(
        chapter as unknown as Chapter,
        characters as unknown as Character[],
        terms as unknown as Term[]
      );

      // 3. Gemini 스트리밍 분석
      await this.streamAnalysisWithGemini(context, chapterId, apiKey);

      logger.info("Analysis completed", { chapterId, projectId });
    } catch (error) {
      logger.error("Analysis failed", { chapterId, projectId, error });
      this.isAnalyzing = false;
      throw error;
    } finally {
      this.isAnalyzing = false;
    }
  }

  /**
   * 분석 중단
   */
  stopAnalysis(): void {
    if (!this.isAnalyzing) {
      logger.warn("No analysis in progress");
      return;
    }

    this.isAnalyzing = false;
    this.currentWindow = null;
    logger.info("Analysis stopped by user");
  }

  /**
   * 분석 데이터 삭제 (보안)
   */
  clearAnalysisData(): void {
    logger.info("clearAnalysisData called", {
      hadWindow: !!this.currentWindow,
      windowId: this.currentWindow?.id,
      isAnalyzing: this.isAnalyzing,
      stackTrace: new Error().stack?.split('\n').slice(1, 4).join('\n'),
    });
    
    this.analysisCache.clear();
    this.currentWindow = null;
    logger.info("Analysis data cleared");
  }

  /**
   * Gemini API 스트리밍 호출
   */
  private async streamAnalysisWithGemini(
    context: AnalysisContext,
    chapterId: string,
    apiKey: string
  ): Promise<void> {
    const genAI = new GoogleGenAI({ apiKey });

    const prompt = `${ANALYSIS_SYSTEM_INSTRUCTION}

${ANALYSIS_FEW_SHOT_EXAMPLES}

---

${formatAnalysisContext(context)}`;

    const items: AnalysisItem[] = [];
    let itemCounter = 0;

    // 사용 가능한 모델 목록 (fallback)
    const modelCandidates = [
      GEMINI_MODEL,
      process.env.ALTERNATIVE_GEMINI_MODEL,
    ].filter((model): model is string => Boolean(model));

    logger.info("Starting Gemini analysis", {
      chapterId,
      models: modelCandidates,
      promptLength: prompt.length,
    });

    try {
      let result: Awaited<ReturnType<typeof genAI.models.generateContent>> | null = null;
      let usedModel = "";

      // 모델 fallback 시도
      for (const model of modelCandidates) {
        try {
          logger.info("Trying Gemini model", { model });
          
          result = await genAI.models.generateContent({
            model,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
              responseMimeType: "application/json",
              responseSchema: GEMINI_ANALYSIS_RESPONSE_SCHEMA,
            },
          });
          
          usedModel = model;
          logger.info("Gemini model responded successfully", { model });
          break;
        } catch (modelError) {
          const status = modelError && typeof modelError === "object" && "status" in modelError
            ? (modelError as { status: number }).status
            : undefined;

          const isRetryable = status === 404 || status === 429 || status === 503;
          const hasNext = model !== modelCandidates[modelCandidates.length - 1];

          logger.warn("Gemini model failed", {
            model,
            status,
            isRetryable,
            hasNext,
            error: modelError instanceof Error ? modelError.message : String(modelError),
          });

          if (isRetryable && hasNext) {
            continue;
          }

          throw modelError;
        }
      }

      if (!result) {
        throw new Error("No available Gemini model responded");
      }

      logger.info("Gemini response received", { usedModel });

      // 응답 파싱 및 검증
      const responseText = result.text ?? "";
      
      logger.info("Parsing Gemini response", {
        responseLength: responseText.length,
        preview: responseText.slice(0, 200),
      });
      
      // JSON 배열 또는 단일 객체 처리
      let parsedItems: AnalysisItemResult[] = [];
      
      try {
        const parsed = JSON.parse(responseText);
        parsedItems = Array.isArray(parsed) ? parsed : [parsed];
        logger.info("Parsed items count", { count: parsedItems.length });
      } catch (parseError) {
        logger.error("Failed to parse Gemini response", { error: parseError, responseText });
        throw new Error("Invalid JSON response from Gemini");
      }

      // 각 아이템 검증 및 전송
      for (const itemData of parsedItems) {
        try {
          const validated = AnalysisItemSchema.parse(itemData);
          
          const item: AnalysisItem = {
            id: `analysis-${++itemCounter}`,
            type: validated.type,
            content: validated.content,
            quote: validated.quote,
            contextId: validated.contextId,
          };

          items.push(item);

          // 스트리밍 이벤트 전송
          logger.info("Attempting to send stream item", {
            itemId: item.id,
            type: item.type,
            hasCurrentWindow: !!this.currentWindow,
            isDestroyed: this.currentWindow?.isDestroyed(),
            windowId: this.currentWindow?.id,
          });
          
          if (this.currentWindow && !this.currentWindow.isDestroyed()) {
            logger.info("Sending stream item to window", { itemId: item.id });
            this.currentWindow.webContents.send("analysis:stream", {
              item,
              done: false,
            });
            logger.info("Stream item sent successfully", { itemId: item.id });
          } else {
            logger.error("Window not available for streaming - CRITICAL", {
              hasWindow: !!this.currentWindow,
              isDestroyed: this.currentWindow?.isDestroyed(),
              windowId: this.currentWindow?.id,
              itemId: item.id,
            });
          }
        } catch (validationError) {
          logger.warn("Invalid analysis item, skipping", { error: validationError, itemData });
        }
      }

      // 완료 이벤트 전송
      logger.info("Attempting to send completion event", {
        hasCurrentWindow: !!this.currentWindow,
        isDestroyed: this.currentWindow?.isDestroyed(),
        windowId: this.currentWindow?.id,
      });
      
      if (this.currentWindow && !this.currentWindow.isDestroyed()) {
        logger.info("Sending completion event to window");
        this.currentWindow.webContents.send("analysis:stream", {
          item: null,
          done: true,
        });
        logger.info("Completion event sent successfully");
      } else {
        logger.error("Window not available for completion event - CRITICAL", {
          hasWindow: !!this.currentWindow,
          isDestroyed: this.currentWindow?.isDestroyed(),
          windowId: this.currentWindow?.id,
        });
      }

      // 캐시 저장 (보안 삭제용)
      this.analysisCache.set(chapterId, items);

      logger.info("Streaming analysis completed", {
        chapterId,
        itemCount: items.length,
      });
    } catch (error) {
      logger.error("Gemini streaming failed", { error });
      
      // 에러 타입 감지
      let errorCode: "API_KEY_MISSING" | "NETWORK_ERROR" | "QUOTA_EXCEEDED" | "INVALID_REQUEST" | "UNKNOWN" = "UNKNOWN";
      let errorMessage = "분석 중 오류가 발생했습니다.";
      
      if (error && typeof error === "object" && "status" in error) {
        const apiError = error as { status: number; message?: string };
        
        if (apiError.status === 429) {
          errorCode = "QUOTA_EXCEEDED";
          errorMessage = "Gemini API 할당량을 초과했습니다. 잠시 후 다시 시도해주세요.";
        } else if (apiError.status >= 500) {
          errorCode = "NETWORK_ERROR";
          errorMessage = "Gemini API 서버 오류가 발생했습니다.";
        } else if (apiError.status === 400) {
          errorCode = "INVALID_REQUEST";
          errorMessage = "잘못된 요청입니다. 원고 내용을 확인해주세요.";
        }
      }
      
      // 에러 이벤트 전송
      if (this.currentWindow && !this.currentWindow.isDestroyed()) {
        this.currentWindow.webContents.send("analysis:error", {
          code: errorCode,
          message: errorMessage,
          details: error instanceof Error ? error.message : String(error),
        });
      }
      
      throw error;
    }
  }

  /**
   * 분석 진행 여부 확인
   */
  isAnalysisInProgress(): boolean {
    return this.isAnalyzing;
  }
}

export const manuscriptAnalysisService = new ManuscriptAnalysisService();
