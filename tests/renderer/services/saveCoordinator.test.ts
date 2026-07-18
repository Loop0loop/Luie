// TEST_LEVEL: UNIT_MOCKED
// PROVES: renderer buffers and mutation queues drain before main checkpoint

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  calls: [] as string[],
  flushSaveBuffers: vi.fn(async () => undefined),
  flushWorldEntityMutations: vi.fn(async () => undefined),
  manualSave: vi.fn(async () => ({
    success: true as const,
    data: { success: true, exported: true },
  })),
}));

vi.mock("@shared/ui/saveBufferRegistry", () => ({
  flushSaveBuffers: mocked.flushSaveBuffers,
}));

vi.mock("@renderer/shared/store/worldEntityMutationQueue", () => ({
  flushWorldEntityMutations: mocked.flushWorldEntityMutations,
}));

vi.mock("@shared/api", () => ({
  api: { app: { manualSave: mocked.manualSave } },
}));

import { saveProjectNow } from "../../../src/renderer/src/features/workspace/services/saveCoordinator.js";

describe("saveProjectNow", () => {
  beforeEach(() => {
    mocked.calls.length = 0;
    mocked.flushSaveBuffers.mockReset().mockResolvedValue(undefined);
    mocked.flushWorldEntityMutations.mockReset().mockResolvedValue(undefined);
    mocked.manualSave.mockReset().mockResolvedValue({
      success: true,
      data: { success: true, exported: true },
    });
  });

  it("flushes renderer buffers before world mutations and main checkpoint", async () => {
    mocked.flushSaveBuffers.mockImplementationOnce(async () => {
      mocked.calls.push("buffers");
    });
    mocked.flushWorldEntityMutations.mockImplementationOnce(async () => {
      mocked.calls.push("world");
    });
    mocked.manualSave.mockImplementationOnce(async () => {
      mocked.calls.push("main");
      return {
        success: true,
        data: { success: true, exported: true },
      };
    });

    await saveProjectNow("project-1");

    expect(mocked.calls).toEqual(["buffers", "world", "main"]);
    expect(mocked.manualSave).toHaveBeenCalledWith("project-1");
  });

  it("stops before world mutations when a renderer buffer fails", async () => {
    mocked.flushSaveBuffers.mockRejectedValueOnce(new Error("buffer failed"));

    await expect(saveProjectNow("project-1")).rejects.toThrow("buffer failed");

    expect(mocked.flushWorldEntityMutations).not.toHaveBeenCalled();
    expect(mocked.manualSave).not.toHaveBeenCalled();
  });
});
