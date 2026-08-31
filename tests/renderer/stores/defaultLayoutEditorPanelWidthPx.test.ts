import { beforeEach, describe, expect, it } from "vitest";
import {
  createDefaultProjectLayoutState,
  mergeProjectLayoutState,
  sanitizeProjectLayoutState,
} from "../../../src/renderer/src/features/workspace/stores/projectLayout/index.js";
import { projectLayoutPersistedStateSchema } from "../../../src/shared/schemas/index.js";

/**
 * SUT: 분할 editor 패널 폭(px)의 저장/복원 계약.
 *
 * 테스트 베이시스: 사용자 보고 — DnD로 연 sub editor가 재오픈 시 min 폭으로 뜬다.
 * 원인은 research 패널이 가진 "px 저장 + handle 복원"이 editor 패널에는 없었던 것이다.
 * research와 동일 계약을 editor에도 세운다.
 *
 * 등가분할 기준은 저장 폭이다: 정상 범위 / min 미만 / max 초과 / 미저장.
 *
 * PROVES: merge가 px를 보존하고 범위로 클램프한다, sanitize가 복원 시 값을 유지한다,
 *         미저장 payload에서 undefined로 남는다, strictObject 스키마가 필드를 허용한다.
 * DOES_NOT_PROVE: PanelGroup handle.resize의 실제 복원(§DOM/수동 검증 영역).
 */

const storedWith = (byLayoutDefault: Record<string, unknown>) => ({
  main: { sidebarOpen: true, contextOpen: true },
  docs: { sidebarOpen: true, binderBarOpen: true, rightTab: null },
  scrivener: {
    sidebarOpen: true,
    inspectorOpen: true,
    sections: {
      manuscript: true,
      characters: true,
      events: false,
      factions: false,
      world: false,
      scrap: false,
      snapshots: false,
      analysis: false,
      trash: false,
    },
  },
  editor: { activeChapterId: null, scrollYByChapter: {} },
  workspace: {
    panels: [],
    researchPanelSizes: {},
    byLayout: { default: byLayoutDefault },
  },
  sidebarWidths: {},
  layoutSurfaceRatios: {},
});

describe("default layout editor panel width in pixels", () => {
  let base: ReturnType<typeof createDefaultProjectLayoutState>;

  beforeEach(() => {
    base = createDefaultProjectLayoutState();
  });

  it("stores the width in pixels", () => {
    const next = mergeProjectLayoutState(base, {
      workspace: { byLayout: { default: { editorPanelWidthPx: 640 } } },
    });

    expect(next.workspace.byLayout.default.editorPanelWidthPx).toBe(640);
  });

  it("never stores a width below the editor panel's pixel minimum", () => {
    const next = mergeProjectLayoutState(base, {
      workspace: { byLayout: { default: { editorPanelWidthPx: 100 } } },
    });

    // EDITOR_PANEL_MIN_WIDTH_PX = 320.
    expect(next.workspace.byLayout.default.editorPanelWidthPx).toBe(320);
  });

  it("caps an absurd stored width", () => {
    const next = mergeProjectLayoutState(base, {
      workspace: { byLayout: { default: { editorPanelWidthPx: 99999 } } },
    });

    expect(next.workspace.byLayout.default.editorPanelWidthPx).toBe(2000);
  });

  it("restores the pixel width unchanged", () => {
    const restored = sanitizeProjectLayoutState(
      storedWith({ panels: [], researchPanelSizes: {}, editorPanelWidthPx: 640 }),
    );

    expect(restored.workspace.byLayout.default.editorPanelWidthPx).toBe(640);
  });

  it("leaves the pixel width unset for payloads that never stored it", () => {
    const restored = sanitizeProjectLayoutState(
      storedWith({ panels: [], researchPanelSizes: {} }),
    );

    expect(
      restored.workspace.byLayout.default.editorPanelWidthPx,
    ).toBeUndefined();
  });

  it("keeps research and editor widths independent", () => {
    const next = mergeProjectLayoutState(base, {
      workspace: {
        byLayout: {
          default: { researchPanelWidthPx: 570, editorPanelWidthPx: 640 },
        },
      },
    });

    expect(next.workspace.byLayout.default.researchPanelWidthPx).toBe(570);
    expect(next.workspace.byLayout.default.editorPanelWidthPx).toBe(640);
  });

  it("accepts the pixel width in the persisted schema", () => {
    // strictObject라서 스키마에 필드가 없으면 payload 전체가 폐기된다.
    const result = projectLayoutPersistedStateSchema.safeParse({
      byProject: {
        "project-1": storedWith({
          panels: [],
          researchPanelSizes: {},
          editorPanelWidthPx: 640,
        }),
      },
    });

    expect(result.success).toBe(true);
  });
});
