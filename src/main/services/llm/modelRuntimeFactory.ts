import { createLogger } from "../../../shared/logger/index.js";
import type { ModelRuntimeClient } from "./modelRuntimeClient.js";
import { DeterministicProvider } from "./providers/deterministicProvider.js";
import { ExternalApiProvider } from "./providers/externalApiProvider.js";
import { GeminiProvider } from "./providers/geminiProvider.js";
import type { SettingsManager } from "../../manager/settingsManager.js";
import type { LlmRuntimeInfo } from "../../../shared/types/index.js";
import type * as EmbeddingModelServiceModule from "./embeddingModelService.js";
import type * as EmbeddingSidecarManagerModule from "./embeddingSidecarManager.js";

const logger = createLogger("ModelRuntimeFactory");
const deterministicProvider = new DeterministicProvider();
let externalApiProviderSingle: { key: string; provider: ExternalApiProvider } | null = null;
let openAiProviderSingle: { key: string; provider: ExternalApiProvider } | null = null;
let geminiProviderSingle: { key: string; provider: GeminiProvider } | null = null;
let sidecarProviderSingle: { key: string; provider: ExternalApiProvider } | null = null;

export function invalidateModelRuntimeCache(): void {
  externalApiProviderSingle = null;
  openAiProviderSingle = null;
  geminiProviderSingle = null;
  sidecarProviderSingle = null;
  embeddingProviderSingle = null;
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
  | { kind: "sidecar"; config: { baseUrl: string } }
  | { kind: "gemini"; config: EnvGeminiConfig }
  | { kind: "openai"; config: EnvOpenAiConfig }
  | { kind: "ollama"; config: OllamaConfig }
  | { kind: "deterministic" };

type RuntimeKind = ResolvedRuntime["kind"];

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

const loadEmbeddingModelService = (() => {
  let cached: Promise<typeof EmbeddingModelServiceModule> | null = null;
  return async () => {
    if (!cached) cached = import("./embeddingModelService.js");
    return cached;
  };
})();

const loadEmbeddingSidecarManager = (() => {
  let cached: Promise<typeof EmbeddingSidecarManagerModule> | null = null;
  return async () => {
    if (!cached) cached = import("./embeddingSidecarManager.js");
    return cached;
  };
})();

let embeddingProviderSingle: { key: string; provider: ExternalApiProvider } | null = null;

/** 로컬 임베딩 모델이 확보되어 있으면 그 modelId 를, 없으면 null 을 반환한다. */
async function resolveLocalEmbeddingModelId(): Promise<string | null> {
  try {
    const { embeddingModelService } = await loadEmbeddingModelService();
    const status = embeddingModelService.getStatus();
    return status.installed ? status.modelId : null;
  } catch {
    return null;
  }
}

const loadSidecarManager = (() => {
  let cached: Promise<{ sidecarManager: { ensureStarted: (
    binaryPath: string,
    modelPath: string,
    options?: { gpuLayers?: number; contextSize?: number; signal?: AbortSignal },
  ) => Promise<string> } }> | null = null;
  return async () => {
    if (!cached) {
      cached = import("./sidecarManager.js") as Promise<{
        sidecarManager: {
          ensureStarted: (
            binaryPath: string,
            modelPath: string,
            options?: { gpuLayers?: number; contextSize?: number; signal?: AbortSignal },
          ) => Promise<string>;
        };
      }>;
    }
    return cached;
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
  let preferred: "auto" | "sidecar" | "ollama" | "openai" | "gemini" = "auto";
  let localLlm:
    | {
      enabled: boolean;
      modelPath?: string;
      binaryPath?: string;
      gpuLayers?: number;
      contextSize?: number;
    }
    | undefined;

  try {
    const settingsManager = await loadSettingsManager();
    const llmSettings = settingsManager.getLlmSettings();
    preferred = llmSettings.preferredProvider ?? "auto";
    localLlm = settingsManager.getLocalLlmSettings();
  } catch {
    // Settings may be unavailable during tests or early startup. Continue with defaults.
  }

  const tryResolveKind = async (kind: RuntimeKind): Promise<ResolvedRuntime | null> => {
    if (kind === "sidecar") {
      if (!(localLlm?.enabled && localLlm.modelPath && localLlm.binaryPath)) return null;
      try {
        const { sidecarManager } = await loadSidecarManager();
        const baseUrl = await sidecarManager.ensureStarted(
          localLlm.binaryPath,
          localLlm.modelPath,
          {
            gpuLayers: localLlm.gpuLayers,
            contextSize: localLlm.contextSize,
          },
        );
        return { kind: "sidecar", config: { baseUrl } };
      } catch (error) {
        logger.warn("Sidecar start failed, falling through", { error });
        return null;
      }
    }
    if (kind === "gemini") {
      const geminiConfig = loadEnvGeminiConfig();
      return geminiConfig ? { kind: "gemini", config: geminiConfig } : null;
    }
    if (kind === "openai") {
      const openAiConfig = loadEnvOpenAiConfig();
      return openAiConfig ? { kind: "openai", config: openAiConfig } : null;
    }
    if (kind === "ollama") {
      const ollamaConfig = await loadOllamaConfig();
      return ollamaConfig ? { kind: "ollama", config: ollamaConfig } : null;
    }
    return null;
  };

  const defaultOrder: RuntimeKind[] = ["sidecar", "gemini", "openai", "ollama"];
  const orderedKinds: RuntimeKind[] = preferred === "auto"
    ? defaultOrder
    : [preferred, ...defaultOrder.filter((kind) => kind !== preferred)];

  for (const kind of orderedKinds) {
    // eslint-disable-next-line no-await-in-loop -- Runtime providers are intentionally probed in priority order.
    const resolved = await tryResolveKind(kind);
    if (resolved) return resolved;
  }

  return { kind: "deterministic" };
}

export async function resolveModelRuntimeClient(
  projectId: string,
): Promise<ModelRuntimeClient> {
  const resolved = await resolveRuntime();
  if (resolved.kind === "sidecar") {
    logger.info("Using local LLM sidecar", { projectId, baseUrl: resolved.config.baseUrl });
    const key = resolved.config.baseUrl;
    if (sidecarProviderSingle?.key === key) return sidecarProviderSingle.provider;
    const provider = new ExternalApiProvider({
      baseUrl: resolved.config.baseUrl,
      chatModel: "local",
      apiKey: "no-key",
    });
    sidecarProviderSingle = { key, provider };
    return provider;
  }
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
  if (resolved.kind === "sidecar") {
    // 로컬 임베딩 모델(bge-m3)이 확보되어 있으면 그 식별자를 signature 로 사용한다.
    // 이로써 embeddingProjector 가 임베딩 잡을 skip 하지 않고, 모델 변경 시 재임베딩한다.
    const embeddingModel = await resolveLocalEmbeddingModelId();
    return {
      providerHint: "externalapi",
      embeddingModel,
    };
  }
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
  if (resolved.kind === "sidecar") {
    return {
      provider: "sidecar",
      model: "llama-server",
      alternativeModel: null,
    };
  }
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

/**
 * 임베딩 전용 런타임 클라이언트를 해석한다.
 *
 * 우선순위:
 *   1) 클라우드/외부 provider 가 임베딩 모델과 함께 활성이면 그 생성 런타임을 재사용
 *      (ExternalApiProvider/Gemini 는 embed 를 자체 지원).
 *   2) 로컬(sidecar 또는 모델 동봉) 이면 임베딩 전용 llama-server 를 띄워
 *      bge-m3 로 `/v1/embeddings` 를 제공하는 ExternalApiProvider 반환.
 *   3) 어느 것도 불가하면 deterministic(embed=null) → 임베딩 skip, FTS 폴백(R1.2).
 *
 * 격리(P1): 임베딩 sidecar 기동 실패는 throw 하지 않고 deterministic 으로 폴백한다.
 */
export async function resolveEmbeddingRuntimeClient(
  projectId: string,
): Promise<ModelRuntimeClient> {
  const resolved = await resolveRuntime();

  // 1) 클라우드/외부 provider 가 임베딩을 지원하면 생성 런타임 재사용.
  if (resolved.kind === "gemini" && resolved.config.embeddingModel) {
    return getOrCreateGeminiProvider(resolved.config);
  }
  if (resolved.kind === "openai" && resolved.config.embeddingModel) {
    return getOrCreateOpenAiProvider(resolved.config);
  }
  if (resolved.kind === "ollama" && resolved.config.embeddingModel) {
    return getOrCreateExternalApiProvider(resolved.config);
  }

  // 2) 로컬 임베딩: 전용 임베딩 sidecar + bge-m3.
  try {
    const settingsManager = await loadSettingsManager();
    const localLlm = settingsManager.getLocalLlmSettings();
    const binaryPath = localLlm?.binaryPath;
    if (!binaryPath) {
      return deterministicProvider;
    }

    const { embeddingModelService } = await loadEmbeddingModelService();
    const status = embeddingModelService.getStatus();
    if (!status.installed || !status.path) {
      // 임베딩 모델 미설치 → 임베딩 skip.
      return deterministicProvider;
    }

    const { embeddingSidecarManager } = await loadEmbeddingSidecarManager();
    const baseUrl = await embeddingSidecarManager.ensureStarted(binaryPath, status.path);
    if (!baseUrl) {
      // 기동 실패/쿨다운 → FTS 폴백.
      return deterministicProvider;
    }

    const key = `${baseUrl}::${status.modelId}`;
    if (embeddingProviderSingle?.key === key) {
      return embeddingProviderSingle.provider;
    }
    const provider = new ExternalApiProvider({
      baseUrl: `${baseUrl}/v1`,
      chatModel: "local",
      embeddingModel: status.modelId,
      apiKey: "no-key",
    });
    embeddingProviderSingle = { key, provider };
    logger.info("Using local embedding sidecar", { projectId, baseUrl, modelId: status.modelId });
    return provider;
  } catch (error) {
    logger.warn("Failed to resolve local embedding runtime; falling back to FTS-only", {
      projectId,
      error: error instanceof Error ? error.message : String(error),
    });
    return deterministicProvider;
  }
}
