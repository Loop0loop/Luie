import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import * as fsp from "fs/promises";
import * as path from "path";
import yauzl from "yauzl";
import { createLogger } from "../../../shared/logger/index.js";
import { db } from "../../database/index.js";
import { manuscriptAnalyzer } from "../../core/manuscriptAnalyzer.js";
import {
  ANALYSIS_SYSTEM_INSTRUCTION,
  ANALYSIS_FEW_SHOT_EXAMPLES,
  formatAnalysisContext,
  AnalysisItemSchema,
  type AnalysisItemResult,
} from "./analysis/analysisPrompt.js";
import type { AnalysisItem, AnalysisContext } from "../../../shared/types/analysis.js";
import type { Chapter, Character, Term } from "../../../shared/types/index.js";
import type { BrowserWindow } from "electron";
import {
  LUIE_PACKAGE_EXTENSION,
  LUIE_PACKAGE_META_FILENAME,
  LUIE_MANUSCRIPT_DIR,
  LUIE_WORLD_DIR,
  LUIE_WORLD_CHARACTERS_FILE,
  LUIE_WORLD_TERMS_FILE,
  MARKDOWN_EXTENSION,
} from "../../../shared/constants/index.js";

const logger = createLogger("ManuscriptAnalysisService");
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3-flash-preview";

type LuieMeta = {
  chapters?: Array<{ id: string; title?: string; order?: number }>;
};

type LuieCharactersFile = {
  characters?: Array<{ name?: string; description?: string }>;
};

type LuieTermsFile = {
  terms?: Array<{ term?: string; definition?: string; category?: string }>;
};

const normalizeZipPath = (inputPath: string) =>
  path.posix
    .normalize(inputPath.replace(/\\/g, "/"))
    .replace(/^\.(\/|\\)/, "")
    .replace(/^\//, "");

const isSafeZipPath = (inputPath: string) => {
  const normalized = normalizeZipPath(inputPath);
  if (!normalized) return false;
  if (normalized.startsWith("../") || normalized.startsWith("..\\")) return false;
  if (normalized.includes("../") || normalized.includes("..\\")) return false;
  return !path.isAbsolute(normalized);
};

const readZipEntryContent = async (zipPath: string, entryPath: string): Promise<string | null> => {
  const normalized = normalizeZipPath(entryPath);
  if (!normalized || !isSafeZipPath(normalized)) {
    throw new Error("INVALID_RELATIVE_PATH");
  }

  let found = false;
  let result: string | null = null;

  await new Promise<void>((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (openErr: Error | null, zipfile?: yauzl.ZipFile) => {
      if (openErr || !zipfile) {
        reject(openErr ?? new Error("FAILED_TO_OPEN_ZIP"));
        return;
      }

      zipfile.on("entry", (entry: yauzl.Entry) => {
        const entryName = normalizeZipPath(entry.fileName);
        if (!entryName || !isSafeZipPath(entryName)) {
          zipfile.readEntry();
          return;
        }

        if (entryName !== normalized) {
          zipfile.readEntry();
          return;
        }

        found = true;

        zipfile.openReadStream(entry, (streamErr, stream) => {
          if (streamErr || !stream) {
            reject(streamErr ?? new Error("FAILED_TO_READ_ZIP_ENTRY"));
            return;
          }

          const chunks: Buffer[] = [];
          stream.on("data", (chunk) => chunks.push(chunk));
          stream.on("error", reject);
          stream.on("end", () => {
            result = Buffer.concat(chunks).toString("utf-8");
            resolve();
          });
        });
      });

      zipfile.on("end", () => {
        if (!found) {
          resolve();
        }
      });

      zipfile.on("error", reject);
      zipfile.readEntry();
    });
  });

  return result;
};

const readLuieEntry = async (packagePath: string, entryPath: string): Promise<string | null> => {
  const normalized = normalizeZipPath(entryPath);
  if (!normalized || !isSafeZipPath(normalized)) {
    throw new Error("INVALID_RELATIVE_PATH");
  }

  let stat: Awaited<ReturnType<typeof fsp.stat>> | null = null;
  try {
    stat = await fsp.stat(packagePath);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err?.code === "ENOENT") return null;
    throw error;
  }

  if (stat.isDirectory()) {
    const fullPath = path.join(packagePath, normalized);
    const resolved = path.resolve(fullPath);
    const base = path.resolve(packagePath);
    if (!resolved.startsWith(base)) {
      throw new Error("INVALID_RELATIVE_PATH");
    }

    try {
      return await fsp.readFile(fullPath, "utf-8");
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err?.code === "ENOENT") return null;
      throw error;
    }
  }

  if (stat.isFile()) {
    return await readZipEntryContent(packagePath, normalized);
  }

  return null;
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
      // 1. .luie 경로 조회
      const project = await db.getClient().project.findUnique({
        where: { id: projectId },
        select: { projectPath: true },
      });

      const projectPath = typeof project?.projectPath === "string" ? project.projectPath : "";
      if (!projectPath || !projectPath.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION)) {
        throw new Error("Project .luie path not found");
      }

      // 2. .luie 내부 데이터 로드
      const [metaRaw, chapterContent, charactersRaw, termsRaw] = await Promise.all([
        readLuieEntry(projectPath, LUIE_PACKAGE_META_FILENAME),
        readLuieEntry(
          projectPath,
          `${LUIE_MANUSCRIPT_DIR}/${chapterId}${MARKDOWN_EXTENSION}`
        ),
        readLuieEntry(projectPath, `${LUIE_WORLD_DIR}/${LUIE_WORLD_CHARACTERS_FILE}`),
        readLuieEntry(projectPath, `${LUIE_WORLD_DIR}/${LUIE_WORLD_TERMS_FILE}`),
      ]);

      if (!chapterContent) {
        throw new Error(`Chapter content not found in .luie: ${chapterId}`);
      }

      const meta = metaRaw ? (JSON.parse(metaRaw) as LuieMeta) : undefined;
      const chapterMeta = meta?.chapters?.find((entry) => entry.id === chapterId);
      const chapterTitle = chapterMeta?.title ?? "Untitled";

      const charactersFile = charactersRaw
        ? (JSON.parse(charactersRaw) as LuieCharactersFile)
        : { characters: [] };
      const termsFile = termsRaw ? (JSON.parse(termsRaw) as LuieTermsFile) : { terms: [] };

      const characters = (charactersFile.characters ?? [])
        .filter((char) => Boolean(char?.name))
        .map((char) => ({
          name: char?.name ?? "",
          description: char?.description ?? "",
        }));

      const terms = (termsFile.terms ?? [])
        .filter((term) => Boolean(term?.term))
        .map((term) => ({
          term: term?.term ?? "",
          definition: term?.definition ?? "",
          category: term?.category ?? "기타",
        }));

      const chapter: Chapter = {
        id: chapterId,
        title: chapterTitle,
        content: chapterContent,
      } as Chapter;

      logger.info("Loaded .luie analysis data", {
        chapterId,
        chapterTitle,
        characterCount: characters.length,
        termCount: terms.length,
        contentLength: chapterContent.length,
      });

      // 3. 분석 컨텍스트 구성
      const context = manuscriptAnalyzer.buildAnalysisContext(
        chapter,
        characters as unknown as Character[],
        terms as unknown as Term[]
      );

      // 4. Gemini 스트리밍 분석
      const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await this.streamAnalysisWithGemini(context, chapterId, apiKey, runId);

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
    apiKey: string,
    runId: string
  ): Promise<void> {
    const genAI = new GoogleGenAI({ apiKey });

    const prompt = `${ANALYSIS_SYSTEM_INSTRUCTION}

${ANALYSIS_FEW_SHOT_EXAMPLES}

---

${formatAnalysisContext(context)}

# RunId
${runId}

# Style
같은 요청이어도 표현을 바꿔서 답변하세요. 이전 응답과 동일 문장을 반복하지 마세요.`;

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
      let usedModel = "";
      const parsedItems: AnalysisItemResult[] = [];

      const extractChunkText = (chunk: unknown): string => {
        if (!chunk) return "";
        const maybeTextFn = (chunk as { text?: unknown }).text;
        if (typeof maybeTextFn === "function") {
          return (chunk as { text: () => string }).text();
        }
        if (typeof maybeTextFn === "string") {
          return maybeTextFn;
        }
        const partText = (chunk as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        })?.candidates?.[0]?.content?.parts?.[0]?.text;
        return typeof partText === "string" ? partText : "";
      };

      const emitItem = (itemData: AnalysisItemResult) => {
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
          parsedItems.push(itemData);

          logger.info("Attempting to send stream item", {
            itemId: item.id,
            type: item.type,
            hasCurrentWindow: !!this.currentWindow,
            isDestroyed: this.currentWindow?.isDestroyed(),
            windowId: this.currentWindow?.id,
          });

          if (this.currentWindow && !this.currentWindow.isDestroyed()) {
            this.currentWindow.webContents.send("analysis:stream", {
              item,
              done: false,
            });
          } else {
            logger.error("Window not available for streaming - CRITICAL", {
              hasWindow: !!this.currentWindow,
              isDestroyed: this.currentWindow?.isDestroyed(),
              windowId: this.currentWindow?.id,
              itemId: item.id,
            });
          }
        } catch (validationError) {
          logger.warn("Invalid analysis item", { error: validationError, itemData });
        }
      };

      const streamJsonlFromModel = async (model: string, promptText: string, phase: string) => {
        const phaseResult = await genAI.models.generateContentStream({
          model,
          contents: [{ role: "user", parts: [{ text: promptText }] }],
          config: {
            responseMimeType: "text/plain",
            temperature: 0.8,
            topP: 0.9,
            topK: 40,
          },
        });

        const stream = (phaseResult as { stream?: AsyncIterable<unknown> }).stream
          ?? (phaseResult as unknown as AsyncIterable<unknown>);
        let buffer = "";

        for await (const chunk of stream) {
          const chunkText = extractChunkText(chunk);
          if (!chunkText) continue;

          buffer += chunkText;

          // Try to extract complete JSON objects from buffer
          while (buffer.length > 0) {
            const trimmed = buffer.trimStart();
            if (!trimmed) {
              buffer = "";
              break;
            }

            // Skip code fences
            if (trimmed.startsWith("```")) {
              const endFence = trimmed.indexOf("\n");
              if (endFence === -1) break;
              buffer = trimmed.slice(endFence + 1);
              continue;
            }

            if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
              // Skip non-JSON content
              const nextJson = Math.min(
                trimmed.indexOf("{") === -1 ? Infinity : trimmed.indexOf("{"),
                trimmed.indexOf("[") === -1 ? Infinity : trimmed.indexOf("[")
              );
              if (nextJson === Infinity) {
                buffer = "";
                break;
              }
              buffer = trimmed.slice(nextJson);
              continue;
            }

            // Find complete JSON object/array
            let braceCount = 0;
            let inString = false;
            let escape = false;
            let jsonEnd = -1;
            const isArray = trimmed[0] === "[";
            const openChar = isArray ? "[" : "{";
            const closeChar = isArray ? "]" : "}";

            for (let i = 0; i < trimmed.length; i++) {
              const char = trimmed[i];

              if (escape) {
                escape = false;
                continue;
              }

              if (char === "\\") {
                escape = true;
                continue;
              }

              if (char === '"') {
                inString = !inString;
                continue;
              }

              if (inString) continue;

              if (char === openChar) {
                braceCount++;
              } else if (char === closeChar) {
                braceCount--;
                if (braceCount === 0) {
                  jsonEnd = i + 1;
                  break;
                }
              }
            }

            if (jsonEnd === -1) {
              // Incomplete JSON, wait for more data
              break;
            }

            const jsonStr = trimmed.slice(0, jsonEnd);
            buffer = trimmed.slice(jsonEnd);

            try {
              const parsed = JSON.parse(jsonStr);
              if (Array.isArray(parsed)) {
                parsed.forEach((item) => emitItem(item));
              } else {
                emitItem(parsed);
              }
            } catch (error) {
              logger.warn("Failed to parse JSON", { error, jsonStr: jsonStr.slice(0, 200), phase });
            }
          }
        }

        // Process remaining buffer
        if (buffer.trim()) {
          const trimmed = buffer.trim();
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
              parsed.forEach((item) => emitItem(item));
            } else {
              emitItem(parsed);
            }
          } catch (error) {
            logger.warn("Failed to parse remaining buffer", { error, buffer: trimmed.slice(0, 200), phase });
          }
        }
      };

      // 모델 fallback 시도 (스트리밍 실행 포함)
      for (const model of modelCandidates) {
        try {
          logger.info("Trying Gemini model", { model });
          await streamJsonlFromModel(model, prompt, "primary");
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

      if (!usedModel) {
        throw new Error("No available Gemini model responded");
      }

      logger.info("Gemini response received", { usedModel });

      const suggestionCount = parsedItems.filter((item) => item?.type === "suggestion").length;
      const reactionCount = parsedItems.filter((item) => item?.type === "reaction").length;
      const hasIntro = parsedItems.some((item) => item?.type === "intro");
      const hasOutro = parsedItems.some((item) => item?.type === "outro");

      if (suggestionCount < 2 || reactionCount < 1 || !hasIntro || !hasOutro) {
        logger.warn("Gemini response missing required items", {
          suggestionCount,
          reactionCount,
          hasIntro,
          hasOutro,
        });

        const followupPrompt = `${ANALYSIS_SYSTEM_INSTRUCTION}\n\n${formatAnalysisContext(context)}\n\n# 추가 요청\n부족한 항목만 JSONL로 추가 출력하세요.\n- intro: ${hasIntro ? "이미 출력됨" : "필수"}\n- reaction: ${reactionCount >= 1 ? "이미 출력됨" : "최소 1개 (quote 포함)"}\n- suggestion: ${suggestionCount >= 2 ? "이미 출력됨" : "최소 2개 (quote 포함)"}\n- outro: ${hasOutro ? "이미 출력됨" : "필수"}\n동일 문장 반복 금지. 코드블록 금지.`;

        await streamJsonlFromModel(usedModel, followupPrompt, "followup");
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
