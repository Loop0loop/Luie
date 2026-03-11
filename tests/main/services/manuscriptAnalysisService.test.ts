import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  projectFindUnique: vi.fn(),
  chapterFindFirst: vi.fn(),
  readLuieEntry: vi.fn(),
  buildAnalysisContext: vi.fn(),
  runGeminiAnalysisStream: vi.fn(),
  deleteMany: vi.fn(async () => ({ count: 0 })),
  initialize: vi.fn(async () => undefined),
  disconnect: vi.fn(async () => undefined),
}));

vi.mock("../../../src/main/database/index.js", () => ({
  db: {
    initialize: mocked.initialize,
    disconnect: mocked.disconnect,
    getClient: () => ({
      snapshot: {
        deleteMany: mocked.deleteMany,
      },
      termAppearance: {
        deleteMany: mocked.deleteMany,
      },
      characterAppearance: {
        deleteMany: mocked.deleteMany,
      },
      term: {
        deleteMany: mocked.deleteMany,
      },
      character: {
        deleteMany: mocked.deleteMany,
      },
      chapter: {
        findFirst: mocked.chapterFindFirst,
        deleteMany: mocked.deleteMany,
      },
      project: {
        findUnique: mocked.projectFindUnique,
        deleteMany: mocked.deleteMany,
      },
      projectSettings: {
        deleteMany: mocked.deleteMany,
      },
    }),
  },
}));

vi.mock("../../../src/main/utils/luiePackage.js", () => ({
  readLuieEntry: mocked.readLuieEntry,
}));

vi.mock("../../../src/main/core/manuscriptAnalyzer.js", () => ({
  manuscriptAnalyzer: {
    buildAnalysisContext: mocked.buildAnalysisContext,
  },
}));

vi.mock("../../../src/main/services/features/analysis/analysisStreamRunner.js", () => ({
  isAnalysisAbortError: (error: unknown) =>
    error instanceof Error && error.name === "AbortError",
  runGeminiAnalysisStream: mocked.runGeminiAnalysisStream,
  toAnalysisErrorPayload: (error: unknown) => ({
    code: "UNKNOWN",
    message: error instanceof Error ? error.message : String(error),
    details: error instanceof Error ? error.message : String(error),
  }),
}));

import { ManuscriptAnalysisService } from "../../../src/main/services/features/analysis/manuscriptAnalysisService.js";

const createWindow = () =>
  ({
    id: 1,
    isDestroyed: () => false,
    webContents: {
      send: vi.fn(),
    },
  }) as const;

describe("ManuscriptAnalysisService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.projectFindUnique.mockResolvedValue({
      projectPath: "/tmp/test-project.luie",
      characters: [],
      terms: [],
    });
    mocked.chapterFindFirst.mockResolvedValue({
      id: "chapter-1",
      title: "Chapter 1",
      content: "# chapter content",
    });
    mocked.readLuieEntry.mockImplementation(async (_projectPath: string, entryPath: string) => {
      if (entryPath === "meta.json") {
        return JSON.stringify({
          chapters: [{ id: "chapter-1", title: "Chapter 1" }],
        });
      }
      return "# chapter content";
    });
    mocked.buildAnalysisContext.mockReturnValue({
      characters: [],
      terms: [],
      manuscript: {
        title: "Chapter 1",
        content: "# chapter content",
        nounPhrases: [],
      },
    });
    mocked.runGeminiAnalysisStream.mockResolvedValue("completed");
  });

  it("returns before the background analysis stream completes", async () => {
    let resolveOutcome: ((value: "completed") => void) | null = null;
    mocked.runGeminiAnalysisStream.mockImplementation(
      () =>
        new Promise<"completed">((resolve) => {
          resolveOutcome = resolve;
        }),
    );

    const service = new ManuscriptAnalysisService();
    const window = createWindow();

    await expect(
      service.startAnalysis("chapter-1", "project-1", window as never),
    ).resolves.toBeUndefined();
    expect(service.isAnalysisInProgress()).toBe(true);

    await vi.waitFor(() => {
      expect(mocked.runGeminiAnalysisStream).toHaveBeenCalledTimes(1);
    });

    resolveOutcome?.("completed");

    await vi.waitFor(() => {
      expect(service.isAnalysisInProgress()).toBe(false);
    });
  });

  it("falls back to DB chapter content when .luie package is unavailable", async () => {
    mocked.projectFindUnique.mockResolvedValue({
      projectPath: null,
      characters: [{ name: "Alice", description: "Hero" }],
      terms: [{ term: "Arcology", definition: "Mega city", category: "place" }],
    });
    mocked.chapterFindFirst.mockResolvedValue({
      id: "chapter-1",
      title: "DB Chapter",
      content: "db chapter content",
    });

    const service = new ManuscriptAnalysisService();
    const window = createWindow();

    await expect(
      service.startAnalysis("chapter-1", "project-1", window as never),
    ).resolves.toBeUndefined();

    await vi.waitFor(() => {
      expect(mocked.runGeminiAnalysisStream).toHaveBeenCalledTimes(1);
    });

    expect(mocked.buildAnalysisContext).toHaveBeenCalledWith(
      {
        id: "chapter-1",
        title: "DB Chapter",
        content: "db chapter content",
      },
      [{ name: "Alice", description: "Hero" }],
      [{ term: "Arcology", definition: "Mega city", category: "place" }],
    );
    expect(mocked.readLuieEntry).not.toHaveBeenCalled();
  });

  it("aborts the active run when stopAnalysis is called", async () => {
    let capturedSignal: AbortSignal | undefined;
    mocked.runGeminiAnalysisStream.mockImplementation(
      async ({ signal }: { signal?: AbortSignal }) => {
        capturedSignal = signal;
        await new Promise<void>((resolve) => {
          signal?.addEventListener("abort", () => resolve(), { once: true });
        });
        return "cancelled";
      },
    );

    const service = new ManuscriptAnalysisService();
    const window = createWindow();

    await service.startAnalysis("chapter-1", "project-1", window as never);
    await vi.waitFor(() => {
      expect(mocked.runGeminiAnalysisStream).toHaveBeenCalledTimes(1);
    });

    service.stopAnalysis();

    expect(capturedSignal?.aborted).toBe(true);
    expect(service.isAnalysisInProgress()).toBe(false);
  });

  it("aborts the active run when analysis data is cleared", async () => {
    let capturedSignal: AbortSignal | undefined;
    mocked.runGeminiAnalysisStream.mockImplementation(
      async ({ signal }: { signal?: AbortSignal }) => {
        capturedSignal = signal;
        await new Promise<void>((resolve) => {
          signal?.addEventListener("abort", () => resolve(), { once: true });
        });
        return "cancelled";
      },
    );

    const service = new ManuscriptAnalysisService();
    const window = createWindow();

    await service.startAnalysis("chapter-1", "project-1", window as never);
    await vi.waitFor(() => {
      expect(mocked.runGeminiAnalysisStream).toHaveBeenCalledTimes(1);
    });

    service.clearAnalysisData();

    expect(capturedSignal?.aborted).toBe(true);
    expect(service.isAnalysisInProgress()).toBe(false);
  });
});
