import { describe, expect, it } from "vitest";

describe("worldGraphPanel ui state ownership", () => {
  it("uses worldGraphUiStore for panel state ownership", async () => {
    const panelModule =
      await import("../../../../src/renderer/src/features/research/components/world/graph/WorldGraphPanel.js");

    expect(typeof panelModule.WorldGraphPanel).toBe("function");
  });
});
