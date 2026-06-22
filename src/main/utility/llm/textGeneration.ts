import type { RuntimeRoutePlan } from "../../../shared/types/index.js";
import { createLogger } from "../../../shared/logger/index.js";
import { resolveUtilityModelRuntimeClient } from "./runtimeMaterializer.js";

const logger = createLogger("UtilityTextGeneration");

const runtimeLogFieldsFromProvider = (providerName: string): {
  route: string;
  backend: "local-sidecar" | "remote-http" | "test";
  implementation: string;
} => {
  if (providerName === "sidecar") {
    return { route: "sidecar", backend: "local-sidecar", implementation: "llama-server" };
  }
  if (providerName === "gemini") {
    return { route: "gemini", backend: "remote-http", implementation: "gemini-api" };
  }
  if (providerName === "ollama") {
    return { route: "ollama", backend: "remote-http", implementation: "ollama-openai-compatible-api" };
  }
  if (providerName === "deterministic") {
    return { route: "deterministic", backend: "test", implementation: "deterministic-provider" };
  }
  return { route: "openai", backend: "remote-http", implementation: "openai-compatible-api" };
};

export type UtilityTextGenerationRequest = {
  projectId: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  runtimePlan?: RuntimeRoutePlan;
};

export type UtilityTextGenerationResult = {
  text: string;
  providerName: string;
};

export async function generateUtilityText(
  payload: UtilityTextGenerationRequest,
): Promise<UtilityTextGenerationResult> {
  const runtime = await resolveUtilityModelRuntimeClient(payload.projectId, payload.runtimePlan);
  logger.info("Utility text generation runtime resolved", {
    projectId: payload.projectId,
    providerName: runtime.providerName,
    ...runtimeLogFieldsFromProvider(runtime.providerName),
  });
  const text = await runtime.generate(payload.prompt, {
    maxTokens: payload.maxTokens,
    temperature: payload.temperature,
  });
  return {
    text,
    providerName: runtime.providerName,
  };
}
