import type {
  RuntimeRouteCandidate,
  RuntimeRoutePlan,
  RuntimeRouteProvider,
  RuntimeRouteSkip,
} from "../../../shared/types/index.js";

type RuntimeRoutePlannerInput = {
  requestedProvider: "auto" | RuntimeRouteProvider;
  localLlm:
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
  openai:
    | {
        configured: true;
        apiKey: string;
        model: string;
        embeddingModel?: string;
      }
    | { configured: false };
  gemini:
    | {
        configured: true;
        apiKey: string;
        model: string;
        alternativeModel?: string;
        embeddingModel?: string;
      }
    | { configured: false };
  ollama:
    | {
        configured: true;
        baseUrl: string;
        chatModel: string;
        embeddingModel?: string;
        apiKey?: string;
      }
    | { configured: false };
};

const AUTO_ORDER: RuntimeRouteProvider[] = ["sidecar", "openai", "gemini", "ollama"];

const notConfigured = (provider: RuntimeRouteProvider): RuntimeRouteSkip => {
  if (provider === "sidecar") {
    return {
      provider,
      code: "SIDECAR_NOT_CONFIGURED",
      message: "Local sidecar is not configured",
    };
  }
  const label = provider === "openai" ? "OpenAI" : provider === "gemini" ? "Gemini" : "Ollama";
  return {
    provider,
    code: "PROVIDER_NOT_CONFIGURED",
    message: `${label} is not configured`,
  };
};

const sidecarNotConfigured = (
  localLlm: RuntimeRoutePlannerInput["localLlm"],
): RuntimeRouteSkip => {
  if (!localLlm) return notConfigured("sidecar");
  const reasons = [
    !localLlm.enabled ? "disabled" : null,
    !localLlm.modelPath ? "model missing" : null,
    !localLlm.binaryPath ? "llama-server binary missing" : null,
  ].filter((reason): reason is string => reason !== null);
  return {
    provider: "sidecar",
    code: "SIDECAR_NOT_CONFIGURED",
    message: reasons.length > 0
      ? `Local sidecar is not configured (${reasons.join(", ")})`
      : "Local sidecar is not configured",
  };
};

export function buildRuntimeRoutePlan(input: RuntimeRoutePlannerInput): RuntimeRoutePlan {
  const requestedProvider = input.requestedProvider;
  const order = requestedProvider === "auto" ? AUTO_ORDER : [requestedProvider];
  const candidates: RuntimeRouteCandidate[] = [];
  const skipped: RuntimeRouteSkip[] = [];

  for (const provider of order) {
    if (provider === "sidecar") {
      const localLlm = input.localLlm;
      if (localLlm?.enabled && localLlm.modelPath && localLlm.binaryPath) {
        candidates.push({
          kind: "sidecar",
          backend: "local-sidecar",
          modelPath: localLlm.modelPath,
          binaryPath: localLlm.binaryPath,
          options: {
            gpuLayers: localLlm.gpuLayers,
            contextSize: localLlm.contextSize,
            cacheRamMiB: localLlm.cacheRamMiB,
            cacheReuse: localLlm.cacheReuse,
          },
        });
      } else {
        skipped.push(sidecarNotConfigured(localLlm));
      }
      continue;
    }

    if (provider === "openai" && input.openai.configured) {
      candidates.push({
        kind: "openai",
        backend: "remote-http",
        baseUrl: "https://api.openai.com/v1",
        apiKey: input.openai.apiKey,
        model: input.openai.model,
        embeddingModel: input.openai.embeddingModel,
      });
      continue;
    }
    if (provider === "gemini" && input.gemini.configured) {
      candidates.push({
        kind: "gemini",
        backend: "remote-http",
        apiKey: input.gemini.apiKey,
        model: input.gemini.model,
        alternativeModel: input.gemini.alternativeModel,
        embeddingModel: input.gemini.embeddingModel,
      });
      continue;
    }
    if (provider === "ollama" && input.ollama.configured) {
      candidates.push({
        kind: "ollama",
        backend: "remote-http",
        baseUrl: input.ollama.baseUrl,
        model: input.ollama.chatModel,
        embeddingModel: input.ollama.embeddingModel,
        apiKey: input.ollama.apiKey,
      });
      continue;
    }

    skipped.push(notConfigured(provider));
  }

  return {
    requestedProvider,
    fallbackPolicy: requestedProvider === "auto" ? "try-next" : "fail-closed",
    order,
    candidates,
    skipped,
  };
}
