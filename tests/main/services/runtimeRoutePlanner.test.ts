import { describe, expect, it } from "vitest";
import { buildRuntimeRoutePlan } from "../../../src/main/services/llm/runtimeRoutePlanner.js";

describe("runtimeRoutePlanner", () => {
  it("builds a fail-closed sidecar-only plan for explicit sidecar selection", () => {
    const plan = buildRuntimeRoutePlan({
      requestedProvider: "sidecar",
      localLlm: {
        enabled: true,
        modelPath: "/tmp/model.gguf",
        binaryPath: "/tmp/bin/llama-server",
        gpuLayers: -1,
        contextSize: 4096,
      },
      openai: { configured: true, apiKey: "openai-key", model: "gpt-test" },
      gemini: { configured: true, apiKey: "gemini-key", model: "gemini-test" },
      ollama: {
        configured: true,
        baseUrl: "http://localhost:11434",
        chatModel: "qwen3:4b",
      },
    });

    expect(plan.fallbackPolicy).toBe("fail-closed");
    expect(plan.candidates.map((candidate) => candidate.kind)).toEqual([
      "sidecar",
    ]);
    expect(plan.candidates[0]).toMatchObject({
      kind: "sidecar",
      backend: "local-sidecar",
      modelPath: "/tmp/model.gguf",
      binaryPath: "/tmp/bin/llama-server",
    });
  });

  it("builds an auto plan with visible fallback order", () => {
    const plan = buildRuntimeRoutePlan({
      requestedProvider: "auto",
      localLlm: {
        enabled: true,
        modelPath: "/tmp/model.gguf",
        binaryPath: "/tmp/bin/llama-server",
      },
      openai: { configured: true, apiKey: "openai-key", model: "gpt-test" },
      gemini: { configured: true, apiKey: "gemini-key", model: "gemini-test" },
      ollama: {
        configured: true,
        baseUrl: "http://localhost:11434",
        chatModel: "qwen3:4b",
      },
    });

    expect(plan.fallbackPolicy).toBe("try-next");
    expect(plan.candidates.map((candidate) => candidate.kind)).toEqual([
      "sidecar",
      "openai",
      "gemini",
      "ollama",
    ]);
    expect(plan.candidates[1]).toMatchObject({
      kind: "openai",
      baseUrl: "https://api.openai.com/v1",
      apiKey: "openai-key",
      model: "gpt-test",
    });
  });

  it("records unavailable candidates instead of materializing runtimes", () => {
    const plan = buildRuntimeRoutePlan({
      requestedProvider: "sidecar",
      localLlm: { enabled: false },
      openai: { configured: false },
      gemini: { configured: false },
      ollama: { configured: false },
    });

    expect(plan.fallbackPolicy).toBe("fail-closed");
    expect(plan.candidates).toEqual([]);
    expect(plan.skipped).toEqual([
      {
        provider: "sidecar",
        code: "SIDECAR_NOT_CONFIGURED",
        message:
          "Local sidecar is not configured (disabled, model missing, llama-server binary missing)",
      },
    ]);
  });
});
