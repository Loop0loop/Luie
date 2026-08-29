import { describe, expect, it, vi } from "vitest";

vi.mock(
  "@renderer/shared/constants/layoutSizing",
  async () =>
    await import("../../../src/renderer/src/shared/constants/layoutSizing.js"),
);

import {
  buildDocsRightLayoutPersistEntries,
  buildDocsSidebarLayoutPersistEntries,
  getActiveDocsRightTab,
  getDocsLayoutSurfaceState,
  getDocsRightPanelId,
} from "../../../src/renderer/src/features/workspace/utils/docsLayoutModel.js";
import { buildDefaultLayoutSurfaceRatios } from "../../../src/renderer/src/shared/constants/layoutSizing.js";

describe("docsLayoutModel", () => {
  it("keeps docs right tab, panel id, and persisted surface aligned", () => {
    expect(getDocsRightPanelId("analysis")).toBe(
      "right-context-panel-analysis",
    );
    // research 계열 탭은 패널 하나를 공유하므로 id/surface도 하나여야 한다.
    for (const tab of [
      "character",
      "event",
      "faction",
      "world",
      "scrap",
      "plotboard",
      "untitled",
    ] as const) {
      expect(getDocsRightPanelId(tab)).toBe("right-context-panel-research");
      expect(buildDocsRightLayoutPersistEntries(tab)).toEqual([
        {
          id: "right-context-panel-research",
          index: 1,
          surface: "docs.panel.research",
        },
      ]);
    }
    expect(getActiveDocsRightTab(true, "analysis", "world")).toBe("analysis");
    expect(getActiveDocsRightTab(true, "plotboard", "world")).toBe("plotboard");
    expect(getActiveDocsRightTab(true, null, "world")).toBe("world");
    expect(getActiveDocsRightTab(false, "analysis", "world")).toBeNull();

    expect(buildDocsSidebarLayoutPersistEntries()).toEqual([
      { id: "left-sidebar", index: 0, surface: "docs.sidebar" },
    ]);
    expect(buildDocsRightLayoutPersistEntries("analysis")).toEqual([
      {
        id: "right-context-panel-analysis",
        index: 1,
        surface: "docs.panel.analysis",
      },
    ]);
  });

  it("derives right panel sizing from the active docs tab", () => {
    const layoutSurfaceRatios = {
      ...buildDefaultLayoutSurfaceRatios(),
      "docs.sidebar": 19,
      "docs.panel.snapshot": 31,
    };

    expect(getDocsLayoutSurfaceState(layoutSurfaceRatios, "snapshot")).toEqual({
      activePanelSurface: "docs.panel.snapshot",
      docsSidebarConfig: {
        role: "sidebar",
        defaultRatio: 17,
        minPx: 220,
        maxPx: 420,
      },
      docsSidebarRatio: 19,
      rightPanelConfig: {
        role: "panel",
        defaultRatio: 30,
        minPx: 380,
        maxPx: 860,
      },
      rightPanelRatio: 31,
    });
  });
});
