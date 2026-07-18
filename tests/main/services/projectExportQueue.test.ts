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

import {
  ProjectExportQueue,
  type ProjectExportRun,
} from "../../../src/main/services/core/project/projectExportQueue.js";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
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

  it("counts false as failed and retries the retained revision on the next flush", async () => {
    const runExport = vi
      .fn<(projectId: string, revision: number) => Promise<boolean>>()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const queue = new ProjectExportQueue(100, runExport, logger);

    queue.schedule("project-1", "character:update");
    await expect(queue.flush()).resolves.toEqual({
      total: 1,
      flushed: 0,
      failed: 1,
      timedOut: false,
    });
    expect(revisionMocks.markProjectExported).not.toHaveBeenCalled();

    await expect(queue.flush()).resolves.toEqual({
      total: 1,
      flushed: 1,
      failed: 0,
      timedOut: false,
    });
    expect(runExport).toHaveBeenNthCalledWith(1, "project-1", 1);
    expect(runExport).toHaveBeenNthCalledWith(2, "project-1", 1);
    expect(revisionMocks.markProjectExported).toHaveBeenCalledOnce();
    await expect(queue.flush()).resolves.toMatchObject({ total: 0 });
  });

  it("counts throw as failed and retries the retained revision on the next flush", async () => {
    const failure = new Error("disk full");
    const runExport = vi
      .fn<(projectId: string, revision: number) => Promise<boolean>>()
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(true);
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const queue = new ProjectExportQueue(100, runExport, logger);

    queue.schedule("project-1", "character:update");
    await expect(queue.flush()).resolves.toMatchObject({
      total: 1,
      flushed: 0,
      failed: 1,
      timedOut: false,
    });
    expect(revisionMocks.markProjectExported).not.toHaveBeenCalled();

    await expect(queue.flush()).resolves.toMatchObject({
      total: 1,
      flushed: 1,
      failed: 0,
      timedOut: false,
    });
    expect(runExport).toHaveBeenCalledTimes(2);
    expect(revisionMocks.markProjectExported).toHaveBeenCalledWith(
      "project-1",
      1,
    );
  });

  it.each([
    ["false", false],
    ["throw", new Error("scheduled failure")],
  ])("retains a scheduled %s failure for the next explicit flush", async (_label, result) => {
    vi.useFakeTimers();
    const runExport = vi
      .fn<(projectId: string, revision: number) => Promise<boolean>>()
      .mockImplementationOnce(async () => {
        if (result instanceof Error) throw result;
        return result;
      })
      .mockResolvedValueOnce(true);
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const queue = new ProjectExportQueue(100, runExport, logger);

    queue.schedule("project-1", "scheduled-failure");
    await vi.advanceTimersByTimeAsync(100);
    await vi.waitFor(() => expect(runExport).toHaveBeenCalledOnce());

    await expect(queue.flush()).resolves.toMatchObject({
      total: 1,
      flushed: 1,
      failed: 0,
    });
    expect(runExport).toHaveBeenCalledTimes(2);
    expect(queue.getReasonStats()["scheduled-failure"]?.failed).toBe(1);
    vi.useRealTimers();
  });

  it("retains a late false result after flush timeout and retries it", async () => {
    const lateExport = deferred<boolean>();
    const runExport = vi
      .fn<(projectId: string, revision: number) => Promise<boolean>>()
      .mockReturnValueOnce(lateExport.promise)
      .mockResolvedValueOnce(true);
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const queue = new ProjectExportQueue(100, runExport, logger);

    queue.schedule("project-1", "late-failure");
    await expect(queue.flush(1)).resolves.toEqual({
      total: 1,
      flushed: 0,
      failed: 0,
      timedOut: true,
    });

    lateExport.resolve(false);
    await vi.waitFor(() =>
      expect(queue.getReasonStats().flush?.failed).toBe(1),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    await expect(queue.flush()).resolves.toMatchObject({
      total: 1,
      flushed: 1,
      failed: 0,
      timedOut: false,
    });
    expect(runExport).toHaveBeenCalledTimes(2);
  });

  it("cleans up after a late successful result following flush timeout", async () => {
    const lateExport = deferred<boolean>();
    const runExport = vi
      .fn<(projectId: string, revision: number) => Promise<boolean>>()
      .mockReturnValueOnce(lateExport.promise);
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const queue = new ProjectExportQueue(100, runExport, logger);

    queue.schedule("project-1", "late-success");
    await expect(queue.flush(1)).resolves.toMatchObject({ timedOut: true });

    lateExport.resolve(true);
    await vi.waitFor(() =>
      expect(revisionMocks.markProjectExported).toHaveBeenCalledOnce(),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    await expect(queue.flush()).resolves.toEqual({
      total: 0,
      flushed: 0,
      failed: 0,
      timedOut: false,
    });
    expect(runExport).toHaveBeenCalledOnce();
  });

  it("cleans up a skipped export without marking or counting a failure", async () => {
    const runExport = vi
      .fn<ProjectExportRun>()
      .mockResolvedValue("skipped");
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const queue = new ProjectExportQueue(100, runExport, logger);

    queue.schedule("project-1", "detached-save");
    await expect(queue.flush()).resolves.toEqual({
      total: 1,
      flushed: 0,
      failed: 0,
      timedOut: false,
    });
    expect(revisionMocks.markProjectExported).not.toHaveBeenCalled();
    expect(queue.getReasonStats()["detached-save"]?.failed).toBe(0);
    await expect(queue.flush()).resolves.toMatchObject({ total: 0 });
  });

  it("retains a late throw after timeout and retries on the next flush", async () => {
    const lateExport = deferred<boolean>();
    const runExport = vi
      .fn<(projectId: string, revision: number) => Promise<boolean>>()
      .mockReturnValueOnce(lateExport.promise)
      .mockResolvedValueOnce(true);
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const queue = new ProjectExportQueue(100, runExport, logger);

    queue.schedule("project-1", "late-throw");
    await expect(queue.flush(1)).resolves.toMatchObject({
      failed: 0,
      timedOut: true,
    });

    lateExport.reject(new Error("late disk failure"));
    await vi.waitFor(() =>
      expect(queue.getReasonStats().flush?.failed).toBe(1),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    await expect(queue.flush()).resolves.toMatchObject({
      total: 1,
      flushed: 1,
      failed: 0,
      timedOut: false,
    });
    expect(runExport).toHaveBeenCalledTimes(2);
  });
});
