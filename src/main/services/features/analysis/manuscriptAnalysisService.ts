import "dotenv/config";
import { createLogger } from "../../../../shared/logger/index.js";
import { IPC_CHANNELS } from "../../../../shared/ipc/channels.js";
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
import {
  isAnalysisAbortError,
  runGeminiAnalysisStream,
  toAnalysisErrorPayload,
  type AnalysisStreamOutcome,
} from "./analysisStreamRunner.js";

const logger = createLogger("ManuscriptAnalysisService");
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3-flash-preview";

type LuieMeta = {
  chapters?: Array<{ id: string; title?: string; order?: number }>;
};

type ActiveAnalysisRun = {
  runId: string;
  controller: AbortController;
  window: BrowserWindow;
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
export class ManuscriptAnalysisService {
  private isAnalyzing = false;
  private currentWindow: BrowserWindow | null = null;
  private analysisCache: Map<string, AnalysisItem[]> = new Map();
  private activeRun: ActiveAnalysisRun | null = null;

  private buildRunId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private isRunActive(runId: string): boolean {
    return this.activeRun?.runId === runId && !this.activeRun.controller.signal.aborted;
  }

  private getWindowForRun(runId: string): BrowserWindow | null {
    if (!this.isRunActive(runId)) {
      return null;
    }
    const targetWindow = this.activeRun?.window ?? null;
    if (!targetWindow || targetWindow.isDestroyed()) {
      return null;
    }
    return targetWindow;
  }

  private finishRun(runId: string): void {
    if (this.activeRun?.runId !== runId) {
      return;
    }
    this.activeRun = null;
    this.currentWindow = null;
    this.isAnalyzing = false;
  }

  private cancelActiveRun(reason: string): boolean {
    const activeRun = this.activeRun;
    if (!activeRun) {
      return false;
    }
    if (!activeRun.controller.signal.aborted) {
      activeRun.controller.abort();
    }
    this.activeRun = null;
    this.currentWindow = null;
    this.isAnalyzing = false;
    logger.info(reason, {
      runId: activeRun.runId,
      windowId: activeRun.window.id,
    });
    return true;
  }

  private emitAnalysisError(runId: string, error: unknown): void {
    const errorWindow = this.getWindowForRun(runId);
    if (!errorWindow || errorWindow.isDestroyed()) {
      return;
    }
    const payload = toAnalysisErrorPayload(error);
    errorWindow.webContents.send(IPC_CHANNELS.ANALYSIS_ERROR, payload);
  }

  private async runAnalysis(
    chapterId: string,
    projectId: string,
    runId: string,
    signal: AbortSignal,
  ): Promise<void> {
    try {
      const project = await db.getClient().project.findUnique({
        where: { id: projectId },
        select: { projectPath: true },
      });
      if (signal.aborted || !this.isRunActive(runId)) {
        return;
      }

      const projectPath = typeof project?.projectPath === "string" ? project.projectPath : "";
      if (!projectPath || !projectPath.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION)) {
        throw new Error("Project .luie path not found");
      }
      const safeProjectPath = ensureSafeAbsolutePath(projectPath, "projectPath");

      const [metaRaw, chapterContent] = await Promise.all([
        readLuieEntry(safeProjectPath, LUIE_PACKAGE_META_FILENAME, logger),
        readLuieEntry(
          safeProjectPath,
          `${LUIE_MANUSCRIPT_DIR}/${chapterId}${MARKDOWN_EXTENSION}`,
          logger,
        ),
      ]);
      if (signal.aborted || !this.isRunActive(runId)) {
        return;
      }

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
        runId,
      });

      const context = manuscriptAnalyzer.buildAnalysisContext(
        chapter,
        [],
        [],
      );
      if (signal.aborted || !this.isRunActive(runId)) {
        return;
      }

      const outcome = await this.streamAnalysisWithGemini(context, chapterId, runId, signal);
      if ((outcome === "completed" || outcome === "fallback") && this.isRunActive(runId)) {
        logger.info("Analysis completed", { chapterId, projectId, runId, outcome });
      }
    } catch (error) {
      if (signal.aborted || !this.isRunActive(runId) || isAnalysisAbortError(error)) {
        logger.info("Analysis aborted", { chapterId, projectId, runId });
        return;
      }
      logger.error("Analysis failed", { chapterId, projectId, runId, error });
      this.emitAnalysisError(runId, error);
    } finally {
      this.finishRun(runId);
    }
  }

  /**
   * 분석 시작
   */
  async startAnalysis(
    chapterId: string,
    projectId: string,
    window: BrowserWindow,
  ): Promise<void> {
    if (this.activeRun) {
      logger.warn("Analysis already in progress");
      throw new Error("Analysis already in progress");
    }

    const runId = this.buildRunId();
    const controller = new AbortController();
    this.isAnalyzing = true;
    this.currentWindow = window;
    this.activeRun = {
      runId,
      controller,
      window,
    };

    logger.info("Window assigned for analysis", {
      hasWindow: !!this.currentWindow,
      isDestroyed: this.currentWindow?.isDestroyed(),
      windowId: this.currentWindow?.id,
      runId,
    });

    void this.runAnalysis(chapterId, projectId, runId, controller.signal);
  }

  /**
   * 분석 중단
   */
  stopAnalysis(): void {
    if (!this.activeRun) {
      logger.warn("No analysis in progress");
      return;
    }
    this.cancelActiveRun("Analysis stopped by user");
  }

  /**
   * 분석 데이터 삭제 (보안)
   */
  clearAnalysisData(): void {
    const activeWindow = this.activeRun?.window ?? this.currentWindow;
    logger.info("clearAnalysisData called", {
      hadWindow: !!activeWindow,
      windowId: activeWindow?.id,
      isAnalyzing: this.isAnalyzing,
      stackTrace: new Error().stack?.split("\n").slice(1, 4).join("\n"),
    });

    this.cancelActiveRun("Analysis data cleared");
    this.analysisCache.clear();
    logger.info("Analysis data cleared");
  }

  /**
   * Gemini API 스트리밍 호출
   */
  private async streamAnalysisWithGemini(
    context: AnalysisContext,
    chapterId: string,
    runId: string,
    signal: AbortSignal,
  ): Promise<AnalysisStreamOutcome> {
    const modelCandidates = [GEMINI_MODEL, process.env.ALTERNATIVE_GEMINI_MODEL].filter(
      (model): model is string => Boolean(model),
    );
    return await runGeminiAnalysisStream({
      context,
      chapterId,
      runId,
      modelCandidates,
      getWindow: () => this.getWindowForRun(runId),
      setCachedItems: (targetChapterId, items) => {
        this.analysisCache.set(targetChapterId, items);
      },
      logger,
      signal,
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
