import { describe, expect, it } from "vitest";

describe("canvas edge relation edit flow", () => {
  it("loads CanvasView module without native prompt coupling", async () => {
    const module =
      await import("../../../../src/renderer/src/features/research/components/world/graph/views/CanvasView.js");

    expect(typeof module.CanvasView).toBe("function");
  });
});
