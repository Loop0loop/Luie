import path from "node:path";
import { readFile } from "node:fs/promises";
import { createLogger } from "../../../shared/logger/index.js";
import type { ModelRuntimeClient } from "./modelRuntimeClient.js";
import { DeterministicProvider } from "./providers/deterministicProvider.js";
import { ExternalApiProvider } from "./providers/externalApiProvider.js";
import { resolveUserDataPath } from "../../utils/userDataPath.js";

const logger = createLogger("ModelRuntimeFactory");
const deterministicProvider = new DeterministicProvider();
let externalApiProviderSingle: { key: string; provider: ExternalApiProvider } | null = null;

export function invalidateModelRuntimeCache(): void {
  externalApiProviderSingle = null;
}

type OllamaConfig = {
  baseUrl: string;
  chatModel: string;
  embeddingModel?: string;
};

async function loadOllamaConfig(): Promise<OllamaConfig | null> {
  try {
    const settingsPath = path.join(resolveUserDataPath(), "settings.json");
    const raw = await readFile(settingsPath, "utf8");
    const parsed = JSON.parse(raw) as {
      llm?: { ollama?: { baseUrl?: string; chatModel?: string; embeddingModel?: string } };
    };
    const ollama = parsed.llm?.ollama;
    if (ollama?.baseUrl && ollama?.chatModel) {
      return {
        baseUrl: ollama.baseUrl,
        chatModel: ollama.chatModel,
        embeddingModel: ollama.embeddingModel,
      };
    }
    return null;
  } catch {
    return null;
  }
}

function getOrCreateExternalApiProvider(config: OllamaConfig): ExternalApiProvider {
  const key = `${config.baseUrl}::${config.chatModel}::${config.embeddingModel ?? ""}`;
  if (externalApiProviderSingle?.key === key) {
    return externalApiProviderSingle.provider;
  }
  const provider = new ExternalApiProvider(config);
  externalApiProviderSingle = { key, provider };
  return provider;
}

export async function resolveModelRuntimeClient(
  projectId: string,
): Promise<ModelRuntimeClient> {
  const config = await loadOllamaConfig();
  if (config) {
    logger.info("Using Ollama provider", { projectId, baseUrl: config.baseUrl, chatModel: config.chatModel });
    return getOrCreateExternalApiProvider(config);
  }
  logger.info("Ollama not configured, using deterministic fallback", { projectId });
  return deterministicProvider;
}
