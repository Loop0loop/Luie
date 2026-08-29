import { describe, expect, it } from "vitest";
import {
  getDocsLayoutPanelSurface,
  getLayoutSurfaceConfig,
  isLayoutSurfaceId,
  normalizeLayoutSurfaceRatiosWithMigrations,
  type DocsLayoutPanelTab,
} from "../../../src/renderer/src/shared/constants/layoutSizing.js";
import { getDocsRightPanelId } from "../../../src/renderer/src/features/workspace/utils/docsLayoutModel.js";

// docs 레이아웃의 우측 패널은 물리적으로 하나이고 탭만 교체된다. research 계열 탭이 surface나
// Panel id를 따로 가지면 폭이 탭마다 기억되어 공용 폭이 무시된다.
const DOCS_RESEARCH_TABS = [
  "character",
  "event",
  "faction",
  "world",
  "scrap",
  "plotboard",
  "untitled",
] as const satisfies readonly DocsLayoutPanelTab[];

describe("docs layout shares one research panel width", () => {
  it("maps every research tab to one surface", () => {
    const surfaces = new Set(
      DOCS_RESEARCH_TABS.map((tab) => getDocsLayoutPanelSurface(tab)),
    );

    expect(surfaces.size).toBe(1);
    expect([...surfaces][0]).toBe("docs.panel.research");
  });

  it("maps every research tab to one panel id", () => {
    const ids = new Set(DOCS_RESEARCH_TABS.map((tab) => getDocsRightPanelId(tab)));

    expect(ids.size).toBe(1);
    expect([...ids][0]).toBe("right-context-panel-research");
  });

  it("keeps the sidebar and the AI view on their own single surfaces", () => {
    expect(isLayoutSurfaceId("docs.sidebar")).toBe(true);
    expect(getDocsLayoutPanelSurface("analysis")).toBe("docs.panel.analysis");
    expect(getDocsRightPanelId("analysis")).toBe("right-context-panel-analysis");

    // AI view는 research와 min/max가 달라 통합하지 않는다.
    expect(getLayoutSurfaceConfig("docs.panel.analysis").minPx).not.toBe(
      getLayoutSurfaceConfig("docs.panel.research").minPx,
    );
  });

  it("keeps snapshot, trash, editor and export separate", () => {
    for (const tab of ["snapshot", "trash", "editor", "export"] as const) {
      expect(getDocsLayoutPanelSurface(tab)).toBe(`docs.panel.${tab}`);
    }
  });

  it("retires the per-tab research surface ids", () => {
    for (const tab of DOCS_RESEARCH_TABS) {
      expect(isLayoutSurfaceId(`docs.panel.${tab}`)).toBe(false);
    }
  });

  it("carries legacy per-tab ratios over to the widest value", () => {
    const normalized = normalizeLayoutSurfaceRatiosWithMigrations({
      "docs.panel.character": 36,
      "docs.panel.world": 44,
      "docs.panel.plotboard": 40,
    });

    expect(normalized["docs.panel.research"]).toBe(44);
  });

  it("prefers an explicit shared ratio over legacy per-tab ratios", () => {
    const normalized = normalizeLayoutSurfaceRatiosWithMigrations({
      "docs.panel.research": 33,
      "docs.panel.world": 44,
    });

    expect(normalized["docs.panel.research"]).toBe(33);
  });

  it("falls back to the surface default when nothing was stored", () => {
    const normalized = normalizeLayoutSurfaceRatiosWithMigrations({});

    expect(normalized["docs.panel.research"]).toBe(
      getLayoutSurfaceConfig("docs.panel.research").defaultRatio,
    );
  });
});
