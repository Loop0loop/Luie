import * as fs from "node:fs";
import * as path from "node:path";
import { createLogger } from "../../../shared/logger/index.js";
import type {
  RuntimeRouteCandidate,
  RuntimeRoutePlan,
  RuntimeRouteSupabaseProxy,
} from "../../../shared/types/index.js";
import type {
  ModelRuntimeClient,
  RuntimeSupabaseProxyResolver,
} from "../../services/llm/modelRuntimeClient.js";
import { DeterministicProvider } from "../../services/llm/providers/deterministicProvider.js";
import {
  BUNDLED_MODELS_DIR,
  DEFAULT_EMBEDDING_MODEL,
  EMBEDDING_SERVER_DEFAULTS,
} from "../../services/llm/embeddingModelConstants.js";
import { ExternalApiProvider } from "../../services/llm/providers/externalApiProvider.js";
import { GeminiProvider } from "../../services/llm/providers/geminiProvider.js";
import {
  utilityEmbeddingSidecarSupervisor,
  utilitySidecarSupervisor,
} from "./sidecarSupervisor.js";

const logger = createLogger("UtilityRuntimeMaterializer");
const deterministicProvider = new DeterministicProvider();

let sidecarProviderSingle: { key: string; provider: ExternalApiProvider } | null = null;
let openAiProviderSingle: { key: string; provider: ExternalApiProvider } | null = null;
let ollamaProviderSingle: { key: string; provider: ExternalApiProvider } | null = null;
let geminiProviderSingle: { key: string; provider: GeminiProvider } | null = null;
let localEmbeddingProviderSingle: { key: string; provider: ExternalApiProvider } | null = null;

const candidateFor = <Kind extends RuntimeRouteCandidate["kind"]>(
  plan: RuntimeRoutePlan,
  kind: Kind,
): Extract<RuntimeRouteCandidate, { kind: Kind }> | null =>
  (plan.candidates.find((candidate) => candidate.kind === kind) as
    | Extract<RuntimeRouteCandidate, { kind: Kind }>
    | undefined) ?? null;

function proxyResolverForCandidate(candidate: {
  supabaseProxy?: RuntimeRouteSupabaseProxy;
  supabaseProxyError?: string;
}): RuntimeSupabaseProxyResolver | undefined {
  if (candidate.supabaseProxy) {
    return async () => candidate.supabaseProxy!;
  }
  if (candidate.supabaseProxyError) {
    return async () => {
      throw new Error(candidate.supabaseProxyError);
    };
  }
  return undefined;
}

function getOrCreateSidecarProvider(baseUrl: string): ExternalApiProvider {
  if (sidecarProviderSingle?.key === baseUrl) return sidecarProviderSingle.provider;
  const provider = new ExternalApiProvider({
    baseUrl,
    chatModel: "local",
    apiKey: "no-key",
  });
  sidecarProviderSingle = { key: baseUrl, provider };
  return provider;
}

function getOrCreateOpenAiProvider(
  candidate: Extract<RuntimeRouteCandidate, { kind: "openai" }>,
): ExternalApiProvider {
  const key = `${candidate.baseUrl}::${candidate.model}::${candidate.embeddingModel ?? ""}::${candidate.apiKey}`;
  if (openAiProviderSingle?.key === key) return openAiProviderSingle.provider;
  const provider = new ExternalApiProvider({
    baseUrl: candidate.baseUrl,
    apiKey: candidate.apiKey,
    chatModel: candidate.model,
    embeddingModel: candidate.embeddingModel,
    supabaseProxy: proxyResolverForCandidate(candidate),
  });
  openAiProviderSingle = { key, provider };
  return provider;
}

function getOrCreateOllamaProvider(
  candidate: Extract<RuntimeRouteCandidate, { kind: "ollama" }>,
): ExternalApiProvider {
  const key = `${candidate.baseUrl}::${candidate.model}::${candidate.embeddingModel ?? ""}::${candidate.apiKey ?? ""}`;
  if (ollamaProviderSingle?.key === key) return ollamaProviderSingle.provider;
  const provider = new ExternalApiProvider({
    baseUrl: candidate.baseUrl,
    apiKey: candidate.apiKey,
    chatModel: candidate.model,
    embeddingModel: candidate.embeddingModel,
  });
  ollamaProviderSingle = { key, provider };
  return provider;
}

function getOrCreateGeminiProvider(
  candidate: Extract<RuntimeRouteCandidate, { kind: "gemini" }>,
): GeminiProvider {
  const key = `${candidate.model}::${candidate.alternativeModel ?? ""}::${candidate.embeddingModel ?? ""}::${candidate.apiKey}`;
  if (geminiProviderSingle?.key === key) return geminiProviderSingle.provider;
  const provider = new GeminiProvider({
    apiKey: candidate.apiKey,
    model: candidate.model,
    alternativeModel: candidate.alternativeModel,
    embeddingModel: candidate.embeddingModel,
    supabaseProxy: proxyResolverForCandidate(candidate),
  });
  geminiProviderSingle = { key, provider };
  return provider;
}

export function resolveUtilityEmbeddingModelPath(): string | null {
  const filename = DEFAULT_EMBEDDING_MODEL.filename;
  const candidates = [
    typeof process.resourcesPath === "string" && process.resourcesPath.length > 0
      ? path.join(process.resourcesPath, BUNDLED_MODELS_DIR, filename)
      : null,
    path.join(process.cwd(), "resources", BUNDLED_MODELS_DIR, filename),
    process.env.LUIE_USER_DATA_PATH
      ? path.join(process.env.LUIE_USER_DATA_PATH, "llm-models", filename)
      : null,
  ].filter((item): item is string => typeof item === "string" && item.length > 0);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function getOrCreateLocalEmbeddingProvider(
  baseUrl: string,
  modelId: string,
): ExternalApiProvider {
  const key = `${baseUrl}::${modelId}`;
  if (localEmbeddingProviderSingle?.key === key) return localEmbeddingProviderSingle.provider;
  const provider = new ExternalApiProvider({
    baseUrl: `${baseUrl.replace(/\/$/, "")}/v1`,
    chatModel: "local",
    embeddingModel: modelId,
    apiKey: "no-key",
  });
  localEmbeddingProviderSingle = { key, provider };
  return provider;
}

export async function resolveUtilityModelRuntimeClient(
  projectId: string,
  plan: RuntimeRoutePlan | undefined,
): Promise<ModelRuntimeClient> {
  if (!plan) {
    throw new Error("Runtime route plan is missing");
  }

  for (const kind of plan.order) {
    if (kind === "sidecar") {
      const candidate = candidateFor(plan, "sidecar");
      if (!candidate) {
        if (plan.fallbackPolicy === "fail-closed") break;
        continue;
      }
      try {
        // eslint-disable-next-line no-await-in-loop -- providers must be materialized in route priority order.
        const { baseUrl } = await utilitySidecarSupervisor.ensureStarted(
          candidate.binaryPath,
          candidate.modelPath,
          candidate.options,
        );
        logger.info("Utility materialized sidecar runtime", { projectId, baseUrl });
        return getOrCreateSidecarProvider(baseUrl);
      } catch (error) {
        logger.warn("Utility sidecar materialization failed", {
          projectId,
          error: error instanceof Error ? error.message : String(error),
        });
        if (plan.fallbackPolicy === "fail-closed") throw error;
        continue;
      }
    }
    if (kind === "openai") {
      const candidate = candidateFor(plan, "openai");
      if (candidate) return getOrCreateOpenAiProvider(candidate);
      if (plan.fallbackPolicy === "fail-closed") break;
      continue;
    }
    if (kind === "gemini") {
      const candidate = candidateFor(plan, "gemini");
      if (candidate) return getOrCreateGeminiProvider(candidate);
      if (plan.fallbackPolicy === "fail-closed") break;
      continue;
    }
    if (kind === "ollama") {
      const candidate = candidateFor(plan, "ollama");
      if (candidate) return getOrCreateOllamaProvider(candidate);
      if (plan.fallbackPolicy === "fail-closed") break;
    }
  }

  if (plan.fallbackPolicy === "fail-closed") {
    const firstSkip = plan.skipped[0];
    throw new Error(firstSkip?.message ?? "LLM runtime unavailable");
  }
  logger.info("Utility runtime unavailable, using deterministic fallback", { projectId });
  return deterministicProvider;
}

export async function resolveUtilityEmbeddingRuntimeClient(
  projectId: string,
  plan: RuntimeRoutePlan | undefined,
): Promise<ModelRuntimeClient> {
  if (!plan) {
    logger.warn("Embedding route plan missing, using deterministic fallback", { projectId });
    return deterministicProvider;
  }

  for (const kind of plan.order) {
    if (kind === "sidecar") {
      const candidate = candidateFor(plan, "sidecar");
      const embeddingModelPath = resolveUtilityEmbeddingModelPath();
      if (candidate && embeddingModelPath) {
        try {
          // eslint-disable-next-line no-await-in-loop -- embedding providers follow route priority order.
          const { baseUrl } = await utilityEmbeddingSidecarSupervisor.ensureStarted(
            candidate.binaryPath,
            embeddingModelPath,
            {
              gpuLayers: EMBEDDING_SERVER_DEFAULTS.gpuLayers,
              contextSize: EMBEDDING_SERVER_DEFAULTS.contextSize,
            },
          );
          logger.info("Utility materialized local embedding sidecar", {
            projectId,
            baseUrl,
            modelId: DEFAULT_EMBEDDING_MODEL.modelId,
          });
          return getOrCreateLocalEmbeddingProvider(baseUrl, DEFAULT_EMBEDDING_MODEL.modelId);
        } catch (error) {
          logger.warn("Utility local embedding sidecar unavailable; trying next embedding route", {
            projectId,
            error: error instanceof Error ? error.message : String(error),
          });
          if (plan.fallbackPolicy === "fail-closed") return deterministicProvider;
        }
      }
      continue;
    }
    if (kind === "openai") {
      const candidate = candidateFor(plan, "openai");
      if (candidate?.embeddingModel) return getOrCreateOpenAiProvider(candidate);
      continue;
    }
    if (kind === "gemini") {
      const candidate = candidateFor(plan, "gemini");
      if (candidate?.embeddingModel) return getOrCreateGeminiProvider(candidate);
      continue;
    }
    if (kind === "ollama") {
      const candidate = candidateFor(plan, "ollama");
      if (candidate?.embeddingModel) return getOrCreateOllamaProvider(candidate);
    }
  }

  logger.info("Utility embedding runtime unavailable, using FTS-only fallback", { projectId });
  return deterministicProvider;
}
