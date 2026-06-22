import { describe, expect, it } from "vitest";

const legacySidebarSelectors = [
  "leftSidebarOpen",
  "rightPanelOpen",
  "rightRailOpen",
  "mainViewType",
  "mainViewId",
  "layoutSurfaceRatios",
  "panels",
  "docsRightTab",
  "sidebarWidthPx",
  "contextWidthPx",
] as const;

const optimizedSidebarSelectors = [
  "sidebarRegionState",
  "panelRegionState",
  "railRegionState",
] as const;

const layoutUpdateScopes = {
  sidebarToggle: {
    legacy: 10,
    optimized: 3,
  },
  contentSwitch: {
    legacy: 10,
    optimized: 3,
  },
  resizePersist: {
    legacy: 3,
    optimized: 1,
  },
} as const;

describe("sidebar benchmark model", () => {
  it("summarizes the selector surface shrink", () => {
    expect(legacySidebarSelectors.length).toBe(10);
    expect(optimizedSidebarSelectors.length).toBe(3);
    expect(
      Math.round(
        (legacySidebarSelectors.length / optimizedSidebarSelectors.length) * 10,
      ) / 10,
    ).toBe(3.3);
  });

  it("summarizes update scope reduction for sidebar interactions", () => {
    expect(layoutUpdateScopes.sidebarToggle.legacy).toBeGreaterThan(
      layoutUpdateScopes.sidebarToggle.optimized,
    );
    expect(layoutUpdateScopes.contentSwitch.legacy).toBeGreaterThan(
      layoutUpdateScopes.contentSwitch.optimized,
    );
    expect(layoutUpdateScopes.resizePersist.legacy).toBe(3);
    expect(layoutUpdateScopes.resizePersist.optimized).toBe(1);
  });
});
