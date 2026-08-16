// TEST_LEVEL: UNIT_MOCKED
// PROVES: main checkpoint 전에 renderer buffer와 mutation queue를 모두 비운다.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

  afterEach(() => {
    vi.restoreAllMocks();
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

  it("propagates a world mutation failure before the main checkpoint", async () => {
    const worldError = new Error("world failed");
    mocked.flushSaveBuffers.mockImplementationOnce(async () => {
      mocked.calls.push("buffers");
    });
    mocked.flushWorldEntityMutations.mockImplementationOnce(async () => {
      mocked.calls.push("world");
      throw worldError;
    });

    await expect(saveProjectNow("project-1")).rejects.toBe(worldError);

    expect(mocked.calls).toEqual(["buffers", "world"]);
    expect(mocked.manualSave).not.toHaveBeenCalled();
  });

  it("records a success measure only after the full save succeeds", async () => {
    const measure = vi.spyOn(performance, "measure");

    await saveProjectNow("project-1");

    expect(measure).toHaveBeenCalledWith(
      "luie:project-save",
      expect.objectContaining({ start: expect.any(Number), end: expect.any(Number) }),
    );
  });

  it("records a distinct failure measure when the save rejects", async () => {
    const measure = vi.spyOn(performance, "measure");
    mocked.manualSave.mockResolvedValueOnce({
      success: false,
      error: { code: "DB_1001", message: "save failed" },
    });

    await expect(saveProjectNow("project-1")).rejects.toThrow("save failed");

    expect(measure).toHaveBeenCalledWith(
      "luie:project-save:error",
      expect.objectContaining({ start: expect.any(Number), end: expect.any(Number) }),
    );
  });

  it("keeps saving when the performance clock is unavailable", async () => {
    vi.spyOn(performance, "now").mockImplementation(() => {
      throw new Error("performance unavailable");
    });

    await expect(saveProjectNow("project-1")).resolves.toBeUndefined();

    expect(mocked.manualSave).toHaveBeenCalledWith("project-1");
  });
});
