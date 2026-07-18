import { beforeEach, describe, expect, it, vi } from "vitest";

const revisionMocks = vi.hoisted(() => ({
  getProjectRevisionState: vi.fn(async () => ({
    revision: 1,
    exportedRevision: 0,
  })),
  markProjectExported: vi.fn(async () => undefined),
}));

vi.mock(
  "../../../src/main/services/core/project/projectRevisionStore.js",
  () => revisionMocks,
);

import { ProjectExportQueue } from "../../../src/main/services/core/project/projectExportQueue.js";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

describe("ProjectExportQueue", () => {
  beforeEach(() => {
    revisionMocks.getProjectRevisionState.mockReset().mockResolvedValue({
      revision: 1,
      exportedRevision: 0,
    });
    revisionMocks.markProjectExported.mockReset().mockResolvedValue(undefined);
  });

  it("runs an immediate export without waiting for the debounce timer", async () => {
    vi.useFakeTimers();

    const runExport = vi.fn(async () => true);
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const queue = new ProjectExportQueue(1_000, runExport, logger);
    queue.schedule("project-1", "scheduled");

    const exported = await queue.runNow("project-1", "immediate");

    expect(exported).toBe(true);
    expect(runExport).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1_000);
    expect(runExport).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it("tracks reason statistics for scheduled and immediate exports", async () => {
    vi.useFakeTimers();

    const runExport = vi.fn(async () => true);
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const queue = new ProjectExportQueue(200, runExport, logger);
    queue.schedule("project-1", "world-document:graph");
    await vi.advanceTimersByTimeAsync(250);
    await queue.runNow("project-1", "chapter:create");

    const stats = queue.getReasonStats();
    expect(stats["world-document:graph"]).toMatchObject({
      scheduled: 1,
      started: 1,
    });
    expect(stats["chapter:create"]).toMatchObject({
      immediate: 1,
      started: 1,
    });

    vi.useRealTimers();
  });

  it("keeps a project dirty when a newer revision appears during export", async () => {
    vi.useFakeTimers();
    const firstExport = deferred<boolean>();
    const runExport = vi
      .fn<(projectId: string, revision: number) => Promise<boolean>>()
      .mockReturnValueOnce(firstExport.promise)
      .mockResolvedValueOnce(true);
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    revisionMocks.getProjectRevisionState
      .mockResolvedValueOnce({ revision: 1, exportedRevision: 0 })
      .mockResolvedValue({ revision: 2, exportedRevision: 0 });
    const queue = new ProjectExportQueue(100, runExport, logger);

    queue.schedule("project-1", "character:update");
    vi.advanceTimersByTime(100);
    await vi.waitFor(() => expect(runExport).toHaveBeenCalledTimes(1));

    firstExport.resolve(true);
    await queue.flush();

    expect(revisionMocks.markProjectExported).toHaveBeenNthCalledWith(
      1,
      "project-1",
      1,
    );
    expect(runExport).toHaveBeenCalledTimes(2);
    expect(revisionMocks.markProjectExported).toHaveBeenLastCalledWith(
      "project-1",
      2,
    );
    vi.useRealTimers();
  });
});
