import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const findUniqueMock = vi.fn();
const updateChapterMock = vi.fn();
const createSnapshotMock = vi.fn();
const deleteOldSnapshotsMock = vi.fn();

vi.mock("../../../src/main/database/index.js", () => ({
  db: {
    getClient: () => ({
      chapter: {
        findUnique: findUniqueMock,
      },
    }),
  },
}));

vi.mock("../../../src/main/services/core/chapterService.js", () => ({
  chapterService: {
    updateChapter: updateChapterMock,
  },
}));

vi.mock(
  "../../../src/main/services/features/snapshot/snapshotService.js",
  () => ({
    snapshotService: {
      createSnapshot: createSnapshotMock,
      deleteOldSnapshots: deleteOldSnapshotsMock,
    },
  }),
);

describe("AutoSaveManager runtime stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    findUniqueMock.mockImplementation(async ({ where }) => {
      const chapterId = String(
        (where as { id?: unknown } | undefined)?.id ?? "",
      );
      const projectId = chapterId === "chapter-2" ? "project-2" : "project-1";
      return {
        projectId,
        deletedAt: null,
      };
    });
    updateChapterMock.mockResolvedValue(undefined);
    createSnapshotMock.mockResolvedValue(undefined);
    deleteOldSnapshotsMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("records scheduling and save completion counters", async () => {
    const { autoSaveManager } =
      await import("../../../src/main/manager/autoSaveManager.js");
    const before = autoSaveManager.getRuntimeStats();

    autoSaveManager.setConfig("project-1", {
      enabled: true,
      interval: 60_000,
      debounceMs: 30,
    });

    await autoSaveManager.triggerSave(
      "chapter-1",
      "x".repeat(300),
      "project-1",
    );
    await autoSaveManager.flushAll();

    const after = autoSaveManager.getRuntimeStats();
    expect(after.triggered - before.triggered).toBe(1);
    expect(after.scheduled - before.scheduled).toBe(1);
    expect(after.saveStarted - before.saveStarted).toBe(1);
    expect(after.saveSucceeded - before.saveSucceeded).toBe(1);
    expect(after.averageQueueDelayMs).toBeGreaterThanOrEqual(0);

    autoSaveManager.clearProject("project-1");
  });

  it("records duplicate trigger and reschedule for same chapter/content", async () => {
    const { autoSaveManager } =
      await import("../../../src/main/manager/autoSaveManager.js");
    const before = autoSaveManager.getRuntimeStats();

    autoSaveManager.setConfig("project-2", {
      enabled: true,
      interval: 60_000,
      debounceMs: 80,
    });

    await autoSaveManager.triggerSave(
      "chapter-2",
      "y".repeat(300),
      "project-2",
    );
    await autoSaveManager.triggerSave(
      "chapter-2",
      "y".repeat(300),
      "project-2",
    );
    await vi.advanceTimersByTimeAsync(100);
    await autoSaveManager.flushAll();

    const after = autoSaveManager.getRuntimeStats();
    expect(after.triggered - before.triggered).toBe(2);
    expect(after.rescheduled - before.rescheduled).toBeGreaterThanOrEqual(1);
    expect(
      after.duplicateTriggers - before.duplicateTriggers,
    ).toBeGreaterThanOrEqual(1);

    autoSaveManager.clearProject("project-2");
  });
});
