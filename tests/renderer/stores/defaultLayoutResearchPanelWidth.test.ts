import { beforeEach, describe, expect, it } from "vitest";
import {
  createDefaultProjectLayoutState,
  mergeProjectLayoutState,
  sanitizeProjectLayoutState,
} from "../../../src/renderer/src/features/workspace/stores/projectLayout/index.js";
import { projectLayoutPersistedStateSchema } from "../../../src/shared/schemas/index.js";

const buildStoredDefaultWorkspace = (
  byLayoutDefault: Record<string, unknown>,
) => ({
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

describe("default layout shared research panel width", () => {
  let base: ReturnType<typeof createDefaultProjectLayoutState>;

  beforeEach(() => {
    base = createDefaultProjectLayoutState();
  });

  it("stores one width for the default layout research panel", () => {
    const next = mergeProjectLayoutState(base, {
      workspace: { byLayout: { default: { researchPanelSize: 42 } } },
    });

    expect(next.workspace.byLayout.default.researchPanelSize).toBe(42);
  });

  it("keeps the shared width when a different research tab is stored", () => {
    const afterCharacter = mergeProjectLayoutState(base, {
      workspace: {
        byLayout: {
          default: {
            panels: [
              {
                id: "research-1",
                content: { type: "research", tab: "character" },
                size: 42,
              },
            ],
            researchPanelSize: 42,
          },
        },
      },
    });

    // 탭만 바꾼 patch. 폭은 건드리지 않으므로 그대로 유지되어야 한다.
    const afterPlotboard = mergeProjectLayoutState(afterCharacter, {
      workspace: {
        byLayout: {
          default: {
            panels: [
              {
                id: "research-1",
                content: { type: "research", tab: "plotboard" },
                size: 42,
              },
            ],
          },
        },
      },
    });

    expect(afterPlotboard.workspace.byLayout.default.researchPanelSize).toBe(42);
    expect(
      afterPlotboard.workspace.byLayout.default.panels[0]?.content.tab,
    ).toBe("plotboard");
  });

  it("clamps the shared width to the workspace panel bounds", () => {
    const tooWide = mergeProjectLayoutState(base, {
      workspace: { byLayout: { default: { researchPanelSize: 500 } } },
    });
    const tooNarrow = mergeProjectLayoutState(base, {
      workspace: { byLayout: { default: { researchPanelSize: 1 } } },
    });

    expect(tooWide.workspace.byLayout.default.researchPanelSize).toBe(90);
    expect(tooNarrow.workspace.byLayout.default.researchPanelSize).toBe(15);
  });

  it("migrates legacy per-tab widths to the widest stored value", () => {
    const restored = sanitizeProjectLayoutState(
      buildStoredDefaultWorkspace({
        panels: [],
        researchPanelSizes: {
          character: 30,
          plotboard: 55,
          untitled: 41,
        },
      }),
    );

    expect(restored.workspace.byLayout.default.researchPanelSize).toBe(55);
  });

  it("prefers an explicit shared width over legacy per-tab widths", () => {
    const restored = sanitizeProjectLayoutState(
      buildStoredDefaultWorkspace({
        panels: [],
        researchPanelSizes: { character: 30, plotboard: 55 },
        researchPanelSize: 38,
      }),
    );

    expect(restored.workspace.byLayout.default.researchPanelSize).toBe(38);
  });

  it("leaves the shared width unset when nothing was ever stored", () => {
    const restored = sanitizeProjectLayoutState(
      buildStoredDefaultWorkspace({ panels: [], researchPanelSizes: {} }),
    );

    expect(restored.workspace.byLayout.default.researchPanelSize).toBeUndefined();
  });

  it("accepts the shared width in the persisted schema", () => {
    // strictObject라서 스키마에 필드가 없으면 payload 전체가 폐기된다.
    const result = projectLayoutPersistedStateSchema.safeParse({
      byProject: {
        "project-1": buildStoredDefaultWorkspace({
          panels: [],
          researchPanelSizes: {},
          researchPanelSize: 42,
        }),
      },
    });

    expect(result.success).toBe(true);
  });
});
