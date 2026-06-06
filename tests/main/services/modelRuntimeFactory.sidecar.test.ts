import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  getLlmSettings: vi.fn(),
  getLocalLlmSettings: vi.fn(),
  getSyncSettings: vi.fn(),
  ensureStarted: vi.fn(),
  getSupabaseConfig: vi.fn(),
  ensureSyncAccessToken: vi.fn(),
}));

vi.mock("../../../src/main/manager/settings/index.js", () => ({
  settingsManager: {
    getLlmSettings: mocked.getLlmSettings,
    getLocalLlmSettings: mocked.getLocalLlmSettings,
    getSyncSettings: mocked.getSyncSettings,
  },
}));

vi.mock("../../../src/main/services/llm/sidecarManager.js", () => ({
  sidecarManager: {
    ensureStarted: mocked.ensureStarted,
  },
}));

vi.mock("../../../src/main/services/features/sync/supabaseEnv.js", () => ({
  getSupabaseConfig: mocked.getSupabaseConfig,
}));

vi.mock("../../../src/main/services/features/sync/syncAccessToken.js", () => ({
  ensureSyncAccessToken: mocked.ensureSyncAccessToken,
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
    delete process.env.LUIE_APP_IS_PACKAGED;
    mocked.getLlmSettings.mockReturnValue({});
    mocked.getLocalLlmSettings.mockReturnValue(undefined);
    mocked.getSyncSettings.mockReturnValue({});
    mocked.ensureStarted.mockResolvedValue("http://127.0.0.1:32123");
    mocked.getSupabaseConfig.mockReturnValue({
      url: "https://example.supabase.co",
      anonKey: "anon-key",
      projectId: "example",
    });
    mocked.ensureSyncAccessToken.mockResolvedValue("sync-token");
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

  it("uses bundled Edge Function candidates in packaged builds without local API keys", async () => {
    process.env.LUIE_APP_IS_PACKAGED = "1";
    mocked.getLlmSettings.mockReturnValue({});
    mocked.getLocalLlmSettings.mockReturnValue(undefined);

    const { plan } = await import("../../../src/main/services/llm/modelRuntimeFactory.js")
      .then((module) => module.resolveRuntimeRoutePlan());

    const openai = plan.candidates.find((candidate) => candidate.kind === "openai");
    const gemini = plan.candidates.find((candidate) => candidate.kind === "gemini");

    expect(openai).toMatchObject({
      kind: "openai",
      apiKey: "__bundled-edge-function__",
      supabaseProxy: {
        functionUrl: "https://example.supabase.co/functions/v1/openai-proxy",
        accessToken: "sync-token",
      },
    });
    expect(gemini).toMatchObject({
      kind: "gemini",
      apiKey: "__bundled-edge-function__",
      supabaseProxy: {
        functionUrl: "https://example.supabase.co/functions/v1/gemini-proxy",
        accessToken: "sync-token",
      },
    });
    expect(mocked.ensureSyncAccessToken).toHaveBeenCalled();
  });

  it("uses .env cloud API keys directly in non-packaged builds", async () => {
    process.env.LUIE_APP_IS_PACKAGED = "0";
    process.env.OPENAI_API_KEY = "openai-env-key";
    process.env.GEMINI_API_KEY = "gemini-env-key";
    mocked.getLlmSettings.mockReturnValue({});
    mocked.getLocalLlmSettings.mockReturnValue(undefined);

    const { plan } = await import("../../../src/main/services/llm/modelRuntimeFactory.js")
      .then((module) => module.resolveRuntimeRoutePlan());

    expect(plan.candidates.find((candidate) => candidate.kind === "openai")).toMatchObject({
      kind: "openai",
      apiKey: "openai-env-key",
    });
    expect(plan.candidates.find((candidate) => candidate.kind === "gemini")).toMatchObject({
      kind: "gemini",
      apiKey: "gemini-env-key",
    });
    expect(mocked.ensureSyncAccessToken).not.toHaveBeenCalled();
  });
});
