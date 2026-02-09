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
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

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

    try {
      const result = await genAI.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: GEMINI_ANALYSIS_RESPONSE_SCHEMA,
        },
      });

      // 응답 파싱 및 검증
      const responseText = result.text ?? "";
      
      // JSON 배열 또는 단일 객체 처리
      let parsedItems: AnalysisItemResult[] = [];
      
      try {
        const parsed = JSON.parse(responseText);
        parsedItems = Array.isArray(parsed) ? parsed : [parsed];
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
          if (this.currentWindow && !this.currentWindow.isDestroyed()) {
            this.currentWindow.webContents.send("analysis:stream", {
              item,
              done: false,
            });
          }
        } catch (validationError) {
          logger.warn("Invalid analysis item, skipping", { error: validationError, itemData });
        }
      }

      // 완료 이벤트 전송
      if (this.currentWindow && !this.currentWindow.isDestroyed()) {
        this.currentWindow.webContents.send("analysis:stream", {
          item: null,
          done: true,
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
      
      // 에러 이벤트 전송
      if (this.currentWindow && !this.currentWindow.isDestroyed()) {
        this.currentWindow.webContents.send("analysis:error", {
          code: "UNKNOWN",
          message: "분석 중 오류가 발생했습니다.",
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
