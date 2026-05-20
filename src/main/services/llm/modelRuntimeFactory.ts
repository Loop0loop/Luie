import path from "node:path";
import { access, readFile, readdir } from "node:fs/promises";
import { db } from "../../database/index.js";
import { projectSettings } from "../../database/schema.js";
import { eq } from "drizzle-orm";
import { createLogger } from "../../../shared/logger/index.js";
import type { ModelRuntimeClient } from "./modelRuntimeClient.js";
import { DeterministicProvider } from "./providers/deterministicProvider.js";
import { LlamaCppProvider } from "./providers/llamaCppProvider.js";
import { LlamaServerProvider } from "./providers/llamaServerProvider.js";
import { resolveUserDataPath } from "../../utils/userDataPath.js";

const logger = createLogger("ModelRuntimeFactory");
const deterministicProvider = new DeterministicProvider();
let llamaProviderSingle: { key: string; provider: LlamaCppProvider } | null = null;
let llamaServerProviderSingle: { key: string; provider: LlamaServerProvider } | null = null;

type GlobalLlmSettings = {
  defaultModelPath: string | null;
  defaultEmbeddingModelPath: string | null;
  llmProviderHint: "llamacpp" | "llamaserver" | "none" | null;
  contextSize?: number;
  gpuLayers?: number;
};

type ModelPathCache = {
  expiresAt: number;
  globalLlm: GlobalLlmSettings;
  fallbackModelPath: string | null;
};

const MODEL_PATH_CACHE_TTL_MS = 10_000;
let modelPathCache: ModelPathCache | null = null;
let modelPathCacheInflight: Promise<ModelPathCache> | null = null;

export function invalidateModelRuntimeCache(): void {
  modelPathCache = null;
  modelPathCacheInflight = null;
}

const normalizeProviderHint = (
  value: string | null | undefined,
): "llamacpp" | "llamaserver" | "none" | null => {
  if (value === "llamacpp" || value === "llamaserver" || value === "none") {
    return value;
  }
  return null;
};

async function loadGlobalLlmSettingsFromFile(): Promise<GlobalLlmSettings> {
  try {
    const userDataPath = resolveUserDataPath();
    const settingsPath = path.join(userDataPath, "settings.json");
    const raw = await readFile(settingsPath, "utf8");
    const parsed = JSON.parse(raw) as {
      llm?: {
        defaultModelPath?: string;
        defaultEmbeddingModelPath?: string;
        llmProviderHint?: "llamacpp" | "llamaserver" | "none";
        contextSize?: number;
        gpuLayers?: number;
      };
    };
    return {
      defaultModelPath: parsed.llm?.defaultModelPath ?? null,
      defaultEmbeddingModelPath: parsed.llm?.defaultEmbeddingModelPath ?? null,
      llmProviderHint: parsed.llm?.llmProviderHint ?? null,
      contextSize: typeof parsed.llm?.contextSize === "number" ? parsed.llm.contextSize : undefined,
      gpuLayers: typeof parsed.llm?.gpuLayers === "number" ? parsed.llm.gpuLayers : undefined,
    };
  } catch {
    logger.warn("Failed to load global LLM settings from settings.json", {
      userDataPath: resolveUserDataPath(),
    });
    return {
      defaultModelPath: null,
      defaultEmbeddingModelPath: null,
      llmProviderHint: null,
    };
  }
}

export type ResolvedRuntimeModelConfig = {
  providerHint: "llamacpp" | "llamaserver" | "none" | null;
  effectiveModelPath: string | null;
  effectiveEmbeddingModelPath: string | null;
  configuredContextSize?: number;
  configuredGpuLayers?: number;
  fallbackSource: "settings.json" | "models-dir" | "none";
  hasProjectModelPath: boolean;
};

export async function resolveRuntimeModelConfig(
  projectId: string,
): Promise<ResolvedRuntimeModelConfig> {
  const row = await db.getClient()
    .select({
      llmModelPath: projectSettings.llmModelPath,
      llmEmbeddingModelPath: projectSettings.llmEmbeddingModelPath,
      llmProviderHint: projectSettings.llmProviderHint,
    })
    .from(projectSettings)
    .where(eq(projectSettings.projectId, projectId))
    .limit(1);

  const configuredPath = row[0]?.llmModelPath ?? process.env.LUIE_LLM_MODEL_PATH ?? null;
  const now = Date.now();
  if (!modelPathCache || modelPathCache.expiresAt <= now) {
    if (!modelPathCacheInflight) {
      modelPathCacheInflight = (async (): Promise<ModelPathCache> => {
        const globalLlm = await loadGlobalLlmSettingsFromFile();
        let fallbackModelPath = globalLlm.defaultModelPath;
        if (!fallbackModelPath) {
          fallbackModelPath = await resolveModelPathFromModelsDir();
        }
        if (fallbackModelPath) {
          try {
            await access(fallbackModelPath);
          } catch {
            fallbackModelPath = null;
          }
        }
        const result: ModelPathCache = {
          expiresAt: Date.now() + MODEL_PATH_CACHE_TTL_MS,
          globalLlm,
          fallbackModelPath,
        };
        modelPathCache = result;
        return result;
      })().finally(() => {
        modelPathCacheInflight = null;
      });
    }
    modelPathCache = await modelPathCacheInflight;
  }

  const globalLlm = modelPathCache.globalLlm;
  const fallbackModelPath = modelPathCache.fallbackModelPath;
  const providerHint =
    normalizeProviderHint(row[0]?.llmProviderHint) ??
    normalizeProviderHint(process.env.LUIE_LLM_PROVIDER_HINT) ??
    globalLlm.llmProviderHint ??
    null;
  const envContextSize = Number.parseInt(process.env.LUIE_LLM_CONTEXT_SIZE ?? "", 10);
  const configuredContextSize = Number.isFinite(envContextSize)
    ? envContextSize
    : globalLlm.contextSize;
  const envGpuLayers = Number.parseInt(process.env.LUIE_LLM_GPU_LAYERS ?? "", 10);
  const configuredGpuLayers = Number.isFinite(envGpuLayers)
    ? envGpuLayers
    : globalLlm.gpuLayers;

  const embeddingConfiguredPath =
    row[0]?.llmEmbeddingModelPath ??
    process.env.LUIE_LLM_EMBEDDING_MODEL_PATH ??
    globalLlm.defaultEmbeddingModelPath ??
    null;
  const effectiveModelPath = configuredPath ?? fallbackModelPath;

  return {
    providerHint,
    effectiveModelPath,
    effectiveEmbeddingModelPath: embeddingConfiguredPath,
    configuredContextSize,
    configuredGpuLayers,
    fallbackSource: globalLlm.defaultModelPath ? "settings.json" : fallbackModelPath ? "models-dir" : "none",
    hasProjectModelPath: Boolean(row[0]?.llmModelPath),
  };
}

async function resolveModelPathFromModelsDir(): Promise<string | null> {
  try {
    const modelsDir = path.join(resolveUserDataPath(), "models");
    const entries = await readdir(modelsDir, { withFileTypes: true });
    const candidates = entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".gguf"))
      .map((entry) => path.join(modelsDir, entry.name))
      .sort((a, b) => a.localeCompare(b));
    return candidates[0] ?? null;
  } catch (error) {
    logger.warn("Failed to resolve model from userData/models directory", {
      userDataPath: resolveUserDataPath(),
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

function getOrCreateLlamaProvider(
  modelPath: string,
  embeddingModelPath?: string | null,
  contextSize?: number,
  gpuLayers?: number,
): LlamaCppProvider {
  const key = `${modelPath}::${embeddingModelPath ?? ""}::${contextSize ?? ""}::${gpuLayers ?? ""}`;
  if (llamaProviderSingle?.key === key) {
    return llamaProviderSingle.provider;
  }
  if (llamaProviderSingle && llamaProviderSingle.key !== key) {
    llamaProviderSingle.provider.dispose();
  }
  const provider = new LlamaCppProvider(modelPath, embeddingModelPath, contextSize, gpuLayers);
  llamaProviderSingle = { key, provider };
  return provider;
}

function getOrCreateLlamaServerProvider(
  modelPath: string,
  embeddingModelPath?: string | null,
  contextSize?: number,
  gpuLayers?: number,
): LlamaServerProvider {
  const key = `${modelPath}::${embeddingModelPath ?? ""}::${contextSize ?? ""}::${gpuLayers ?? ""}`;
  if (llamaServerProviderSingle?.key === key) {
    return llamaServerProviderSingle.provider;
  }
  const sharedFallback = getOrCreateLlamaProvider(
    modelPath,
    embeddingModelPath,
    contextSize,
    gpuLayers,
  );
  const provider = new LlamaServerProvider({
    modelPath,
    embeddingModelPath: embeddingModelPath ?? null,
    contextSize,
    gpuLayers,
    fallbackProvider: sharedFallback,
  });
  llamaServerProviderSingle = { key, provider };
  return provider;
}

export async function resolveModelRuntimeClient(
  projectId: string,
): Promise<ModelRuntimeClient> {
  const runtimeConfig = await resolveRuntimeModelConfig(projectId);

  if (runtimeConfig.providerHint === "none") {
    return deterministicProvider;
  }

  const effectiveModelPath = runtimeConfig.effectiveModelPath;
  logger.info("Resolving model runtime client", {
    projectId,
    hasProjectModelPath: runtimeConfig.hasProjectModelPath,
    hasFallbackModelPath: Boolean(runtimeConfig.effectiveModelPath),
    fallbackSource: runtimeConfig.fallbackSource,
    providerHint: runtimeConfig.providerHint,
    hasEmbeddingModelPath: Boolean(runtimeConfig.effectiveEmbeddingModelPath),
    processType: process.type,
  });
  if (effectiveModelPath && runtimeConfig.providerHint === "llamaserver") {
    return getOrCreateLlamaServerProvider(
      effectiveModelPath,
      runtimeConfig.effectiveEmbeddingModelPath,
      runtimeConfig.configuredContextSize,
      runtimeConfig.configuredGpuLayers,
    );
  }
  if (effectiveModelPath && (runtimeConfig.providerHint === "llamacpp" || runtimeConfig.providerHint === null)) {
    return getOrCreateLlamaProvider(
      effectiveModelPath,
      runtimeConfig.effectiveEmbeddingModelPath,
      runtimeConfig.configuredContextSize,
      runtimeConfig.configuredGpuLayers,
    );
  }

  logger.info("LLM provider path is not configured, using deterministic fallback", {
    projectId,
  });
  return deterministicProvider;
}
