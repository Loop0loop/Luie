import { describe, expect, it } from "vitest";
import {
  flushSaveBuffers,
  registerSaveBufferFlush,
} from "../../../src/shared/ui/saveBufferRegistry.js";

describe("saveBufferRegistry", () => {
  it("waits for every registered buffer before reporting a failure", async () => {
    const calls: string[] = [];
    let resolveFirst: (() => void) | undefined;
    const firstFinished = new Promise<void>((resolve) => {
      resolveFirst = resolve;
    });
    const unregisterFirst = registerSaveBufferFlush(async () => {
      calls.push("first");
      await firstFinished;
      calls.push("first finished");
    });
    const unregisterSecond = registerSaveBufferFlush(async () => {
      calls.push("second");
      throw new Error("buffer failed");
    });

    let settled = false;
    const flush = flushSaveBuffers();
    void flush.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });

    expect(calls).toEqual(["first", "second"]);
    expect(settled).toBe(false);

    resolveFirst?.();
    await expect(flush).rejects.toThrow("buffer failed");
    expect(calls).toEqual(["first", "second", "first finished"]);

    unregisterFirst();
    unregisterSecond();
    await expect(flushSaveBuffers()).resolves.toBeUndefined();
  });
});
