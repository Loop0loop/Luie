import type { BrowserWindow } from "electron";
import type {
  AnalysisContext,
  AnalysisItem,
} from "../../../../shared/types/analysis.js";
import { IPC_CHANNELS } from "../../../../shared/ipc/channels.js";
import {
  ANALYSIS_FEW_SHOT_EXAMPLES,
  ANALYSIS_SYSTEM_INSTRUCTION,
  AnalysisItemSchema,
  type AnalysisItemResult,
  formatAnalysisContext,
} from "./analysisPrompt.js";
import { invokeGeminiProxy } from "./geminiApiKeyResolver.js";
import { buildDeterministicAnalysisItems } from "./localFallbackAnalyzer.js";
import { parseLooseJsonStream } from "./streamRunner/index.js";

type LoggerLike = {
  info: (message: string, metadata?: unknown) => void;
  warn: (message: string, metadata?: unknown) => void;
  error: (message: string, metadata?: unknown) => void;
};

type StreamRunnerInput = {
  context: AnalysisContext;
  chapterId: string;
  runId: string;
  modelCandidates: string[];
  getWindow: () => BrowserWindow | null;
  setCachedItems: (chapterId: string, items: AnalysisItem[]) => void;
  logger: LoggerLike;
  signal?: AbortSignal;
};

export type AnalysisStreamOutcome =
  | "completed"
  | "fallback"
  | "cancelled"
  | "error";

type AnalysisErrorPayload = {
  code:
    | "API_KEY_MISSING"
    | "NETWORK_ERROR"
    | "QUOTA_EXCEEDED"
    | "INVALID_REQUEST"
    | "UNKNOWN";
  message: string;
  details: string;
};

const sendStreamItem = (
  window: BrowserWindow,
  payload: { item: AnalysisItem | null; done: boolean },
): void => {
  window.webContents.send(IPC_CHANNELS.ANALYSIS_STREAM, payload);
};

const createAnalysisAbortError = (): Error => {
  const error = new Error("Analysis aborted");
  error.name = "AbortError";
  return error;
};

export const isAnalysisAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === "AbortError";

const throwIfCancelled = (signal?: AbortSignal): void => {
  if (!signal?.aborted) return;
  if (signal.reason instanceof Error) {
    throw signal.reason;
  }
  throw createAnalysisAbortError();
};

export const toAnalysisErrorPayload = (
  error: unknown,
): AnalysisErrorPayload => {
  let errorCode:
    | "API_KEY_MISSING"
    | "NETWORK_ERROR"
    | "QUOTA_EXCEEDED"
    | "INVALID_REQUEST"
    | "UNKNOWN" = "UNKNOWN";
  let errorMessage = "분석 중 오류가 발생했습니다.";
  const rawMessage = error instanceof Error ? error.message : String(error);

  if (rawMessage.includes("SYNC_AUTH_REQUIRED_FOR_EDGE")) {
    errorCode = "INVALID_REQUEST";
    errorMessage = "분석을 실행하려면 Sync 로그인이 필요합니다.";
  } else if (rawMessage.includes("SUPABASE_NOT_CONFIGURED")) {
    errorCode = "INVALID_REQUEST";
    errorMessage = "Supabase 런타임 설정을 먼저 완료해주세요.";
  } else if (rawMessage.includes("Project .luie path not found")) {
    errorCode = "INVALID_REQUEST";
    errorMessage = "프로젝트 .luie 파일을 찾을 수 없습니다.";
  } else if (rawMessage.includes("Chapter content not found in .luie")) {
    errorCode = "INVALID_REQUEST";
    errorMessage = "분석할 원고를 찾을 수 없습니다.";
  }

  if (error && typeof error === "object" && "status" in error) {
    const apiError = error as { status: number };

    if (apiError.status === 429) {
      errorCode = "QUOTA_EXCEEDED";
      errorMessage =
        "Gemini API 할당량을 초과했습니다. 잠시 후 다시 시도해주세요.";
    } else if (apiError.status >= 500) {
      errorCode = "NETWORK_ERROR";
      errorMessage = "Gemini API 서버 오류가 발생했습니다.";
    } else if (apiError.status === 400) {
      errorCode = "INVALID_REQUEST";
      errorMessage = "잘못된 요청입니다. 원고 내용을 확인해주세요.";
    }
  }

  return {
    code: errorCode,
    message: errorMessage,
    details: rawMessage,
  };
};

export const runGeminiAnalysisStream = async ({
  context,
  chapterId,
  runId,
  modelCandidates,
  getWindow,
  setCachedItems,
  logger,
  signal,
}: StreamRunnerInput): Promise<AnalysisStreamOutcome> => {
  const prompt = `${ANALYSIS_SYSTEM_INSTRUCTION}

${ANALYSIS_FEW_SHOT_EXAMPLES}

---

${formatAnalysisContext(context)}

# RunId
${runId}

# Style
같은 요청이어도 표현을 바꿔서 답변하세요. 이전 응답과 동일 문장을 반복하지 마세요.
본문에 없는 사실은 절대 추가하지 마세요.
reaction/suggestion의 quote는 반드시 본문에 있는 문구를 그대로 사용하세요.`;

  const items: AnalysisItem[] = [];
  let itemCounter = 0;
  const seenSignatures = new Set<string>();
  const normalizedManuscript = context.manuscript.content
    .replace(/\s+/g, " ")
    .trim();

  logger.info("Starting Gemini analysis", {
    chapterId,
    models: modelCandidates,
    promptLength: prompt.length,
  });

  try {
    throwIfCancelled(signal);
    let usedModel = "";
    const parsedItems: AnalysisItemResult[] = [];

    const emitItem = (itemData: AnalysisItemResult) => {
      throwIfCancelled(signal);
      try {
        const validated = AnalysisItemSchema.parse(itemData);
        const normalize = (value: string) => value.replace(/\s+/g, " ").trim();

        const requiresQuote =
          validated.type === "reaction" || validated.type === "suggestion";
        const normalizedQuote = normalize(validated.quote ?? "");
        if (requiresQuote && !normalizedQuote) {
          logger.warn("Skipping analysis item without quote", {
            chapterId,
            type: validated.type,
          });
          return;
        }

        if (
          requiresQuote &&
          normalizedManuscript &&
          !normalizedManuscript.includes(normalizedQuote)
        ) {
          logger.warn("Skipping analysis item with quote outside manuscript", {
            chapterId,
            type: validated.type,
            quotePreview: normalizedQuote.slice(0, 120),
          });
          return;
        }

        const signature = `${validated.type}|${normalize(validated.content).toLowerCase()}|${normalizedQuote.toLowerCase()}`;
        if (seenSignatures.has(signature)) {
          logger.info("Skipping duplicate analysis item", {
            chapterId,
            type: validated.type,
          });
          return;
        }
        seenSignatures.add(signature);

        const item: AnalysisItem = {
          id: `analysis-${++itemCounter}`,
          type: validated.type,
          content: validated.content,
          quote: validated.quote,
          contextId: validated.contextId,
        };

        items.push(item);
        parsedItems.push(validated);

        const window = getWindow();
        logger.info("Attempting to send stream item", {
          itemId: item.id,
          type: item.type,
          hasCurrentWindow: Boolean(window),
          isDestroyed: window?.isDestroyed(),
          windowId: window?.id,
        });

        if (window && !window.isDestroyed()) {
          sendStreamItem(window, { item, done: false });
        } else if (!signal?.aborted) {
          logger.error("Window not available for streaming - CRITICAL", {
            hasWindow: Boolean(window),
            isDestroyed: window?.isDestroyed(),
            windowId: window?.id,
            itemId: item.id,
          });
        }
      } catch (validationError) {
        if (isAnalysisAbortError(validationError) || signal?.aborted) {
          throw validationError;
        }
        logger.warn("Invalid analysis item", {
          error: validationError,
          itemData,
        });
      }
    };

    const streamJsonlFromModel = async (
      model: string,
      promptText: string,
      phase: string,
    ) => {
      throwIfCancelled(signal);
      const responseText = await invokeGeminiProxy(
        {
          model,
          prompt: promptText,
          responseMimeType: "text/plain",
          temperature: 0.5,
          topP: 0.9,
          topK: 40,
        },
        { signal },
      );

      parseLooseJsonStream({
        responseText,
        phase,
        logger,
        throwIfCancelled: () => throwIfCancelled(signal),
        shouldRethrowError: (error) =>
          isAnalysisAbortError(error) || Boolean(signal?.aborted),
        emitValue: (value) => emitItem(value as AnalysisItemResult),
      });
    };

    for (const model of modelCandidates) {
      throwIfCancelled(signal);
      try {
        logger.info("Trying Gemini model", { model });
        await streamJsonlFromModel(model, prompt, "primary");
        usedModel = model;
        logger.info("Gemini model responded successfully", { model });
        break;
      } catch (modelError) {
        if (isAnalysisAbortError(modelError) || signal?.aborted) {
          throw modelError;
        }

        const status =
          modelError && typeof modelError === "object" && "status" in modelError
            ? (modelError as { status: number }).status
            : undefined;

        const isRetryable = status === 404 || status === 429 || status === 503;
        const hasNext = model !== modelCandidates[modelCandidates.length - 1];

        logger.warn("Gemini model failed", {
          model,
          status,
          isRetryable,
          hasNext,
          error:
            modelError instanceof Error
              ? modelError.message
              : String(modelError),
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

    const suggestionCount = parsedItems.filter(
      (item) => item?.type === "suggestion",
    ).length;
    const reactionCount = parsedItems.filter(
      (item) => item?.type === "reaction",
    ).length;
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

      throwIfCancelled(signal);
      await streamJsonlFromModel(usedModel, followupPrompt, "followup");
    }

    throwIfCancelled(signal);
    const completionWindow = getWindow();
    logger.info("Attempting to send completion event", {
      hasCurrentWindow: Boolean(completionWindow),
      isDestroyed: completionWindow?.isDestroyed(),
      windowId: completionWindow?.id,
    });

    if (completionWindow && !completionWindow.isDestroyed()) {
      logger.info("Sending completion event to window");
      sendStreamItem(completionWindow, {
        item: null,
        done: true,
      });
      logger.info("Completion event sent successfully");
    } else if (!signal?.aborted) {
      logger.error("Window not available for completion event - CRITICAL", {
        hasWindow: Boolean(completionWindow),
        isDestroyed: completionWindow?.isDestroyed(),
        windowId: completionWindow?.id,
      });
    }

    throwIfCancelled(signal);
    setCachedItems(chapterId, items);

    logger.info("Streaming analysis completed", {
      chapterId,
      itemCount: items.length,
    });
    return "completed";
  } catch (error) {
    if (isAnalysisAbortError(error) || signal?.aborted) {
      logger.info("Gemini streaming aborted", {
        chapterId,
        runId,
      });
      return "cancelled";
    }

    logger.error("Gemini streaming failed", { error });
    const fallback = buildDeterministicAnalysisItems(context);
    if (fallback.length > 0) {
      logger.warn("Using deterministic local fallback for analysis", {
        chapterId,
        fallbackCount: fallback.length,
        reason: error instanceof Error ? error.message : String(error),
      });

      const fallbackItems: AnalysisItem[] = fallback.map((entry, index) => ({
        id: `analysis-fallback-${index + 1}`,
        type: entry.type,
        content: entry.content,
        quote: entry.quote,
        contextId: entry.contextId,
      }));

      const fallbackWindow = getWindow();
      if (fallbackWindow && !fallbackWindow.isDestroyed()) {
        for (const item of fallbackItems) {
          if (signal?.aborted) {
            return "cancelled";
          }
          sendStreamItem(fallbackWindow, {
            item,
            done: false,
          });
        }
        if (signal?.aborted) {
          return "cancelled";
        }
        sendStreamItem(fallbackWindow, {
          item: null,
          done: true,
        });
      }

      if (signal?.aborted) {
        return "cancelled";
      }
      setCachedItems(chapterId, fallbackItems);
      return "fallback";
    }

    const errorWindow = getWindow();
    if (errorWindow && !errorWindow.isDestroyed()) {
      const payload = toAnalysisErrorPayload(error);
      errorWindow.webContents.send(IPC_CHANNELS.ANALYSIS_ERROR, {
        code: payload.code,
        message: payload.message,
        details: payload.details,
      });
    }

    return "error";
  }
};
