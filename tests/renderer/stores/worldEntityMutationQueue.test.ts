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
});
