import { beforeEach, describe, expect, it } from "vitest";
import { settingsManager } from "../../../src/main/manager/settings/index.js";

describe("SettingsManager localLlm settings", () => {
  beforeEach(() => {
    settingsManager.resetToDefaults();
  });

  it("stores localLlm settings without discarding existing llm settings", () => {
    settingsManager.setLlmSettings({
      ollama: {
        baseUrl: "http://localhost:11434",
        chatModel: "qwen3:4b",
        embeddingModel: "nomic-embed-text",
      },
      ragTemperature: 0.25,
      ragMaxTokens: 1400,
    });

    settingsManager.setLocalLlmSettings({
      enabled: true,
      modelPath: "/tmp/models/qwen.gguf",
      binaryPath: "/tmp/bin/llama-server",
      gpuLayers: -1,
      contextSize: 4096,
    });

    expect(settingsManager.getLocalLlmSettings()).toEqual({
      enabled: true,
      modelPath: "/tmp/models/qwen.gguf",
      binaryPath: "/tmp/bin/llama-server",
      gpuLayers: -1,
      contextSize: 4096,
    });
    expect(settingsManager.getLlmSettings()).toEqual({
      preferredProvider: "auto",
      openaiApiKey: "",
      geminiApiKey: "",
      ollama: {
        baseUrl: "http://localhost:11434",
        chatModel: "qwen3:4b",
        embeddingModel: "nomic-embed-text",
      },
      ragTemperature: 0.25,
      ragMaxTokens: 1400,
      defaultEmbeddingModelPath: undefined,
      defaultEmbeddingModelId: undefined,
    });
  });
});
