import { createLogger } from "../../../../shared/logger/index.js";
import type { RuntimeSupabaseConfig } from "../../../../shared/types/index.js";
import { getSupabaseConfig } from "../supabaseEnv.js";
import { syncService } from "../syncService.js";

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

type GeminiProxyResponse = {
  text?: unknown;
  candidates?: unknown;
};

type HttpError = Error & { status?: number };

const toHttpError = (status: number, message: string): HttpError => {
  const error = new Error(message) as HttpError;
  error.status = status;
  return error;
};

const resolveProxyEndpoint = (
  config: RuntimeSupabaseConfig,
): string => {
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
      part && typeof part === "object" ? pickText((part as { text?: unknown }).text) : null
    )
    .filter((item): item is string => Boolean(item));
  if (texts.length === 0) return null;
  return texts.join("\n").trim();
};

export const invokeGeminiProxy = async (
  request: GeminiProxyRequest,
): Promise<string> => {
  const supabaseConfig = getSupabaseConfig();
  if (!supabaseConfig) {
    throw new Error(
      "SUPABASE_NOT_CONFIGURED: runtime configuration is not completed. Set Supabase URL/Anon Key first.",
    );
  }

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
  });

  if (!response.ok) {
    const body = await response.text();
    logger.warn("gemini-proxy request failed", {
      endpoint,
      status: response.status,
      body,
    });
    throw toHttpError(response.status, `GEMINI_PROXY_FAILED:${response.status}:${body}`);
  }

  const payload = (await response.json()) as GeminiProxyResponse;
  const text = pickText(payload.text) ?? extractTextFromCandidates(payload.candidates);
  if (!text) {
    throw new Error("GEMINI_PROXY_EMPTY_RESPONSE");
  }
  return text;
};
