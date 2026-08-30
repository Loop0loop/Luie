import { describe, expect, it } from "vitest";
import {
  getEditorLayoutPanelSurface,
  getLayoutSurfaceConfig,
  isLayoutSurfaceId,
  normalizeLayoutSurfaceRatiosWithMigrations,
  type EditorLayoutPanelTab,
} from "../../../src/renderer/src/shared/constants/layoutSizing.js";

// editor 레이아웃(BinderBarCompactHover)의 research 계열 탭도 docs 레이아웃과 동일하게
// 물리적으로 하나의 패널을 공유하고 탭만 교체된다. 탭마다 surface가 갈라지면 탭을 바꿀 때
// 폭이 저장된 값으로 되돌아가 동기화가 깨진다.
const EDITOR_RESEARCH_TABS = [
  "character",
  "event",
  "faction",
  "world",
  "scrap",
] as const satisfies readonly EditorLayoutPanelTab[];

describe("editor layout shares one research panel width", () => {
  it("maps every research tab to one surface", () => {
    const surfaces = new Set(
      EDITOR_RESEARCH_TABS.map((tab) => getEditorLayoutPanelSurface(tab)),
    );

    expect(surfaces.size).toBe(1);
    expect([...surfaces][0]).toBe("editor.panel.research");
  });

  it("keeps analysis, snapshot, trash and canvas on their own surfaces", () => {
    expect(getEditorLayoutPanelSurface("analysis")).toBe(
      "editor.panel.analysis",
    );
    expect(getEditorLayoutPanelSurface("snapshot")).toBe(
      "editor.panel.snapshot",
    );
    expect(getEditorLayoutPanelSurface("trash")).toBe("editor.panel.trash");
    expect(getEditorLayoutPanelSurface("canvas")).toBe("editor.panel.canvas");
  });

  it("retires the per-tab research surface ids", () => {
    for (const tab of EDITOR_RESEARCH_TABS) {
      expect(isLayoutSurfaceId(`editor.panel.${tab}`)).toBe(false);
    }
  });

  it("carries legacy per-tab ratios over to the widest value", () => {
    const normalized = normalizeLayoutSurfaceRatiosWithMigrations({
      "editor.panel.character": 40,
      "editor.panel.world": 48,
      "editor.panel.scrap": 44,
    });

    expect(normalized["editor.panel.research"]).toBe(48);
  });

  it("prefers an explicit shared ratio over legacy per-tab ratios", () => {
    const normalized = normalizeLayoutSurfaceRatiosWithMigrations({
      "editor.panel.research": 33,
      "editor.panel.world": 48,
    });

    expect(normalized["editor.panel.research"]).toBe(33);
  });

  it("falls back to the surface default when nothing was stored", () => {
    const normalized = normalizeLayoutSurfaceRatiosWithMigrations({});

    expect(normalized["editor.panel.research"]).toBe(
      getLayoutSurfaceConfig("editor.panel.research").defaultRatio,
    );
  });
});
