import { beforeEach, describe, expect, it } from "vitest";
import {
  createDefaultProjectLayoutState,
  mergeProjectLayoutState,
  sanitizeProjectLayoutState,
} from "../../../src/renderer/src/features/workspace/stores/projectLayout/index.js";
import { projectLayoutPersistedStateSchema } from "../../../src/shared/schemas/index.js";

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

describe("default layout research panel width in pixels", () => {
  let base: ReturnType<typeof createDefaultProjectLayoutState>;

  beforeEach(() => {
    base = createDefaultProjectLayoutState();
  });

  it("stores the width in pixels", () => {
    const next = mergeProjectLayoutState(base, {
      workspace: { byLayout: { default: { researchPanelWidthPx: 570 } } },
    });

    expect(next.workspace.byLayout.default.researchPanelWidthPx).toBe(570);
  });

  it("never stores a width below the panel's pixel minimum", () => {
    // %로 저장할 때는 min으로 클램프된 값이 그대로 저장되어 min에 고착됐다.
    const next = mergeProjectLayoutState(base, {
      workspace: { byLayout: { default: { researchPanelWidthPx: 120 } } },
    });

    expect(next.workspace.byLayout.default.researchPanelWidthPx).toBe(470);
  });

  it("caps an absurd stored width", () => {
    const next = mergeProjectLayoutState(base, {
      workspace: { byLayout: { default: { researchPanelWidthPx: 99999 } } },
    });

    expect(next.workspace.byLayout.default.researchPanelWidthPx).toBe(2000);
  });

  it("restores the pixel width unchanged", () => {
    const restored = sanitizeProjectLayoutState(
      storedWith({ panels: [], researchPanelSizes: {}, researchPanelWidthPx: 570 }),
    );

    expect(restored.workspace.byLayout.default.researchPanelWidthPx).toBe(570);
  });

  it("leaves the pixel width unset for payloads that never stored it", () => {
    const restored = sanitizeProjectLayoutState(
      storedWith({ panels: [], researchPanelSizes: { character: 37.229 } }),
    );

    expect(
      restored.workspace.byLayout.default.researchPanelWidthPx,
    ).toBeUndefined();
    // 그때는 기존 % 값으로 계속 서빙한다.
    expect(restored.workspace.byLayout.default.researchPanelSize).toBe(37.229);
  });

  it("accepts the pixel width in the persisted schema", () => {
    // strictObject라서 스키마에 필드가 없으면 payload 전체가 폐기된다.
    const result = projectLayoutPersistedStateSchema.safeParse({
      byProject: {
        "project-1": storedWith({
          panels: [],
          researchPanelSizes: {},
          researchPanelWidthPx: 570,
        }),
      },
    });

    expect(result.success).toBe(true);
  });
});
