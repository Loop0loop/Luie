import { createLogger } from "../../../../shared/logger/index.js";
import type { RuntimeSupabaseConfig } from "../../../../shared/types/index.js";
import { getSupabaseConfig } from "../sync/supabaseEnv.js";
import { syncService } from "../sync/syncService.js";

const logger = createLogger("GeminiProxyClient");

export type GeminiProxyRequest = {
  model: string;
  prompt: string;
  responseMimeType?: "text/plain" | "application/json";
  responseSchema?: Record<string, unknown>;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
};

export type GeminiProxyInvokeOptions = {
  signal?: AbortSignal;
};

type GeminiProxyResponse = {
  text?: unknown;
  candidates?: unknown;
};

type HttpError = Error & { status?: number };

const createAbortError = (): Error => {
  const error = new Error("Analysis aborted");
  error.name = "AbortError";
  return error;
};

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === "AbortError";

const throwIfAborted = (signal?: AbortSignal): void => {
  if (!signal?.aborted) return;
  if (signal.reason instanceof Error) {
    throw signal.reason;
  }
  throw createAbortError();
};

const toHttpError = (status: number, message: string): HttpError => {
  const error = new Error(message) as HttpError;
  error.status = status;
  return error;
};

const resolveProxyEndpoint = (config: RuntimeSupabaseConfig): string => {
  const custom = process.env.LUIE_GEMINI_PROXY_URL?.trim();
  if (custom && custom.length > 0) {
    return custom;
  }
  return `${config.url}/functions/v1/gemini-proxy`;
};

const pickText = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
};

const extractTextFromCandidates = (candidates: unknown): string | null => {
  if (!Array.isArray(candidates)) {
    return null;
  }
  const first = candidates[0];
  if (!first || typeof first !== "object") return null;
  const content = (first as { content?: unknown }).content;
  if (!content || typeof content !== "object") return null;
  const parts = (content as { parts?: unknown }).parts;
  if (!Array.isArray(parts)) return null;
  const texts = parts
    .map((part) =>
      part && typeof part === "object"
        ? pickText((part as { text?: unknown }).text)
        : null,
    )
    .filter((item): item is string => Boolean(item));
  if (texts.length === 0) return null;
  return texts.join("\n").trim();
};

const resolveLocalGeminiApiKey = (): string | null => {
  const keyCandidates = [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_GCP_API,
    process.env.GOOGLE_API_KEY,
  ];
  for (const candidate of keyCandidates) {
    if (typeof candidate !== "string") continue;
    const trimmed = candidate.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return null;
};

const invokeEdgeProxy = async (
  request: GeminiProxyRequest,
  supabaseConfig: RuntimeSupabaseConfig,
  options: GeminiProxyInvokeOptions = {},
): Promise<string> => {
  throwIfAborted(options.signal);
  const accessToken = await syncService.getEdgeAccessToken();
  const endpoint = resolveProxyEndpoint(supabaseConfig);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseConfig.anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(request),
    signal: options.signal,
  });

  if (!response.ok) {
    const body = await response.text();
    logger.warn("gemini-proxy request failed", {
      endpoint,
      status: response.status,
      body,
    });
    throw toHttpError(
      response.status,
      `GEMINI_PROXY_FAILED:${response.status}:${body}`,
    );
  }

  const payload = (await response.json()) as GeminiProxyResponse;
  const text =
    pickText(payload.text) ?? extractTextFromCandidates(payload.candidates);
  if (!text) {
    throw new Error("GEMINI_PROXY_EMPTY_RESPONSE");
  }
  return text;
};

const invokeLocalGemini = async (
  request: GeminiProxyRequest,
  apiKey: string,
  options: GeminiProxyInvokeOptions = {},
): Promise<string> => {
  throwIfAborted(options.signal);
  const generationConfig: Record<string, unknown> = {};
  if (request.responseMimeType) {
    generationConfig.responseMimeType = request.responseMimeType;
  }
  if (request.responseSchema) {
    generationConfig.responseSchema = request.responseSchema;
  }
  if (typeof request.temperature === "number") {
    generationConfig.temperature = request.temperature;
  }
  if (typeof request.topP === "number") {
    generationConfig.topP = request.topP;
  }
  if (typeof request.topK === "number") {
    generationConfig.topK = request.topK;
  }
  if (typeof request.maxOutputTokens === "number") {
    generationConfig.maxOutputTokens = request.maxOutputTokens;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      request.model,
    )}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: options.signal,
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: request.prompt }] }],
        generationConfig,
      }),
    },
  );

  const responseText = await response.text();
  let responseJson: unknown;
  try {
    responseJson = JSON.parse(responseText);
  } catch {
    responseJson = null;
  }

  if (!response.ok) {
    throw toHttpError(
      response.status,
      `GEMINI_LOCAL_FAILED:${response.status}:${responseText}`,
    );
  }

  const text = extractTextFromCandidates(
    responseJson && typeof responseJson === "object"
      ? (responseJson as { candidates?: unknown }).candidates
      : null,
  );
  if (!text) {
    throw new Error("GEMINI_LOCAL_EMPTY_RESPONSE");
  }
  return text;
};

export const invokeGeminiProxy = async (
  request: GeminiProxyRequest,
  options: GeminiProxyInvokeOptions = {},
): Promise<string> => {
  throwIfAborted(options.signal);
  const supabaseConfig = getSupabaseConfig();
  const localApiKey = resolveLocalGeminiApiKey();
  const failures: string[] = [];

  if (supabaseConfig) {
    try {
      return await invokeEdgeProxy(request, supabaseConfig, options);
    } catch (error) {
      if (isAbortError(error) || options.signal?.aborted) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`edge:${message}`);
      logger.warn("Edge Gemini path failed; falling back to local path", {
        message,
      });
    }
  } else {
    failures.push("edge:SUPABASE_NOT_CONFIGURED");
  }

  if (localApiKey) {
    try {
      throwIfAborted(options.signal);
      return await invokeLocalGemini(request, localApiKey, options);
    } catch (error) {
      if (isAbortError(error) || options.signal?.aborted) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`local:${message}`);
      logger.warn("Local Gemini path failed", { message });
    }
  } else {
    failures.push("local:GEMINI_LOCAL_API_KEY_MISSING");
  }

  throw new Error(`GEMINI_ALL_PATHS_FAILED:${failures.join("|")}`);
};
