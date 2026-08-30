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

  // NOTE: editor research 패널이 좁은 전용 밴드(과거 370~560px)를 쓰면 조절 가능한 폭이
  // 190px뿐이어서 "resize가 거의 안 움직인다"는 체감 차이가 생긴다. docs와 같은 정책을 쓴다.
  it("shares the docs research width policy", () => {
    const editorConfig = getLayoutSurfaceConfig("editor.panel.research");
    const docsConfig = getLayoutSurfaceConfig("docs.panel.research");

    expect(editorConfig.minPx).toBe(docsConfig.minPx);
    expect(editorConfig.maxPx).toBe(docsConfig.maxPx);
  });

  // NOTE: EntityGallery 그리드가 `minmax(175px, 190px)` + `gap-3`이라 2열 콘텐츠 폭이
  // 175*2+12=362px, 컨테이너 패딩 `md:px-6`(48px), 스크롤바 약 10px → 420px가 하한이다.
  // 이 아래로 내려가면 1열로 떨어지고 auto-fill 상한(190px) 때문에 카드가 늘어나지 못해
  // 오른쪽에 빈 공간이 남는다.
  it("keeps the gallery two-column floor", () => {
    const GALLERY_TWO_COLUMN_FLOOR_PX = 175 * 2 + 12 + 48 + 10;

    expect(getLayoutSurfaceConfig("editor.panel.research").minPx).toBeGreaterThanOrEqual(
      GALLERY_TWO_COLUMN_FLOOR_PX,
    );
    expect(getLayoutSurfaceConfig("docs.panel.research").minPx).toBeGreaterThanOrEqual(
      GALLERY_TWO_COLUMN_FLOOR_PX,
    );
  });

  // NOTE: 분할 에디터 패널은 gallery가 없으므로 research 플로어를 물려받지 않는다.
  it("does not push the split editor panel to the gallery floor", () => {
    expect(getLayoutSurfaceConfig("docs.panel.editor").minPx).toBe(320);
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
