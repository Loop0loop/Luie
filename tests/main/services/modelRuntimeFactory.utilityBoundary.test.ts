import { describe, expect, it, vi } from "vitest";

describe("modelRuntimeFactory utility process boundary", () => {
  const mockUtilityElectron = () => {
    vi.doMock("electron", () => ({
      app: {
        isPackaged: false,
        getAppPath: () => process.cwd(),
        getPath: () => "/tmp/luie-model-runtime-test",
      },
      nativeTheme: {
        shouldUseDarkColors: false,
      },
    }));
  };

  it("resolves deterministic config without requiring BrowserWindow from electron", async () => {
    vi.resetModules();
    mockUtilityElectron();

    const { resolveRuntimeModelConfig } =
      await import("../../../src/main/services/llm/modelRuntimeFactory.js");

    await expect(resolveRuntimeModelConfig("project-1")).resolves.toEqual({
      providerHint: "deterministic",
      embeddingModel: null,
    });
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
