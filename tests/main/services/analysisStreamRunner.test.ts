import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  invokeGeminiProxy: vi.fn(),
  buildDeterministicAnalysisItems: vi.fn(),
}));

vi.mock("../../../src/main/services/features/analysis/geminiApiKeyResolver.js", () => ({
  invokeGeminiProxy: mocked.invokeGeminiProxy,
}));

vi.mock("../../../src/main/services/features/analysis/localFallbackAnalyzer.js", () => ({
  buildDeterministicAnalysisItems: mocked.buildDeterministicAnalysisItems,
}));

import { runGeminiAnalysisStream } from "../../../src/main/services/features/analysis/analysisStreamRunner.js";

const baseContext = {
  characters: [],
  terms: [],
  manuscript: {
    title: "chapter",
    content: "첫 번째 문장입니다. 두 번째 문장입니다.",
    nounPhrases: [],
  },
} as const;

describe("runGeminiAnalysisStream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.buildDeterministicAnalysisItems.mockReturnValue([
      {
        type: "intro",
        content: "fallback",
      },
    ]);
  });

  it("returns cancelled without fallback or events when aborted mid-request", async () => {
    mocked.invokeGeminiProxy.mockImplementation(
      async (_request: unknown, options?: { signal?: AbortSignal }) =>
        await new Promise<string>((_resolve, reject) => {
          options?.signal?.addEventListener(
            "abort",
            () => {
              const error = new Error("Analysis aborted");
              error.name = "AbortError";
              reject(error);
            },
            { once: true },
          );
        }),
    );

    const send = vi.fn();
    const controller = new AbortController();
    const outcomePromise = runGeminiAnalysisStream({
      context: baseContext,
      chapterId: "chapter-1",
      runId: "run-1",
      modelCandidates: ["gemini-test"],
      getWindow: () =>
        ({
          id: 1,
          isDestroyed: () => false,
          webContents: { send },
        }) as never,
      setCachedItems: vi.fn(),
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
      signal: controller.signal,
    });

    await vi.waitFor(() => {
      expect(mocked.invokeGeminiProxy).toHaveBeenCalledTimes(1);
    });

    controller.abort();

    await expect(outcomePromise).resolves.toBe("cancelled");
    expect(mocked.buildDeterministicAnalysisItems).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
});
