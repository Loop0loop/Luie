import { db } from "../../database/index.js";
import { projectSettings } from "../../database/schema.js";
import { eq } from "drizzle-orm";
import { createLogger } from "../../../shared/logger/index.js";
import type { ModelRuntimeClient } from "./modelRuntimeClient.js";
import { DeterministicProvider } from "./providers/deterministicProvider.js";
import { LlamaCppProvider } from "./providers/llamaCppProvider.js";

const logger = createLogger("ModelRuntimeFactory");
const deterministicProvider = new DeterministicProvider();
let llamaProviderSingle: { path: string; provider: LlamaCppProvider } | null = null;

function getOrCreateLlamaProvider(modelPath: string): LlamaCppProvider {
  if (llamaProviderSingle?.path === modelPath) {
    return llamaProviderSingle.provider;
  }
  const provider = new LlamaCppProvider(modelPath);
  llamaProviderSingle = { path: modelPath, provider };
  return provider;
}

export async function resolveModelRuntimeClient(
  projectId: string,
): Promise<ModelRuntimeClient> {
  const row = await db.getClient()
    .select({
      llmModelPath: projectSettings.llmModelPath,
      llmProviderHint: projectSettings.llmProviderHint,
    })
    .from(projectSettings)
    .where(eq(projectSettings.projectId, projectId))
    .limit(1);

  const configuredPath = row[0]?.llmModelPath ?? process.env.LUIE_LLM_MODEL_PATH ?? null;
  const providerHint = row[0]?.llmProviderHint ?? process.env.LUIE_LLM_PROVIDER_HINT ?? null;

  if (providerHint === "none") {
    return deterministicProvider;
  }

  if (configuredPath && (providerHint === "llamacpp" || providerHint === null)) {
    return getOrCreateLlamaProvider(configuredPath);
  }

  logger.info("LLM provider path is not configured, using deterministic fallback", {
    projectId,
  });
  return deterministicProvider;
}
