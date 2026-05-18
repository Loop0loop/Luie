import { db } from "../../database/index.js";
import { projectSettings } from "../../database/schema.js";
import { eq } from "drizzle-orm";
import { createLogger } from "../../../shared/logger/index.js";
import type { ModelRuntimeClient } from "./modelRuntimeClient.js";
import { DeterministicProvider } from "./providers/deterministicProvider.js";
import { LlamaCppProvider } from "./providers/llamaCppProvider.js";
import { LlamaServerProvider } from "./providers/llamaServerProvider.js";
import { settingsManager } from "../../manager/settingsManager.js";

const logger = createLogger("ModelRuntimeFactory");
const deterministicProvider = new DeterministicProvider();
let llamaProviderSingle: { key: string; provider: LlamaCppProvider } | null = null;
let llamaServerProviderSingle: { key: string; provider: LlamaServerProvider } | null = null;

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
  const provider = new LlamaCppProvider(modelPath, embeddingModelPath, contextSize, gpuLayers);
  llamaProviderSingle = { key, provider };
  return provider;
}

function getOrCreateLlamaServerProvider(modelPath: string): LlamaServerProvider {
  const key = modelPath;
  if (llamaServerProviderSingle?.key === key) {
    return llamaServerProviderSingle.provider;
  }
  const provider = new LlamaServerProvider({ modelPath });
  llamaServerProviderSingle = { key, provider };
  return provider;
}

export async function resolveModelRuntimeClient(
  projectId: string,
): Promise<ModelRuntimeClient> {
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
  const embeddingConfiguredPath =
    row[0]?.llmEmbeddingModelPath ?? process.env.LUIE_LLM_EMBEDDING_MODEL_PATH ?? null;
  const localLlm = settingsManager.getLlmSettings();
  const providerHint =
    row[0]?.llmProviderHint ??
    process.env.LUIE_LLM_PROVIDER_HINT ??
    localLlm.llmProviderHint ??
    null;
  const fallbackModelPath = localLlm.defaultModelPath ?? null;
  const envContextSize = Number.parseInt(process.env.LUIE_LLM_CONTEXT_SIZE ?? "", 10);
  const configuredContextSize = Number.isFinite(envContextSize) ? envContextSize : undefined;
  const envGpuLayers = Number.parseInt(process.env.LUIE_LLM_GPU_LAYERS ?? "", 10);
  const configuredGpuLayers = Number.isFinite(envGpuLayers) ? envGpuLayers : undefined;

  if (providerHint === "none") {
    return deterministicProvider;
  }

  const effectiveModelPath = configuredPath ?? fallbackModelPath;
  if (effectiveModelPath && providerHint === "llamaserver") {
    return getOrCreateLlamaServerProvider(effectiveModelPath);
  }
  if (effectiveModelPath && (providerHint === "llamacpp" || providerHint === null)) {
    return getOrCreateLlamaProvider(effectiveModelPath, embeddingConfiguredPath, configuredContextSize, configuredGpuLayers);
  }

  logger.info("LLM provider path is not configured, using deterministic fallback", {
    projectId,
  });
  return deterministicProvider;
}
