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
import { ExternalApiProvider } from "../../services/llm/providers/externalApiProvider.js";
import { GeminiProvider } from "../../services/llm/providers/geminiProvider.js";
import {
  UTILITY_BUNDLED_MODELS_DIR,
  UTILITY_DEFAULT_EMBEDDING_MODEL,
  UTILITY_EMBEDDING_SERVER_DEFAULTS,
} from "./embeddingModelConstants.js";
import {
  utilityEmbeddingSidecarSupervisor,
  utilitySidecarSupervisor,
} from "./sidecarSupervisor.js";

const logger = createLogger("UtilityRuntimeMaterializer");
const deterministicProvider = new DeterministicProvider();
const redactPaths = (value: string): string =>
  value
    .replace(/\/Users\/[^\n\r]+?(?=\s(?:ENOENT|EACCES|EPERM|from|to|at|with|$))/g, "<path>")
    .replace(/(?:\/Users\/[^/\s]+|\/private\/var\/folders|\/var\/folders|\/tmp|\/[A-Za-z0-9._-]+)+(?:\/[^\s:'"]+)*/g, "<path>")
    .replace(/[A-Za-z]:\\[^\s:'"]+/g, "<path>");
const errorMessage = (error: unknown): string =>
  redactPaths(error instanceof Error ? error.message : String(error));

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

function runtimeLogFields(kind: RuntimeRouteCandidate["kind"]): {
  route: RuntimeRouteCandidate["kind"];
  backend: RuntimeRouteCandidate["backend"];
  implementation: string;
} {
  if (kind === "sidecar") {
    return { route: kind, backend: "local-sidecar", implementation: "llama-server" };
  }
  if (kind === "gemini") {
    return { route: kind, backend: "remote-http", implementation: "gemini-api" };
  }
  if (kind === "ollama") {
    return { route: kind, backend: "remote-http", implementation: "ollama-openai-compatible-api" };
  }
  return { route: kind, backend: "remote-http", implementation: "openai-compatible-api" };
}

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
  const filename = UTILITY_DEFAULT_EMBEDDING_MODEL.filename;
  const candidates = [
    typeof process.resourcesPath === "string" && process.resourcesPath.length > 0
      ? path.join(process.resourcesPath, UTILITY_BUNDLED_MODELS_DIR, filename)
      : null,
    path.join(process.cwd(), "resources", UTILITY_BUNDLED_MODELS_DIR, filename),
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
        logger.info("Utility materialized LLM runtime", {
          projectId,
          ...runtimeLogFields("sidecar"),
          baseUrl,
        });
        return getOrCreateSidecarProvider(baseUrl);
      } catch (error) {
        logger.warn("Utility LLM runtime materialization failed", {
          projectId,
          ...runtimeLogFields("sidecar"),
          error: errorMessage(error),
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
  logger.info("Utility LLM runtime unavailable, using deterministic fallback", {
    projectId,
    route: "deterministic",
    backend: "test",
    implementation: "deterministic-provider",
  });
  return deterministicProvider;
}

export async function resolveUtilityEmbeddingRuntimeClient(
  projectId: string,
  plan: RuntimeRoutePlan | undefined,
): Promise<ModelRuntimeClient> {
  if (!plan) {
    logger.warn("Embedding route plan missing, using deterministic fallback", {
      projectId,
      route: "deterministic",
      backend: "test",
      implementation: "deterministic-provider",
    });
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
              gpuLayers: UTILITY_EMBEDDING_SERVER_DEFAULTS.gpuLayers,
              contextSize: UTILITY_EMBEDDING_SERVER_DEFAULTS.contextSize,
            },
          );
          logger.info("Utility materialized embedding runtime", {
            projectId,
            route: "sidecar",
            backend: "local-sidecar",
            implementation: "llama-server",
            baseUrl,
            modelId: UTILITY_DEFAULT_EMBEDDING_MODEL.modelId,
          });
          return getOrCreateLocalEmbeddingProvider(baseUrl, UTILITY_DEFAULT_EMBEDDING_MODEL.modelId);
        } catch (error) {
          logger.warn("Utility embedding runtime materialization failed; trying next route", {
            projectId,
            route: "sidecar",
            backend: "local-sidecar",
            implementation: "llama-server",
            error: errorMessage(error),
          });
          if (plan.fallbackPolicy === "fail-closed") throw error;
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

  logger.info("Utility embedding runtime unavailable, using FTS-only fallback", {
    projectId,
    route: "deterministic",
    backend: "test",
    implementation: "fts-only-fallback",
  });
  return deterministicProvider;
}
