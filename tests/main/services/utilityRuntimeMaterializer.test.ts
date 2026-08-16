import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RuntimeRoutePlan } from "../../../src/shared/types/index.js";
import { DEFAULT_EMBEDDING_MODEL } from "../../../src/main/services/features/llm/embeddingModelConstants.js";

const mocked = vi.hoisted(() => ({
  ensureStarted: vi.fn(),
  ensureEmbeddingStarted: vi.fn(),
}));

vi.mock("../../../src/main/utility/llm/sidecarSupervisor.js", () => ({
  utilitySidecarSupervisor: {
    ensureStarted: mocked.ensureStarted,
  },
  utilityEmbeddingSidecarSupervisor: {
    ensureStarted: mocked.ensureEmbeddingStarted,
  },
}));

import {
  resolveUtilityEmbeddingRuntimeClient,
  resolveUtilityModelRuntimeClient,
} from "../../../src/main/utility/llm/runtimeMaterializer.js";

describe("utilityRuntimeMaterializer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.LUIE_IS_UTILITY_PROCESS = "1";
    process.env.LUIE_APP_IS_PACKAGED = "0";
    delete process.env.LUIE_USER_DATA_PATH;
  });

  it("fails closed when explicit sidecar materialization fails", async () => {
    mocked.ensureStarted.mockRejectedValue(new Error("spawn failed"));
    const plan: RuntimeRoutePlan = {
      requestedProvider: "sidecar",
      fallbackPolicy: "fail-closed",
      order: ["sidecar"],
      candidates: [
        {
          kind: "sidecar",
          backend: "local-sidecar",
          modelPath: "/tmp/model.gguf",
          binaryPath: "/tmp/bin/llama-server",
          options: {},
        },
        {
          kind: "gemini",
          backend: "remote-http",
          apiKey: "gemini-key",
          model: "gemini-test",
        },
      ],
      skipped: [],
    };

    await expect(
      resolveUtilityModelRuntimeClient("project-1", plan),
    ).rejects.toThrow("spawn failed");
    expect(mocked.ensureStarted).toHaveBeenCalledTimes(1);
  });

  it("materializes remote fallback candidates in auto order", async () => {
    const plan: RuntimeRoutePlan = {
      requestedProvider: "auto",
      fallbackPolicy: "try-next",
      order: ["sidecar", "openai", "gemini"],
      candidates: [
        {
          kind: "openai",
          backend: "remote-http",
          baseUrl: "https://api.openai.com/v1",
          apiKey: "openai-key",
          model: "gpt-test",
        },
        {
          kind: "gemini",
          backend: "remote-http",
          apiKey: "gemini-key",
          model: "gemini-test",
        },
      ],
      skipped: [
        {
          provider: "sidecar",
          code: "SIDECAR_NOT_CONFIGURED",
          message: "Local sidecar is not configured",
        },
      ],
    };

    const runtime = await resolveUtilityModelRuntimeClient("project-1", plan);

    expect(runtime.providerName).toBe("externalapi");
    expect(mocked.ensureStarted).not.toHaveBeenCalled();
  });

  it("materializes local embedding through the utility embedding sidecar", async () => {
    const userDataPath = join("/tmp", `luie-embedding-${Date.now()}`);
    const modelDir = join(userDataPath, "llm-models");
    mkdirSync(modelDir, { recursive: true });
    const embeddingModelPath = join(modelDir, DEFAULT_EMBEDDING_MODEL.filename);
    writeFileSync(embeddingModelPath, "test-model");
    process.env.LUIE_USER_DATA_PATH = userDataPath;
    mocked.ensureEmbeddingStarted.mockResolvedValue({
      baseUrl: "http://127.0.0.1:41234",
    });
    const plan: RuntimeRoutePlan = {
      requestedProvider: "auto",
      fallbackPolicy: "try-next",
      order: ["sidecar", "openai"],
      candidates: [
        {
          kind: "sidecar",
          backend: "local-sidecar",
          modelPath: "/tmp/chat-model.gguf",
          binaryPath: "/tmp/bin/llama-server",
          options: {},
        },
      ],
      skipped: [],
    };

    const runtime = await resolveUtilityEmbeddingRuntimeClient(
      "project-1",
      plan,
    );

    expect(runtime.providerName).toBe("externalapi");
    expect(mocked.ensureEmbeddingStarted).toHaveBeenCalledWith(
      "/tmp/bin/llama-server",
      expect.stringMatching(/bge-m3-Q4_K_M\.gguf$/),
      { gpuLayers: 0, contextSize: 8192 },
    );
  });

  it("fails closed when explicit sidecar embedding materialization fails", async () => {
    const userDataPath = join("/tmp", `luie-embedding-fail-${Date.now()}`);
    const modelDir = join(userDataPath, "llm-models");
    mkdirSync(modelDir, { recursive: true });
    writeFileSync(
      join(modelDir, DEFAULT_EMBEDDING_MODEL.filename),
      "test-model",
    );
    process.env.LUIE_USER_DATA_PATH = userDataPath;
    mocked.ensureEmbeddingStarted.mockRejectedValue(new Error("spawn failed"));
    const plan: RuntimeRoutePlan = {
      requestedProvider: "sidecar",
      fallbackPolicy: "fail-closed",
      order: ["sidecar"],
      candidates: [
        {
          kind: "sidecar",
          backend: "local-sidecar",
          modelPath: "/tmp/chat-model.gguf",
          binaryPath: "/tmp/bin/llama-server",
          options: {},
        },
      ],
      skipped: [],
    };

    await expect(
      resolveUtilityEmbeddingRuntimeClient("project-1", plan),
    ).rejects.toThrow("spawn failed");
    expect(mocked.ensureEmbeddingStarted).toHaveBeenCalledTimes(1);
  });
});
