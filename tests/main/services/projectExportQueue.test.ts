import { describe, expect, it, vi } from "vitest";
import { ProjectExportQueue } from "../../../src/main/services/core/project/projectExportQueue.js";

describe("ProjectExportQueue", () => {
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
});
