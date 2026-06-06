import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  getLlmSettings: vi.fn(),
  getLocalLlmSettings: vi.fn(),
  ensureStarted: vi.fn(),
}));

vi.mock("../../../src/main/manager/settings/index.js", () => ({
  settingsManager: {
    getLlmSettings: mocked.getLlmSettings,
    getLocalLlmSettings: mocked.getLocalLlmSettings,
  },
}));

vi.mock("../../../src/main/services/llm/sidecarManager.js", () => ({
  sidecarManager: {
    ensureStarted: mocked.ensureStarted,
  },
}));

import {
  invalidateModelRuntimeCache,
  resolveRuntimeModelInfo,
} from "../../../src/main/services/llm/modelRuntimeFactory.js";

describe("modelRuntimeFactory sidecar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateModelRuntimeCache();
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_GCP_API;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.OPENAI_API_KEY;
    mocked.getLlmSettings.mockReturnValue({});
    mocked.getLocalLlmSettings.mockReturnValue(undefined);
    mocked.ensureStarted.mockResolvedValue("http://127.0.0.1:32123");
  });

  it("reports sidecar as the first configured provider without starting it", async () => {
    mocked.getLocalLlmSettings.mockReturnValue({
      enabled: true,
      modelPath: "/tmp/model.gguf",
      binaryPath: "/tmp/bin/llama-server",
      gpuLayers: -1,
      contextSize: 4096,
    });
    mocked.getLlmSettings.mockReturnValue({
      ollama: {
        baseUrl: "http://localhost:11434",
        chatModel: "qwen3:4b",
      },
    });

    const info = await resolveRuntimeModelInfo();

    expect(mocked.ensureStarted).not.toHaveBeenCalled();
    expect(info).toEqual({
      provider: "sidecar",
      model: "llama-server",
      alternativeModel: null,
      requestedProvider: "auto",
      resolvedProvider: "sidecar",
      backend: "local-sidecar",
      fallbackUsed: false,
      ready: true,
      skipped: [],
    });
  });

  it("falls back to Ollama in auto mode when sidecar is not configured", async () => {
    mocked.getLocalLlmSettings.mockReturnValue(undefined);
    mocked.getLlmSettings.mockReturnValue({
      ollama: {
        baseUrl: "http://localhost:11434",
        chatModel: "qwen3:4b",
      },
    });

    const info = await resolveRuntimeModelInfo();

    expect(mocked.ensureStarted).not.toHaveBeenCalled();
    expect(info).toEqual({
      provider: "ollama",
      model: "qwen3:4b",
      alternativeModel: null,
      requestedProvider: "auto",
      resolvedProvider: "ollama",
      backend: "remote-http",
      fallbackUsed: true,
      ready: true,
      skipped: [
        {
          provider: "sidecar",
          code: "SIDECAR_NOT_CONFIGURED",
          message: "Local sidecar is not configured",
        },
        {
          provider: "openai",
          code: "PROVIDER_NOT_CONFIGURED",
          message: "OpenAI is not configured",
        },
        {
          provider: "gemini",
          code: "PROVIDER_NOT_CONFIGURED",
          message: "Gemini is not configured",
        },
      ],
    });
  });

  it("does not fall back to Gemini when explicit sidecar is not configured", async () => {
    process.env.GEMINI_API_KEY = "gemini-key";
    mocked.getLocalLlmSettings.mockReturnValue(undefined);
    mocked.getLlmSettings.mockReturnValue({
      preferredProvider: "sidecar",
      geminiApiKey: "settings-gemini-key",
    });

    const info = await resolveRuntimeModelInfo();

    expect(mocked.ensureStarted).not.toHaveBeenCalled();
    expect(info).toEqual({
      provider: "unavailable",
      model: "",
      alternativeModel: null,
      requestedProvider: "sidecar",
      resolvedProvider: "unavailable",
      backend: null,
      fallbackUsed: false,
      ready: false,
      skipped: [
        {
          provider: "sidecar",
          code: "SIDECAR_NOT_CONFIGURED",
          message: "Local sidecar is not configured",
        },
      ],
    });
  });
});
