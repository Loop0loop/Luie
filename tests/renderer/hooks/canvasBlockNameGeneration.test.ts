import { describe, expect, it } from "vitest";
import { buildNextCanvasBlockName } from "../../../src/renderer/src/features/research/components/world/graph/tabs/canvasNodeNaming";

describe("buildNextCanvasBlockName", () => {
  it("returns base name when none exists", () => {
    const next = buildNextCanvasBlockName([]);
    expect(next).toBe("새로운 블럭");
  });

  it("increments suffix for duplicates", () => {
    const next = buildNextCanvasBlockName([
      "새로운 블럭",
      "새로운 블럭 1",
      "새로운 블럭 2",
    ]);
    expect(next).toBe("새로운 블럭 3");
  });

  it("treats case-variant names as duplicates", () => {
    const next = buildNextCanvasBlockName([
      "새로운 블럭",
      "  새로운 블럭 1  ",
      "새로운 블럭 2",
    ]);
    expect(next).toBe("새로운 블럭 3");
  });
});
