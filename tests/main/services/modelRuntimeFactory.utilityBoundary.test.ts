import { describe, expect, it, vi } from "vitest";

describe("modelRuntimeFactory utility process boundary", () => {
  const mockUtilityElectron = () => {
    const electronMock = {
      app: {
        isPackaged: false,
        getAppPath: () => process.cwd(),
        getPath: () => "/tmp/luie-model-runtime-test",
      },
      BrowserWindow: {
        getAllWindows: () => [],
        fromId: () => null,
      },
      nativeTheme: {
        shouldUseDarkColors: false,
      },
      utilityProcess: {
        fork: vi.fn(),
      },
    };
    vi.doMock("electron", () => ({
      ...electronMock,
      default: electronMock,
    }));
  };

  it("resolves deterministic config without requiring BrowserWindow from electron", async () => {
    vi.resetModules();
    mockUtilityElectron();

    const { resolveRuntimeModelConfig } =
      await import("../../../src/main/services/features/llm/modelRuntimeFactory.js");

    await expect(resolveRuntimeModelConfig("project-1")).resolves.toEqual({
      providerHint: "deterministic",
      embeddingModel: null,
    });
  });

  it("maps none provider hint to deterministic config", async () => {
    vi.resetModules();
    vi.stubEnv("LUIE_LLM_PROVIDER_HINT", "none");
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("OPENAI_MODEL", "gpt-5.4-nano");
    mockUtilityElectron();

    const { resolveRuntimeModelConfig } =
      await import("../../../src/main/services/features/llm/modelRuntimeFactory.js");

    await expect(resolveRuntimeModelConfig("project-1")).resolves.toEqual({
      providerHint: "deterministic",
      embeddingModel: null,
    });

    vi.unstubAllEnvs();
  });

  it("loads the utility RAG worker without requiring BrowserWindow from electron", async () => {
    vi.resetModules();
    mockUtilityElectron();

    await expect(
      import("../../../src/main/utility/rag/ragQaWorker.js"),
    ).resolves.toMatchObject({
      embedTexts: expect.any(Function),
    });
  });
});
