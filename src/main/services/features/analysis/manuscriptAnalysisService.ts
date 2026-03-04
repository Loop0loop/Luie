import "dotenv/config";
import { createLogger } from "../../../../shared/logger/index.js";
import { db } from "../../../database/index.js";
import { manuscriptAnalyzer } from "../../../core/manuscriptAnalyzer.js";
import type { AnalysisItem, AnalysisContext } from "../../../../shared/types/analysis.js";
import type { BrowserWindow } from "electron";
import {
  LUIE_PACKAGE_EXTENSION,
  LUIE_PACKAGE_META_FILENAME,
  LUIE_MANUSCRIPT_DIR,
  MARKDOWN_EXTENSION,
} from "../../../../shared/constants/index.js";
import { readLuieEntry } from "../../../utils/luiePackage.js";
import { ensureSafeAbsolutePath } from "../../../utils/pathValidation.js";
import { runGeminiAnalysisStream } from "./analysisStreamRunner.js";

const logger = createLogger("ManuscriptAnalysisService");
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3-flash-preview";

type LuieMeta = {
  chapters?: Array<{ id: string; title?: string; order?: number }>;
};

const parseLuieJsonSafe = <T>(
  raw: string | null,
  fallback: T,
  options: {
    projectPath: string;
    entryPath: string;
    label: string;
  },
): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    logger.warn("Failed to parse .luie analysis payload; using fallback", {
      projectPath: options.projectPath,
      entryPath: options.entryPath,
      label: options.label,
      error,
    });
    return fallback;
  }
};

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

    this.isAnalyzing = true;
    this.currentWindow = window;

    logger.info("Window assigned for analysis", {
      hasWindow: !!this.currentWindow,
      isDestroyed: this.currentWindow?.isDestroyed(),
      windowId: this.currentWindow?.id,
    });

    try {
      // 1. .luie 경로 조회
      const project = await db.getClient().project.findUnique({
        where: { id: projectId },
        select: { projectPath: true },
      });

      const projectPath = typeof project?.projectPath === "string" ? project.projectPath : "";
      if (!projectPath || !projectPath.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION)) {
        throw new Error("Project .luie path not found");
      }
      const safeProjectPath = ensureSafeAbsolutePath(projectPath, "projectPath");

      // 2. .luie 내부 데이터 로드
      const [metaRaw, chapterContent] = await Promise.all([
        readLuieEntry(safeProjectPath, LUIE_PACKAGE_META_FILENAME, logger),
        readLuieEntry(
          safeProjectPath,
          `${LUIE_MANUSCRIPT_DIR}/${chapterId}${MARKDOWN_EXTENSION}`,
          logger,
        ),
      ]);

      if (!chapterContent) {
        throw new Error(`Chapter content not found in .luie: ${chapterId}`);
      }

      const meta = parseLuieJsonSafe<LuieMeta | undefined>(
        metaRaw,
        undefined,
        {
          projectPath: safeProjectPath,
          entryPath: LUIE_PACKAGE_META_FILENAME,
          label: "meta",
        },
      );
      const chapterMeta = meta?.chapters?.find((entry) => entry.id === chapterId);
      const chapterTitle = chapterMeta?.title ?? "Untitled";

      const chapter = {
        id: chapterId,
        title: chapterTitle,
        content: chapterContent,
      };

      logger.info("Loaded .luie analysis data", {
        chapterId,
        chapterTitle,
        contentLength: chapterContent.length,
      });

      // 3. 분석 컨텍스트 구성
      const context = manuscriptAnalyzer.buildAnalysisContext(
        chapter,
        [],
        [],
      );

      // 4. Gemini 스트리밍 분석
      const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await this.streamAnalysisWithGemini(context, chapterId, runId);

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
    // Don't null the window here - let streaming complete first
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
    runId: string
  ): Promise<void> {
    const modelCandidates = [GEMINI_MODEL, process.env.ALTERNATIVE_GEMINI_MODEL].filter(
      (model): model is string => Boolean(model),
    );
    await runGeminiAnalysisStream({
      context,
      chapterId,
      runId,
      modelCandidates,
      getWindow: () => this.currentWindow,
      setCachedItems: (targetChapterId, items) => {
        this.analysisCache.set(targetChapterId, items);
      },
      logger,
    });
  }

  /**
   * 분석 진행 여부 확인
   */
  isAnalysisInProgress(): boolean {
    return this.isAnalyzing;
  }
}

export const manuscriptAnalysisService = new ManuscriptAnalysisService();
