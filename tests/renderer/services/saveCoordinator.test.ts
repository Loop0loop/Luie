// TEST_LEVEL: UNIT_MOCKED
// PROVES: renderer mutation queues drain before main-process checkpoint

import { describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  calls: [] as string[],
  flushWorldEntityMutations: vi.fn(async () => undefined),
  manualSave: vi.fn(async () => ({
    success: true as const,
    data: { success: true, exported: true },
  })),
}));

vi.mock("@renderer/shared/store/worldEntityMutationQueue", () => ({
  flushWorldEntityMutations: mocked.flushWorldEntityMutations,
}));

vi.mock("@shared/api", () => ({
  api: { app: { manualSave: mocked.manualSave } },
}));

import { saveProjectNow } from "../../../src/renderer/src/features/workspace/services/saveCoordinator.js";

describe("saveProjectNow", () => {
  it("drains renderer mutations before forcing the main checkpoint", async () => {
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

    expect(mocked.calls).toEqual(["world", "main"]);
    expect(mocked.manualSave).toHaveBeenCalledWith("project-1");
  });
});
