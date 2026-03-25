import { describe, expect, it } from "vitest";
import {
  getLayoutSurfaceConfig,
  getResponsivePanelSize,
  isLayoutSurfaceId,
  type LayoutSurfaceId,
} from "../../../src/shared/constants/layoutSizing.js";

describe("layoutSizing", () => {
  it("accepts only declared layout surface ids", () => {
    const validSurface: LayoutSurfaceId = "docs.panel.world";

    expect(isLayoutSurfaceId(validSurface)).toBe(true);
    expect(isLayoutSurfaceId("toString")).toBe(false);
    expect(isLayoutSurfaceId("__proto__")).toBe(false);
  });

  it("converts px constraints into container-relative percentages", () => {
    const config = getLayoutSurfaceConfig("default.sidebar");

    expect(getResponsivePanelSize(1200, config)).toEqual({
      minSize: "18.333%",
      maxSize: "35%",
    });

    expect(getResponsivePanelSize(1920, config)).toEqual({
      minSize: "11.458%",
      maxSize: "21.875%",
    });
  });
});
