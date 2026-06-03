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
  resolveModelRuntimeClient,
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

  it("uses sidecar before other configured providers when localLlm is enabled", async () => {
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

    const runtime = await resolveModelRuntimeClient("project-1");
    const info = await resolveRuntimeModelInfo();

    expect(mocked.ensureStarted).toHaveBeenCalledWith(
      "/tmp/bin/llama-server",
      "/tmp/model.gguf",
      { gpuLayers: -1, contextSize: 4096 },
    );
    expect(runtime.providerName).toBe("externalapi");
    expect(info).toEqual({
      provider: "sidecar",
      model: "llama-server",
      alternativeModel: null,
    });
  });

  it("falls back to Ollama when sidecar start fails", async () => {
    mocked.getLocalLlmSettings.mockReturnValue({
      enabled: true,
      modelPath: "/tmp/model.gguf",
      binaryPath: "/tmp/bin/llama-server",
    });
    mocked.getLlmSettings.mockReturnValue({
      ollama: {
        baseUrl: "http://localhost:11434",
        chatModel: "qwen3:4b",
      },
    });
    mocked.ensureStarted.mockRejectedValue(new Error("spawn failed"));

    const info = await resolveRuntimeModelInfo();

    expect(info).toEqual({
      provider: "ollama",
      model: "qwen3:4b",
      alternativeModel: null,
    });
  });
});
