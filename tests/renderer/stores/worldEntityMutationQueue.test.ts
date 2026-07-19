import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createLatestMutationQueue,
  flushWorldEntityMutations,
  getPendingWorldEntityMutationCount,
} from "../../../src/renderer/src/shared/store/worldEntityMutationQueue.js";

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
};

describe("worldEntityMutationQueue", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("serializes patches that arrive during an in-flight update", async () => {
    const first = deferred<{ id: string; name: string; description?: string }>();
    const execute = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce({
        id: "char-1",
        name: "Hero",
        description: "Lead",
      });
    const queue = createLatestMutationQueue({
      merge: (left, right) => ({ ...left, ...right }),
      execute,
    });

    const nameSave = queue.enqueue({ id: "char-1", name: "Hero" });
    const descriptionSave = queue.enqueue({
      id: "char-1",
      description: "Lead",
    });
    expect(execute).toHaveBeenCalledOnce();

    first.resolve({ id: "char-1", name: "Hero" });
    await Promise.all([nameSave, descriptionSave]);

    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute).toHaveBeenLastCalledWith({
      id: "char-1",
      description: "Lead",
    });
    expect(queue.pendingCount()).toBe(0);
  });

  it("drains work enqueued by an await continuation after a successful ACK", async () => {
    const execute = vi.fn(async (patch: { id: string; name: string }) => patch);
    const queue = createLatestMutationQueue({
      merge: (left, right) => ({ ...left, ...right }),
      execute,
    });

    await queue.enqueue({ id: "char-continuation", name: "First" });
    let secondSettled = false;
    const secondSave = queue
      .enqueue({ id: "char-continuation", name: "Second" })
      .then(() => {
        secondSettled = true;
      });
    let probeTimer: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      secondSave,
      new Promise<void>((resolve) => {
        probeTimer = setTimeout(resolve, 0);
      }),
    ]);
    if (probeTimer !== undefined) clearTimeout(probeTimer);

    const callsBeforeCleanup = execute.mock.calls.length;
    const settledBeforeCleanup = secondSettled;
    await Promise.all([queue.flush(), secondSave]);

    expect(callsBeforeCleanup).toBe(2);
    expect(settledBeforeCleanup).toBe(true);
    expect(execute).toHaveBeenNthCalledWith(2, {
      id: "char-continuation",
      name: "Second",
    });
    expect(queue.pendingCount()).toBe(0);
  });

  it("keeps flush pending until success-continuation work is acknowledged", async () => {
    type Patch = { id: string; name: string };
    const first = deferred<Patch>();
    const second = deferred<Patch>();
    const secondStarted = deferred<void>();
    const execute = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockImplementationOnce(() => {
        secondStarted.resolve();
        return second.promise;
      });
    const queue = createLatestMutationQueue<Patch, Patch>({
      merge: (left, right) => ({ ...left, ...right }),
      execute,
    });

    const firstSave = queue.enqueue({ id: "char-flush-barrier", name: "First" });
    let secondSave!: Promise<Patch | null>;
    const continuation = firstSave.then(() => {
      secondSave = queue.enqueue({
        id: "char-flush-barrier",
        name: "Second",
      });
      return secondSave;
    });
    const flush = queue.flush();

    first.resolve({ id: "char-flush-barrier", name: "First" });
    await secondStarted.promise;
    let probeTimer: ReturnType<typeof setTimeout> | undefined;
    const flushSettledBeforeAck = await Promise.race([
      flush.then(() => true),
      new Promise<boolean>((resolve) => {
        probeTimer = setTimeout(() => resolve(false), 0);
      }),
    ]);
    if (probeTimer !== undefined) clearTimeout(probeTimer);

    second.resolve({ id: "char-flush-barrier", name: "Second" });
    await Promise.all([continuation, flush]);

    expect(flushSettledBeforeAck).toBe(false);
    await expect(secondSave).resolves.toEqual({
      id: "char-flush-barrier",
      name: "Second",
    });
    expect(execute).toHaveBeenCalledTimes(2);
    expect(queue.pendingCount()).toBe(0);
  });

  it("flushes every active queue", async () => {
    const result = deferred<{ id: string; name: string }>();
    const queue = createLatestMutationQueue({
      merge: (left, right) => ({ ...left, ...right }),
      execute: vi.fn(() => result.promise),
    });
    const save = queue.enqueue({ id: "char-1", name: "Hero" });

    expect(getPendingWorldEntityMutationCount()).toBe(1);
    const flush = flushWorldEntityMutations();
    result.resolve({ id: "char-1", name: "Hero" });

    await Promise.all([save, flush]);
    expect(getPendingWorldEntityMutationCount()).toBe(0);
  });

  it("retains a rejected patch until the next explicit flush succeeds", async () => {
    const failure = new Error("disk unavailable");
    const patch = { id: "char-retry", name: "Hero" };
    const execute = vi
      .fn()
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(patch);
    const queue = createLatestMutationQueue({
      merge: (left, right) => ({ ...left, ...right }),
      execute,
    });

    const save = queue.enqueue(patch);
    const firstFlush = flushWorldEntityMutations();

    await expect(save).rejects.toBe(failure);
    await expect(firstFlush).rejects.toBe(failure);
    expect(execute).toHaveBeenCalledOnce();
    expect(queue.pendingCount()).toBe(1);
    expect(getPendingWorldEntityMutationCount()).toBe(1);

    await flushWorldEntityMutations();

    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute).toHaveBeenLastCalledWith(patch);
    expect(queue.pendingCount()).toBe(0);
    expect(getPendingWorldEntityMutationCount()).toBe(0);
  });

  it("treats a null ACK as failure and retries it on the next enqueue", async () => {
    const execute = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockImplementationOnce(async (patch) => patch);
    const queue = createLatestMutationQueue({
      merge: (left, right: { id: string; name?: string; description?: string }) =>
        ({ ...left, ...right }),
      execute,
    });

    await expect(
      queue.enqueue({ id: "char-null", description: "Lead" }),
    ).rejects.toThrow("no acknowledgement");
    expect(queue.pendingCount()).toBe(1);

    await expect(
      queue.enqueue({ id: "char-null", name: "Hero" }),
    ).resolves.toEqual({
      id: "char-null",
      name: "Hero",
      description: "Lead",
    });
    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute).toHaveBeenLastCalledWith({
      id: "char-null",
      name: "Hero",
      description: "Lead",
    });
    expect(getPendingWorldEntityMutationCount()).toBe(0);
  });

  it("merges a failed patch before newer pending values without losing keys", async () => {
    type Patch = {
      id: string;
      name?: string;
      description?: string;
      attributesPatch?: Record<string, unknown>;
    };
    const failure = new Error("temporary failure");
    const firstAttempt = deferred<Patch>();
    const execute = vi
      .fn()
      .mockReturnValueOnce(firstAttempt.promise)
      .mockImplementationOnce(async (patch: Patch) => patch);
    const queue = createLatestMutationQueue<Patch, Patch>({
      merge: (left, right) => ({
        ...left,
        ...right,
        attributesPatch:
          left?.attributesPatch || right.attributesPatch
            ? {
                ...(left?.attributesPatch ?? {}),
                ...(right.attributesPatch ?? {}),
              }
            : undefined,
      }),
      execute,
    });

    const failedSave = queue.enqueue({
      id: "char-merge",
      name: "Old",
      description: "Lead",
      attributesPatch: { role: "lead", color: "blue" },
    });
    const newerSave = queue.enqueue({
      id: "char-merge",
      name: "New",
      attributesPatch: { color: "red", tagline: "Hero" },
    });
    const firstFlush = flushWorldEntityMutations();

    firstAttempt.reject(failure);
    await expect(failedSave).rejects.toBe(failure);
    await expect(firstFlush).rejects.toBe(failure);
    expect(execute).toHaveBeenCalledOnce();

    await flushWorldEntityMutations();
    await expect(newerSave).resolves.toEqual({
      id: "char-merge",
      name: "New",
      description: "Lead",
      attributesPatch: { role: "lead", color: "red", tagline: "Hero" },
    });
    expect(execute).toHaveBeenLastCalledWith({
      id: "char-merge",
      name: "New",
      description: "Lead",
      attributesPatch: { role: "lead", color: "red", tagline: "Hero" },
    });
    expect(getPendingWorldEntityMutationCount()).toBe(0);
  });

  it("retries at 250ms, 500ms, and 1000ms before preserving exhausted work", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const failure = new Error("temporary failure");
    const patch = { id: "char-backoff", name: "Hero" };
    const attemptTimes: number[] = [];
    let recover = false;
    const execute = vi.fn(async () => {
      attemptTimes.push(Date.now());
      if (recover) return patch;
      throw failure;
    });
    const queue = createLatestMutationQueue({
      merge: (left, right) => ({ ...left, ...right }),
      execute,
      retryDelaysMs: [250, 500, 1000],
    });

    await expect(queue.enqueue(patch)).rejects.toBe(failure);
    await vi.advanceTimersByTimeAsync(249);
    await vi.advanceTimersByTimeAsync(1);
    await vi.advanceTimersByTimeAsync(499);
    await vi.advanceTimersByTimeAsync(1);
    await vi.advanceTimersByTimeAsync(999);
    await vi.advanceTimersByTimeAsync(1);
    await vi.advanceTimersByTimeAsync(5000);

    const callsBeforeCleanup = execute.mock.calls.length;
    const timesBeforeCleanup = [...attemptTimes];
    const pendingBeforeCleanup = queue.pendingCount();
    const globalPendingBeforeCleanup = getPendingWorldEntityMutationCount();
    recover = true;
    await queue.flush();

    expect(callsBeforeCleanup).toBe(4);
    expect(timesBeforeCleanup).toEqual([0, 250, 750, 1750]);
    expect(pendingBeforeCleanup).toBe(1);
    expect(globalPendingBeforeCleanup).toBe(1);
    expect(queue.pendingCount()).toBe(0);
  });

  it("cancels the remaining backoff after a background ACK", async () => {
    vi.useFakeTimers();
    const failure = new Error("retry once");
    const patch = { id: "char-success", name: "Hero" };
    const execute = vi
      .fn()
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(patch);
    const onIdle = vi.fn();
    const queue = createLatestMutationQueue({
      merge: (left, right) => ({ ...left, ...right }),
      execute,
      retryDelaysMs: [250, 500, 1000],
      onIdle,
    });

    await expect(queue.enqueue(patch)).rejects.toBe(failure);
    await vi.advanceTimersByTimeAsync(250);
    await vi.advanceTimersByTimeAsync(5000);

    const callsBeforeCleanup = execute.mock.calls.length;
    const pendingBeforeCleanup = queue.pendingCount();
    const idleBeforeCleanup = onIdle.mock.calls.length;
    if (pendingBeforeCleanup > 0) await queue.flush();

    expect(callsBeforeCleanup).toBe(2);
    expect(pendingBeforeCleanup).toBe(0);
    expect(idleBeforeCleanup).toBe(1);
    expect(getPendingWorldEntityMutationCount()).toBe(0);
  });

  it("interrupts a timer with merged newer work and resets only its generation", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    type Patch = {
      id: string;
      name?: string;
      attributesPatch?: Record<string, unknown>;
    };
    const failure = new Error("retry newer");
    const attemptTimes: number[] = [];
    const execute = vi.fn(async (patch: Patch) => {
      attemptTimes.push(Date.now());
      if (attemptTimes.length < 4) throw failure;
      return patch;
    });
    const queue = createLatestMutationQueue<Patch, Patch>({
      merge: (left, right) => ({
        ...left,
        ...right,
        attributesPatch: {
          ...(left?.attributesPatch ?? {}),
          ...(right.attributesPatch ?? {}),
        },
      }),
      execute,
      retryDelaysMs: [250, 500, 1000],
    });

    await expect(
      queue.enqueue({
        id: "char-newer",
        name: "Old",
        attributesPatch: { role: "lead", color: "blue" },
      }),
    ).rejects.toBe(failure);
    await vi.advanceTimersByTimeAsync(250);
    await vi.advanceTimersByTimeAsync(50);

    await expect(
      queue.enqueue({
        id: "char-newer",
        name: "New",
        attributesPatch: { color: "red", tagline: "Hero" },
      }),
    ).rejects.toBe(failure);
    const mergedPatch = {
      id: "char-newer",
      name: "New",
      attributesPatch: { role: "lead", color: "red", tagline: "Hero" },
    };

    await vi.advanceTimersByTimeAsync(249);
    await vi.advanceTimersByTimeAsync(1);

    const callsBeforeCleanup = execute.mock.calls.length;
    const timesBeforeCleanup = [...attemptTimes];
    const pendingBeforeCleanup = queue.pendingCount();
    if (pendingBeforeCleanup > 0) await queue.flush();

    expect(execute).toHaveBeenNthCalledWith(3, mergedPatch);
    expect(callsBeforeCleanup).toBe(4);
    expect(timesBeforeCleanup).toEqual([0, 250, 300, 550]);
    expect(queue.pendingCount()).toBe(0);
  });

  it("does not reset the retry budget when an explicit flush interrupts", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const failure = new Error("keep budget");
    const patch = { id: "char-explicit", name: "Hero" };
    const attemptTimes: number[] = [];
    let recover = false;
    const execute = vi.fn(async () => {
      attemptTimes.push(Date.now());
      if (recover) return patch;
      throw failure;
    });
    const queue = createLatestMutationQueue({
      merge: (left, right) => ({ ...left, ...right }),
      execute,
      retryDelaysMs: [250, 500, 1000],
    });

    await expect(queue.enqueue(patch)).rejects.toBe(failure);
    await vi.advanceTimersByTimeAsync(250);
    await vi.advanceTimersByTimeAsync(50);
    await expect(queue.flush()).rejects.toBe(failure);
    await vi.advanceTimersByTimeAsync(499);
    await vi.advanceTimersByTimeAsync(1);
    await vi.advanceTimersByTimeAsync(999);
    await vi.advanceTimersByTimeAsync(1);
    await vi.advanceTimersByTimeAsync(5000);

    const callsBeforeCleanup = execute.mock.calls.length;
    const timesBeforeCleanup = [...attemptTimes];
    const pendingBeforeCleanup = queue.pendingCount();
    recover = true;
    await queue.flush();

    expect(callsBeforeCleanup).toBe(5);
    expect(timesBeforeCleanup).toEqual([0, 250, 300, 800, 1800]);
    expect(pendingBeforeCleanup).toBe(1);
    expect(queue.pendingCount()).toBe(0);
  });

  it("shares an automatic in-flight retry with a foreground flush", async () => {
    vi.useFakeTimers();
    const failure = new Error("retry in flight");
    const retry = deferred<{ id: string; name: string }>();
    const patch = { id: "char-race", name: "Hero" };
    const execute = vi
      .fn()
      .mockRejectedValueOnce(failure)
      .mockReturnValueOnce(retry.promise);
    const queue = createLatestMutationQueue({
      merge: (left, right) => ({ ...left, ...right }),
      execute,
      retryDelaysMs: [250, 500, 1000],
    });

    await expect(queue.enqueue(patch)).rejects.toBe(failure);
    await vi.advanceTimersByTimeAsync(250);
    const callsBeforeFlush = execute.mock.calls.length;

    const flush = queue.flush();
    retry.resolve(patch);
    await flush;

    expect(callsBeforeFlush).toBe(2);
    expect(execute).toHaveBeenCalledTimes(2);
    expect(queue.pendingCount()).toBe(0);
  });

  it("does not strand newer work enqueued while a failing attempt is in flight", async () => {
    vi.useFakeTimers();
    type Patch = { id: string; name?: string; description?: string };
    const failure = new Error("first failed");
    const first = deferred<Patch>();
    const execute = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockImplementationOnce(async (patch: Patch) => patch);
    const queue = createLatestMutationQueue<Patch, Patch>({
      merge: (left, right) => ({ ...left, ...right }),
      execute,
      retryDelaysMs: [250, 500, 1000],
    });

    const firstSave = queue.enqueue({ id: "char-strand", name: "Hero" });
    const newerSave = queue.enqueue({
      id: "char-strand",
      description: "Lead",
    });
    first.reject(failure);

    await expect(firstSave).rejects.toBe(failure);
    expect(execute).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(249);
    expect(execute).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);
    const callsAfterTimer = execute.mock.calls.length;
    const cleanup = queue.flush();
    await expect(newerSave).resolves.toEqual({
      id: "char-strand",
      name: "Hero",
      description: "Lead",
    });
    await cleanup;

    expect(callsAfterTimer).toBe(2);
    expect(execute).toHaveBeenCalledTimes(2);
    expect(queue.pendingCount()).toBe(0);
  });

  it("immediately drains newer work from a generic queue failure continuation", async () => {
    vi.useFakeTimers();
    type Patch = { id: string; name?: string; description?: string };
    const failure = new Error("first failed");
    const execute = vi
      .fn()
      .mockRejectedValueOnce(failure)
      .mockImplementationOnce(async (patch: Patch) => patch);
    const queue = createLatestMutationQueue<Patch, Patch>({
      merge: (left, right) => ({ ...left, ...right }),
      execute,
    });

    let newerSave!: Promise<Patch | null>;
    await queue
      .enqueue({ id: "char-continuation-retry", name: "Hero" })
      .catch((error: unknown) => {
        expect(error).toBe(failure);
        newerSave = queue.enqueue({
          id: "char-continuation-retry",
          description: "Lead",
        });
      });
    await vi.advanceTimersByTimeAsync(0);

    const callsBeforeCleanup = execute.mock.calls.length;
    const cleanup = queue.flush();
    await expect(newerSave).resolves.toEqual({
      id: "char-continuation-retry",
      name: "Hero",
      description: "Lead",
    });
    await cleanup;

    expect(callsBeforeCleanup).toBe(2);
    expect(execute).toHaveBeenCalledTimes(2);
    expect(queue.pendingCount()).toBe(0);
  });

  it("immediately drains newer work after an in-flight retry rejects", async () => {
    vi.useFakeTimers();
    type Patch = { id: string; name?: string; description?: string };
    const failure = new Error("retry failed");
    const retry = deferred<Patch>();
    const execute = vi
      .fn()
      .mockRejectedValueOnce(failure)
      .mockReturnValueOnce(retry.promise)
      .mockImplementationOnce(async (patch: Patch) => patch);
    const queue = createLatestMutationQueue<Patch, Patch>({
      merge: (left, right) => ({ ...left, ...right }),
      execute,
      retryDelaysMs: [250, 500, 1000],
    });

    await expect(
      queue.enqueue({ id: "char-retry-in-flight", name: "Hero" }),
    ).rejects.toBe(failure);
    await vi.advanceTimersByTimeAsync(250);
    expect(execute).toHaveBeenCalledTimes(2);

    const newerSave = queue.enqueue({
      id: "char-retry-in-flight",
      description: "Lead",
    });
    retry.reject(failure);
    await vi.advanceTimersByTimeAsync(0);

    const callsBeforeCleanup = execute.mock.calls.length;
    const cleanup = queue.flush();
    await expect(newerSave).resolves.toEqual({
      id: "char-retry-in-flight",
      name: "Hero",
      description: "Lead",
    });
    await cleanup;

    expect(callsBeforeCleanup).toBe(3);
    expect(execute).toHaveBeenNthCalledWith(3, {
      id: "char-retry-in-flight",
      name: "Hero",
      description: "Lead",
    });
    expect(queue.pendingCount()).toBe(0);
  });

  it("keeps timer, enqueue, and global flush execution single-flight", async () => {
    vi.useFakeTimers();
    type Patch = { id: string; name?: string; description?: string };
    const failure = new Error("initial failed");
    const retry = deferred<Patch>();
    let concurrent = 0;
    let maxConcurrent = 0;
    let attempt = 0;
    const execute = vi.fn(async (patch: Patch) => {
      attempt += 1;
      concurrent += 1;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      try {
        if (attempt === 1) throw failure;
        if (attempt === 2) return await retry.promise;
        return patch;
      } finally {
        concurrent -= 1;
      }
    });
    const queue = createLatestMutationQueue<Patch, Patch>({
      merge: (left, right) => ({ ...left, ...right }),
      execute,
      retryDelaysMs: [250, 500, 1000],
    });

    await expect(
      queue.enqueue({ id: "char-single-flight", name: "Hero" }),
    ).rejects.toBe(failure);
    await vi.advanceTimersByTimeAsync(250);
    const newerSave = queue.enqueue({
      id: "char-single-flight",
      description: "Lead",
    });
    const globalFlush = flushWorldEntityMutations();
    await Promise.resolve();

    expect(execute).toHaveBeenCalledTimes(2);
    expect(maxConcurrent).toBe(1);

    retry.resolve({ id: "char-single-flight", name: "Hero" });
    await Promise.all([newerSave, globalFlush]);
    await vi.advanceTimersByTimeAsync(5000);

    expect(execute).toHaveBeenCalledTimes(3);
    expect(maxConcurrent).toBe(1);
    expect(queue.pendingCount()).toBe(0);
  });

  it("flushes two active queues without leaving stale retry timers", async () => {
    vi.useFakeTimers();
    const failure = new Error("foreground recovery");
    const firstPatch = { id: "char-active-1", name: "One" };
    const secondPatch = { id: "char-active-2", name: "Two" };
    const firstExecute = vi
      .fn()
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(firstPatch);
    const secondExecute = vi
      .fn()
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(secondPatch);
    const firstQueue = createLatestMutationQueue({
      merge: (left, right) => ({ ...left, ...right }),
      execute: firstExecute,
      retryDelaysMs: [250, 500, 1000],
    });
    const secondQueue = createLatestMutationQueue({
      merge: (left, right) => ({ ...left, ...right }),
      execute: secondExecute,
      retryDelaysMs: [250, 500, 1000],
    });

    await Promise.all([
      expect(firstQueue.enqueue(firstPatch)).rejects.toBe(failure),
      expect(secondQueue.enqueue(secondPatch)).rejects.toBe(failure),
    ]);
    await vi.advanceTimersByTimeAsync(100);
    await flushWorldEntityMutations();
    await vi.advanceTimersByTimeAsync(5000);

    expect(firstExecute).toHaveBeenCalledTimes(2);
    expect(secondExecute).toHaveBeenCalledTimes(2);
    expect(getPendingWorldEntityMutationCount()).toBe(0);
  });

  it("keeps automatic retry disabled unless delays are provided", async () => {
    vi.useFakeTimers();
    const failure = new Error("foreground only");
    const patch = { id: "graph-document", name: "Document" };
    const execute = vi.fn().mockRejectedValue(failure);
    const queue = createLatestMutationQueue({
      merge: (left, right) => ({ ...left, ...right }),
      execute,
    });

    await expect(queue.enqueue(patch)).rejects.toBe(failure);
    await vi.advanceTimersByTimeAsync(5000);
    expect(execute).toHaveBeenCalledOnce();
    expect(queue.pendingCount()).toBe(1);

    execute.mockResolvedValueOnce(patch);
    await queue.flush();
  });
});
