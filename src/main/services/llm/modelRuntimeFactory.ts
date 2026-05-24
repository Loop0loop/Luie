import { createLogger } from "../../../shared/logger/index.js";
import type { ModelRuntimeClient } from "./modelRuntimeClient.js";
import { DeterministicProvider } from "./providers/deterministicProvider.js";
import { ExternalApiProvider } from "./providers/externalApiProvider.js";
import { GeminiProvider } from "./providers/geminiProvider.js";
import type { SettingsManager } from "../../manager/settingsManager.js";
import type { LlmRuntimeInfo } from "../../../shared/types/index.js";

const logger = createLogger("ModelRuntimeFactory");
const deterministicProvider = new DeterministicProvider();
let externalApiProviderSingle: { key: string; provider: ExternalApiProvider } | null = null;
let openAiProviderSingle: { key: string; provider: ExternalApiProvider } | null = null;
let geminiProviderSingle: { key: string; provider: GeminiProvider } | null = null;

export function invalidateModelRuntimeCache(): void {
  externalApiProviderSingle = null;
  openAiProviderSingle = null;
  geminiProviderSingle = null;
}

type OllamaConfig = {
  baseUrl: string;
  chatModel: string;
  embeddingModel?: string;
  apiKey?: string;
};

export type RuntimeModelConfig = {
  providerHint: "gemini" | "openai" | "externalapi" | "deterministic";
  embeddingModel: string | null;
};

type EnvGeminiConfig = {
  apiKey: string;
  model: string;
  alternativeModel?: string;
  embeddingModel?: string;
};

type EnvOpenAiConfig = {
  apiKey: string;
  model: string;
  embeddingModel?: string;
};

type ResolvedRuntime =
  | { kind: "gemini"; config: EnvGeminiConfig }
  | { kind: "openai"; config: EnvOpenAiConfig }
  | { kind: "ollama"; config: OllamaConfig }
  | { kind: "deterministic" };

const loadSettingsManager = (() => {
  let cached: Promise<{ settingsManager: SettingsManager }> | null = null;
  return async () => {
    if (!cached) {
      cached = import("../../manager/settingsManager.js") as Promise<{
        settingsManager: SettingsManager;
      }>;
    }
    const module = await cached;
    return module.settingsManager;
  };
})();

async function loadOllamaConfig(): Promise<OllamaConfig | null> {
  try {
    const settingsManager = await loadSettingsManager();
    const ollama = settingsManager.getLlmSettings().ollama;
    if (ollama?.baseUrl && ollama?.chatModel) {
      return {
        baseUrl: ollama.baseUrl,
        chatModel: ollama.chatModel,
        embeddingModel: ollama.embeddingModel,
        apiKey: ollama.apiKey,
      };
    }
    return null;
  } catch {
    return null;
  }
}

function getOrCreateExternalApiProvider(config: OllamaConfig): ExternalApiProvider {
  const key = `${config.baseUrl}::${config.chatModel}::${config.embeddingModel ?? ""}::${config.apiKey ?? ""}`;
  if (externalApiProviderSingle?.key === key) {
    return externalApiProviderSingle.provider;
  }
  const provider = new ExternalApiProvider(config);
  externalApiProviderSingle = { key, provider };
  return provider;
}

function getOrCreateOpenAiProvider(config: EnvOpenAiConfig): ExternalApiProvider {
  const key = `${config.model}::${config.embeddingModel ?? ""}::${config.apiKey}`;
  if (openAiProviderSingle?.key === key) {
    return openAiProviderSingle.provider;
  }
  const provider = new ExternalApiProvider({
    baseUrl: "https://api.openai.com/v1",
    apiKey: config.apiKey,
    chatModel: config.model,
    embeddingModel: config.embeddingModel,
  });
  openAiProviderSingle = { key, provider };
  return provider;
}

function getOrCreateGeminiProvider(config: EnvGeminiConfig): GeminiProvider {
  const key = `${config.model}::${config.alternativeModel ?? ""}::${config.embeddingModel ?? ""}::${config.apiKey}`;
  if (geminiProviderSingle?.key === key) {
    return geminiProviderSingle.provider;
  }
  const provider = new GeminiProvider(config);
  geminiProviderSingle = { key, provider };
  return provider;
}

function loadEnvGeminiConfig(): EnvGeminiConfig | null {
  const apiKey =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GCP_API?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    "";
  const model = process.env.GEMINI_MODEL?.trim() ?? "gemini-2.5-flash-lite";
  if (!apiKey || !model) return null;
  const alternativeModel = process.env.ALTERNATIVE_GEMINI_MODEL?.trim() || undefined;
  const embeddingModel = process.env.GEMINI_EMBEDDING_MODEL?.trim() || "text-embedding-004";
  return { apiKey, model, alternativeModel, embeddingModel };
}

function loadEnvOpenAiConfig(): EnvOpenAiConfig | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  const model = process.env.OPENAI_MODEL?.trim() ?? "gpt-5.4-nano";
  if (!apiKey || !model) return null;
  const embeddingModel = process.env.OPENAI_EMBEDDING_MODEL?.trim() || undefined;
  return { apiKey, model, embeddingModel };
}

async function resolveRuntime(): Promise<ResolvedRuntime> {
  const geminiConfig = loadEnvGeminiConfig();
  if (geminiConfig) {
    return { kind: "gemini", config: geminiConfig };
  }
  const openAiConfig = loadEnvOpenAiConfig();
  if (openAiConfig) {
    return { kind: "openai", config: openAiConfig };
  }
  const ollamaConfig = await loadOllamaConfig();
  if (ollamaConfig) {
    return { kind: "ollama", config: ollamaConfig };
  }
  return { kind: "deterministic" };
}

export async function resolveModelRuntimeClient(
  projectId: string,
): Promise<ModelRuntimeClient> {
  const resolved = await resolveRuntime();
  if (resolved.kind === "gemini") {
    logger.info("Using Gemini provider", { projectId, model: resolved.config.model });
    return getOrCreateGeminiProvider(resolved.config);
  }
  if (resolved.kind === "openai") {
    logger.info("Using OpenAI provider", { projectId, model: resolved.config.model });
    return getOrCreateOpenAiProvider(resolved.config);
  }
  if (resolved.kind === "ollama") {
    logger.info("Using Ollama provider", {
      projectId,
      baseUrl: resolved.config.baseUrl,
      chatModel: resolved.config.chatModel,
    });
    return getOrCreateExternalApiProvider(resolved.config);
  }
  logger.info("Ollama not configured, using deterministic fallback", { projectId });
  return deterministicProvider;
}

export async function resolveRuntimeModelConfig(
  _projectId: string,
): Promise<RuntimeModelConfig> {
  const resolved = await resolveRuntime();
  if (resolved.kind === "gemini") {
    return {
      providerHint: "gemini",
      embeddingModel: resolved.config.embeddingModel ?? null,
    };
  }
  if (resolved.kind === "openai") {
    return {
      providerHint: "openai",
      embeddingModel: resolved.config.embeddingModel ?? null,
    };
  }
  if (resolved.kind === "ollama") {
    return {
      providerHint: "externalapi",
      embeddingModel: resolved.config.embeddingModel ?? null,
    };
  }
  return {
    providerHint: "deterministic",
    embeddingModel: null,
  };
}

export async function resolveRuntimeModelInfo(): Promise<LlmRuntimeInfo> {
  const resolved = await resolveRuntime();
  if (resolved.kind === "gemini") {
    return {
      provider: "gemini",
      model: resolved.config.model,
      alternativeModel: resolved.config.alternativeModel ?? null,
    };
  }
  if (resolved.kind === "openai") {
    return {
      provider: "openai",
      model: resolved.config.model,
      alternativeModel: null,
    };
  }
  if (resolved.kind === "ollama") {
    return {
      provider: "ollama",
      model: resolved.config.chatModel,
      alternativeModel: null,
    };
  }
  return {
    provider: "deterministic",
    model: "fallback",
    alternativeModel: null,
  };
}
