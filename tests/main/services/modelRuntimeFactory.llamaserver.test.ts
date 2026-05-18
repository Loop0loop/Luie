import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
  getLlmSettings: vi.fn(),
}));

vi.mock("../../../src/main/database/index.js", () => ({
  db: {
    getClient: () => ({
      select: mocked.select,
    }),
  },
}));

vi.mock("../../../src/main/manager/settingsManager.js", () => ({
  settingsManager: {
    getLlmSettings: mocked.getLlmSettings,
  },
}));

import { resolveModelRuntimeClient } from "../../../src/main/services/llm/modelRuntimeFactory.js";

describe("modelRuntimeFactory (llamaserver)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.getLlmSettings.mockReturnValue({});
    mocked.select.mockReturnValue({
      from: mocked.from,
    });
    mocked.from.mockReturnValue({
      where: mocked.where,
    });
    mocked.where.mockReturnValue({
      limit: mocked.limit,
    });
  });

  it("providerHint가 llamaserver면 LlamaServerProvider를 반환한다", async () => {
    mocked.limit.mockResolvedValue([
      {
        llmModelPath: "/tmp/qwen.gguf",
        llmEmbeddingModelPath: null,
        llmProviderHint: "llamaserver",
      },
    ]);

    const runtime = await resolveModelRuntimeClient("project-1");
    expect(runtime.providerName).toBe("llamaserver");
  });

  it("환경변수 provider hint가 local settings보다 우선한다", async () => {
    mocked.limit.mockResolvedValue([
      {
        llmModelPath: "/tmp/qwen.gguf",
        llmEmbeddingModelPath: null,
        llmProviderHint: null,
      },
    ]);
    mocked.getLlmSettings.mockReturnValue({
      llmProviderHint: "llamacpp",
      defaultModelPath: "/tmp/another.gguf",
    });
    process.env.LUIE_LLM_PROVIDER_HINT = "none";

    const runtime = await resolveModelRuntimeClient("project-1");
    expect(runtime.providerName).toBe("deterministic");

    delete process.env.LUIE_LLM_PROVIDER_HINT;
  });
});
