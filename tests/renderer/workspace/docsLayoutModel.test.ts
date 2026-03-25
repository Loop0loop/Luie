import { describe, expect, it } from "vitest";
import {
  buildDocsLayoutPersistEntries,
  getActiveDocsRightTab,
  getDocsLayoutSurfaceState,
  getDocsRightPanelId,
} from "../../../src/renderer/src/features/workspace/utils/docsLayoutModel.js";
import { buildDefaultLayoutSurfaceRatios } from "../../../src/shared/constants/layoutSizing.js";

describe("docsLayoutModel", () => {
  it("keeps docs right tab, panel id, and persisted surface aligned", () => {
    expect(getDocsRightPanelId("analysis")).toBe("right-context-panel-analysis");
    expect(getActiveDocsRightTab(true, "analysis", "world")).toBe("analysis");
    expect(getActiveDocsRightTab(true, null, "world")).toBe("world");
    expect(getActiveDocsRightTab(false, "analysis", "world")).toBeNull();

    expect(buildDocsLayoutPersistEntries("analysis")).toEqual([
      { id: "left-sidebar", surface: "docs.sidebar" },
      { id: "right-context-panel-analysis", surface: "docs.panel.analysis" },
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
        defaultRatio: 26,
        minPx: 320,
        maxPx: 760,
      },
      rightPanelRatio: 31,
    });
  });
});
