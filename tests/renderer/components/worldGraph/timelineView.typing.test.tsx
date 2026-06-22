import { describe, expect, it } from "vitest";

describe("timeline view typing", () => {
  it("exports timeline event patch type", async () => {
    const module =
      await import("../../../../src/renderer/src/features/research/components/world/graph/views/TimelineView.js");

    expect(typeof module.TimelineView).toBe("function");
  });
});
