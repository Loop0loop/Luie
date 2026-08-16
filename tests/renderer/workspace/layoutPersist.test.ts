import { describe, expect, it, vi } from "vitest";

vi.mock("@renderer/features/workspace/stores/uiStore", () => ({
  useUIStore: vi.fn(),
}));

vi.mock("@renderer/features/workspace/stores/projectLayoutStore", () => ({
  useProjectLayoutStore: vi.fn(),
}));

vi.mock("@shared/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    warn: vi.fn(),
  }),
}));

vi.mock("@renderer/shared/constants/layoutSizing", () => ({
  normalizeLayoutSurfaceRatioInput: (_surface: string, value: unknown) =>
    typeof value === "number" ? value : null,
  normalizeLayoutSurfaceRatiosWithMigrations: (value: unknown) => value,
}));

vi.mock("@renderer/shared/constants/sidebarSizing", () => ({
  normalizeSidebarWidthsWithMigrations: (value: unknown) => value,
}));

import {
  getPanelLayoutValue,
  getPanelRatioFromLayout,
  isPersistableLayoutRatio,
} from "../../../src/renderer/src/features/workspace/hooks/useLayoutPersist.js";
import {
  appendProjectLayoutSizingPatch,
  getProjectLayoutPersistenceMode,
} from "../../../src/renderer/src/features/workspace/hooks/useProjectLayoutPersistence.js";

describe("useLayoutPersist layout parsing", () => {
  it("reads numeric ratios from keyed layouts", () => {
    expect(
      getPanelRatioFromLayout(
        {
          "left-sidebar": 18,
        },
        { id: "left-sidebar", surface: "docs.sidebar" },
        0,
      ),
    ).toBe(18);
  });

  it("reads ratios from object-shaped keyed layouts", () => {
    expect(
      getPanelRatioFromLayout(
        {
          "right-context-panel-character": {
            asPercentage: 36,
            inPixels: 512,
          },
        },
        {
          id: "right-context-panel-character",
          surface: "docs.panel.character",
        },
        0,
      ),
    ).toBe(36);
  });

  it("reads ratios from object-shaped array layouts", () => {
    expect(
      getPanelRatioFromLayout(
        [{ size: 17 }, { size: 83 }],
        { id: "left-sidebar", surface: "docs.sidebar" },
        0,
      ),
    ).toBe(17);
  });

  it("uses explicit panel index for sparse persisted entries", () => {
    expect(
      getPanelRatioFromLayout(
        [{ size: 18 }, { size: 56 }, { size: 26 }],
        { id: "context-panel", index: 2, surface: "default.panel" },
        1,
      ),
    ).toBe(26);
  });

  it("reads workspace panel ratios by stable panel id", () => {
    expect(
      getPanelLayoutValue(
        {
          "main-primary-content": { size: 36 },
          "research-character": { size: 64 },
        },
        "research-character",
        1,
      ),
    ).toBe(64);
  });

  it("does not persist collapsed zero-sized panel ratios", () => {
    expect(isPersistableLayoutRatio(0)).toBe(false);
    expect(isPersistableLayoutRatio(0.1)).toBe(false);
    expect(isPersistableLayoutRatio(0.2)).toBe(true);
  });

  it("uses an isolated persistence mode while canvas is the main view", () => {
    expect(getProjectLayoutPersistenceMode("default", "editor")).toBe("default");
    expect(getProjectLayoutPersistenceMode("default", "canvas")).toBe("canvas");
    expect(getProjectLayoutPersistenceMode("docs", "canvas")).toBe("canvas");
  });

  it("keeps toggle-only project layout patches from rewriting sizing state", () => {
    const chromePatch = {
      main: {
        sidebarOpen: false,
        contextOpen: true,
      },
    };
    const sizingPatch = {
      sidebarWidths: { mainSidebar: 320 },
      layoutSurfaceRatios: { "default.sidebar": 0 },
      workspace: { panels: [], researchPanelSizes: {} },
    };

    expect(appendProjectLayoutSizingPatch(chromePatch, sizingPatch, false)).toEqual(
      chromePatch,
    );
    expect(appendProjectLayoutSizingPatch(chromePatch, sizingPatch, true)).toEqual({
      ...chromePatch,
      ...sizingPatch,
    });
  });
});
