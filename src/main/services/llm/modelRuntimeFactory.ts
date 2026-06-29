import { settingsManager } from "../../manager/settings/index.js";
import type { SettingsManager } from "../../manager/settings/index.js";
import type { LlmRuntimeInfo } from "../../../shared/types/index.js";
import type * as EmbeddingModelServiceModule from "./embeddingModelService.js";
import { buildRuntimeRoutePlan } from "./runtimeRoutePlanner.js";
import type {
  RuntimeRouteCandidate,
  RuntimeRoutePlan,
  RuntimeRouteProvider,
  RuntimeRouteSupabaseProxy,
} from "../../../shared/types/index.js";
import {
  createGeminiSupabaseProxyResolver,
  createOpenAiSupabaseProxyResolver,
} from "./runtimeProxyConfig.js";
import { isAppPackaged } from "../../utils/env/index.js";

export function invalidateModelRuntimeCache(): void {
  // Runtime clients are materialized in the utility process. This compatibility
  // hook remains for settings-change call sites that invalidate route decisions.
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

const BUNDLED_PROXY_API_KEY_PLACEHOLDER = "__bundled-edge-function__";
const TEST_PROVIDER_HINTS = new Set(["none", "deterministic"]);

type PlannedRuntime =
  | { kind: "sidecar"; candidate: Extract<RuntimeRouteCandidate, { kind: "sidecar" }> }
  | { kind: "gemini"; config: EnvGeminiConfig }
  | { kind: "openai"; config: EnvOpenAiConfig }
  | { kind: "ollama"; config: OllamaConfig }
  | { kind: "deterministic" }
  | { kind: "unavailable" };

type RuntimeKind = RuntimeRouteProvider;
type RequestedProvider = "auto" | RuntimeKind;
type RuntimeProvider = Exclude<PlannedRuntime["kind"], "unavailable">;
type RuntimeBackend = "local-sidecar" | "remote-http" | "test" | null;
type RuntimeSkip = {
  provider: RuntimeProvider;
  code: string;
  message: string;
};
type RuntimeResolution = {
  requestedProvider: RequestedProvider;
  resolved: PlannedRuntime;
  backend: RuntimeBackend;
  fallbackUsed: boolean;
  skipped: RuntimeSkip[];
};

export type RuntimeRoutePlanningResult = {
  preferred: RequestedProvider;
  plan: RuntimeRoutePlan;
};

const proxyErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const loadSettingsManager = (() => {
  let cached: Promise<{ settingsManager: SettingsManager }> | null = null;
  return async () => {
    if (!cached) {
      cached = import("../../domains/settings/index.js") as Promise<{
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

function loadEnvGeminiConfig(): EnvGeminiConfig | null {
  const packaged = isAppPackaged();
  const apiKeyFromEnv =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GCP_API?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    settingsManager.getLlmSettings().geminiApiKey?.trim() ||
    "";
  const model = process.env.GEMINI_MODEL?.trim() ?? "gemini-2.5-flash-lite";
  if (!model) return null;
  const alternativeModel = process.env.ALTERNATIVE_GEMINI_MODEL?.trim() || undefined;
  if (packaged) {
    return {
      apiKey: BUNDLED_PROXY_API_KEY_PLACEHOLDER,
      model,
      alternativeModel,
    };
  }
  if (!apiKeyFromEnv) return null;
  const embeddingModel = process.env.GEMINI_EMBEDDING_MODEL?.trim() || "text-embedding-004";
  return { apiKey: apiKeyFromEnv, model, alternativeModel, embeddingModel };
}

function loadEnvOpenAiConfig(): EnvOpenAiConfig | null {
  const packaged = isAppPackaged();
  const apiKeyFromEnv =
    process.env.OPENAI_API_KEY?.trim() ||
    settingsManager.getLlmSettings().openaiApiKey?.trim() ||
    "";
  const model = process.env.OPENAI_MODEL?.trim() ?? "gpt-5.4-nano";
  if (!model) return null;
  if (packaged) {
    return {
      apiKey: BUNDLED_PROXY_API_KEY_PLACEHOLDER,
      model,
    };
  }
  if (!apiKeyFromEnv) return null;
  const embeddingModel = process.env.OPENAI_EMBEDDING_MODEL?.trim() || undefined;
  return { apiKey: apiKeyFromEnv, model, embeddingModel };
}

function buildSkip(provider: RuntimeProvider, code: string, message: string): RuntimeSkip {
  return { provider, code, message };
}

function backendFor(kind: PlannedRuntime["kind"]): RuntimeBackend {
  if (kind === "sidecar") return "local-sidecar";
  if (kind === "gemini" || kind === "openai" || kind === "ollama") return "remote-http";
  if (kind === "deterministic") return "test";
  return null;
}

function openAiPlanInput(config: EnvOpenAiConfig | null) {
  return config
    ? {
        configured: true as const,
        apiKey: config.apiKey,
        model: config.model,
        embeddingModel: config.embeddingModel,
      }
    : { configured: false as const };
}

function geminiPlanInput(config: EnvGeminiConfig | null) {
  return config
    ? {
        configured: true as const,
        apiKey: config.apiKey,
        model: config.model,
        alternativeModel: config.alternativeModel,
        embeddingModel: config.embeddingModel,
      }
    : { configured: false as const };
}

function ollamaPlanInput(config: OllamaConfig | null) {
  return config
    ? {
        configured: true as const,
        baseUrl: config.baseUrl,
        chatModel: config.chatModel,
        embeddingModel: config.embeddingModel,
        apiKey: config.apiKey,
      }
    : { configured: false as const };
}

const resolveProxyCapability = async (
  resolver: (() => Promise<RuntimeRouteSupabaseProxy>) | undefined,
): Promise<
  | { supabaseProxy: RuntimeRouteSupabaseProxy; supabaseProxyError?: never }
  | { supabaseProxy?: never; supabaseProxyError: string }
  | undefined
> => {
  if (!resolver) return undefined;
  try {
    return { supabaseProxy: await resolver() };
  } catch (error) {
    return { supabaseProxyError: proxyErrorMessage(error) };
  }
};

async function attachSupabaseProxyCapabilities(plan: RuntimeRoutePlan): Promise<RuntimeRoutePlan> {
  const openAiProxy = await resolveProxyCapability(createOpenAiSupabaseProxyResolver());
  const geminiProxy = await resolveProxyCapability(createGeminiSupabaseProxyResolver());

  if (!openAiProxy && !geminiProxy) return plan;

  return {
    ...plan,
    candidates: plan.candidates.map((candidate): RuntimeRouteCandidate => {
      if (candidate.kind === "openai" && openAiProxy) {
        return { ...candidate, ...openAiProxy };
      }
      if (candidate.kind === "gemini" && geminiProxy) {
        return { ...candidate, ...geminiProxy };
      }
      return candidate;
    }),
  };
}

export async function resolveRuntimeRoutePlan(): Promise<RuntimeRoutePlanningResult> {
  if (TEST_PROVIDER_HINTS.has(process.env.LUIE_LLM_PROVIDER_HINT?.trim().toLowerCase() ?? "")) {
    return {
      preferred: "auto",
      plan: {
        requestedProvider: "auto",
        fallbackPolicy: "try-next",
        order: [],
        candidates: [],
        skipped: [
          {
            provider: "deterministic",
            code: "TEST_PROVIDER_HINT",
            message: "Using deterministic runtime from LUIE_LLM_PROVIDER_HINT",
          },
        ],
      },
    };
  }

  let preferred: RequestedProvider = "auto";
  let localLlm:
    | {
      enabled: boolean;
      modelPath?: string;
      binaryPath?: string;
      gpuLayers?: number;
      contextSize?: number;
      cacheRamMiB?: number;
      cacheReuse?: number;
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

  const geminiConfig = loadEnvGeminiConfig();
  const openAiConfig = loadEnvOpenAiConfig();
  const ollamaConfig = await loadOllamaConfig();
  const basePlan = buildRuntimeRoutePlan({
    requestedProvider: preferred,
    localLlm,
    openai: openAiPlanInput(openAiConfig),
    gemini: geminiPlanInput(geminiConfig),
    ollama: ollamaPlanInput(ollamaConfig),
  });
  const plan = await attachSupabaseProxyCapabilities(basePlan);

  return { preferred, plan };
}

async function resolveRuntimePlanDecision(): Promise<RuntimeResolution> {
  const { preferred, plan } = await resolveRuntimeRoutePlan();
  const skipped: RuntimeSkip[] = [];

  const tryResolveKind = (kind: RuntimeKind): PlannedRuntime | null => {
    if (kind === "sidecar") {
      const sidecarCandidate = plan.candidates.find(
        (candidate): candidate is Extract<RuntimeRouteCandidate, { kind: "sidecar" }> =>
          candidate.kind === "sidecar",
      );
      if (!sidecarCandidate) {
        skipped.push(buildSkip("sidecar", "SIDECAR_NOT_CONFIGURED", "Local sidecar is not configured"));
        return null;
      }
      return { kind: "sidecar", candidate: sidecarCandidate };
    }
    if (kind === "gemini") {
      const candidate = plan.candidates.find((item): item is Extract<RuntimeRouteCandidate, { kind: "gemini" }> => item.kind === "gemini");
      if (candidate) {
        return {
          kind: "gemini",
          config: {
            apiKey: candidate.apiKey,
            model: candidate.model,
            alternativeModel: candidate.alternativeModel,
            embeddingModel: candidate.embeddingModel,
          },
        };
      }
      skipped.push(buildSkip("gemini", "PROVIDER_NOT_CONFIGURED", "Gemini is not configured"));
      return null;
    }
    if (kind === "openai") {
      const candidate = plan.candidates.find((item): item is Extract<RuntimeRouteCandidate, { kind: "openai" }> => item.kind === "openai");
      if (candidate) {
        return {
          kind: "openai",
          config: {
            apiKey: candidate.apiKey,
            model: candidate.model,
            embeddingModel: candidate.embeddingModel,
          },
        };
      }
      skipped.push(buildSkip("openai", "PROVIDER_NOT_CONFIGURED", "OpenAI is not configured"));
      return null;
    }
    if (kind === "ollama") {
      const candidate = plan.candidates.find((item): item is Extract<RuntimeRouteCandidate, { kind: "ollama" }> => item.kind === "ollama");
      if (candidate) {
        return {
          kind: "ollama",
          config: {
            baseUrl: candidate.baseUrl,
            chatModel: candidate.model,
            embeddingModel: candidate.embeddingModel,
            apiKey: candidate.apiKey,
          },
        };
      }
      skipped.push(buildSkip("ollama", "PROVIDER_NOT_CONFIGURED", "Ollama is not configured"));
      return null;
    }
    return null;
  };

  for (const kind of plan.order) {
    const resolved = tryResolveKind(kind);
    if (resolved) {
      return {
        requestedProvider: preferred,
        resolved,
        backend: backendFor(resolved.kind),
        fallbackUsed: preferred === "auto" && skipped.length > 0,
        skipped,
      };
    }
    if (plan.fallbackPolicy === "fail-closed") {
      return {
        requestedProvider: preferred,
        resolved: { kind: "unavailable" },
        backend: null,
        fallbackUsed: false,
        skipped,
      };
    }
  }

  return {
    requestedProvider: preferred,
    resolved: { kind: "deterministic" },
    backend: "test",
    fallbackUsed: skipped.length > 0,
    skipped,
  };
}

export async function resolveRuntimeModelConfig(
  _projectId: string,
): Promise<RuntimeModelConfig> {
  const { resolved } = await resolveRuntimePlanDecision();
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
  const resolution = await resolveRuntimePlanDecision();
  const { resolved } = resolution;
  const base = {
    requestedProvider: resolution.requestedProvider,
    resolvedProvider: resolved.kind,
    backend: resolution.backend,
    fallbackUsed: resolution.fallbackUsed,
    ready: resolved.kind !== "unavailable",
    skipped: resolution.skipped,
  } satisfies Partial<LlmRuntimeInfo>;
  if (resolved.kind === "sidecar") {
    return {
      provider: "sidecar",
      model: "llama-server",
      alternativeModel: null,
      ...base,
    };
  }
  if (resolved.kind === "gemini") {
    return {
      provider: "gemini",
      model: resolved.config.model,
      alternativeModel: resolved.config.alternativeModel ?? null,
      ...base,
    };
  }
  if (resolved.kind === "openai") {
    return {
      provider: "openai",
      model: resolved.config.model,
      alternativeModel: null,
      ...base,
    };
  }
  if (resolved.kind === "ollama") {
    return {
      provider: "ollama",
      model: resolved.config.chatModel,
      alternativeModel: null,
      ...base,
    };
  }
  if (resolved.kind === "unavailable") {
    return {
      provider: "unavailable",
      model: "",
      alternativeModel: null,
      ...base,
    };
  }
  return {
    provider: "deterministic",
    model: "fallback",
    alternativeModel: null,
    ...base,
  };
}
