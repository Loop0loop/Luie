import { describe, expect, it, vi } from "vitest";
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
});
