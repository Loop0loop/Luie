import { describe, expect, it } from "vitest";
import {
  flushSaveBuffers,
  registerSaveBufferFlush,
} from "../../../src/shared/ui/saveBufferRegistry.js";

describe("saveBufferRegistry", () => {
  it("waits for every registered buffer before reporting a failure", async () => {
    const calls: string[] = [];
    const unregisterFirst = registerSaveBufferFlush(async () => {
      calls.push("first");
      await Promise.resolve();
    });
    const unregisterSecond = registerSaveBufferFlush(async () => {
      calls.push("second");
      throw new Error("buffer failed");
    });

    await expect(flushSaveBuffers()).rejects.toThrow("buffer failed");
    expect(calls).toEqual(["first", "second"]);

    unregisterFirst();
    unregisterSecond();
    await expect(flushSaveBuffers()).resolves.toBeUndefined();
  });
});
