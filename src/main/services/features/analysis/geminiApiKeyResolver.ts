import { createLogger } from "../../../../shared/logger/index.js";
import { getSupabaseConfig } from "../supabaseEnv.js";

const logger = createLogger("GeminiApiKeyResolver");
const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedApiKey: string | null = null;
let cachedAt = 0;

type LuieEnvPayload = {
  geminiApiKey?: unknown;
  GEMINI_API_KEY?: unknown;
  data?: {
    geminiApiKey?: unknown;
    GEMINI_API_KEY?: unknown;
  };
  secrets?: {
    geminiApiKey?: unknown;
    GEMINI_API_KEY?: unknown;
  };
};

const pickString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const extractApiKey = (payload: LuieEnvPayload): string | null =>
  pickString(payload.geminiApiKey) ??
  pickString(payload.GEMINI_API_KEY) ??
  pickString(payload.data?.geminiApiKey) ??
  pickString(payload.data?.GEMINI_API_KEY) ??
  pickString(payload.secrets?.geminiApiKey) ??
  pickString(payload.secrets?.GEMINI_API_KEY);

const resolveEdgeFunctionUrl = (): { url: string; anonKey: string } | null => {
  const customUrl = pickString(process.env.LUIE_ENV_FUNCTION_URL);
  const config = getSupabaseConfig();

  if (customUrl && config?.anonKey) {
    return { url: customUrl, anonKey: config.anonKey };
  }

  if (!config) {
    return null;
  }

  return {
    url: `${config.url}/functions/v1/luieEnv`,
    anonKey: config.anonKey,
  };
};

const fetchApiKeyFromEdgeFunction = async (): Promise<string | null> => {
  const endpoint = resolveEdgeFunctionUrl();
  if (!endpoint) {
    return null;
  }

  try {
    const response = await fetch(endpoint.url, {
      method: "GET",
      headers: {
        apikey: endpoint.anonKey,
        Authorization: `Bearer ${endpoint.anonKey}`,
      },
    });

    if (!response.ok) {
      logger.warn("Supabase luieEnv request failed", {
        status: response.status,
        endpoint: endpoint.url,
      });
      return null;
    }

    const payload = (await response.json()) as LuieEnvPayload;
    const apiKey = extractApiKey(payload);
    if (!apiKey) {
      logger.warn("Supabase luieEnv response missing GEMINI_API_KEY", {
        endpoint: endpoint.url,
      });
      return null;
    }

    return apiKey;
  } catch (error) {
    logger.warn("Supabase luieEnv request threw", {
      endpoint: endpoint.url,
      error,
    });
    return null;
  }
};

export const resolveGeminiApiKey = async (): Promise<string | null> => {
  const envApiKey = pickString(process.env.GEMINI_API_KEY);
  if (envApiKey) {
    return envApiKey;
  }

  if (cachedApiKey && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedApiKey;
  }

  const fetched = await fetchApiKeyFromEdgeFunction();
  if (!fetched) {
    return null;
  }

  cachedApiKey = fetched;
  cachedAt = Date.now();
  logger.info("Using GEMINI_API_KEY from Supabase luieEnv edge function");
  return fetched;
};
