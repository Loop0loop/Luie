import { describe, expect, it } from "vitest";
import {
  captureUiModeIntegritySnapshot,
  getUiModeIntegrityViolations,
} from "../../../src/renderer/src/services/uiModeIntegrity.js";
import type { EditorSettings } from "../../../src/shared/types/index.js";

const baseEditorSettings: EditorSettings = {
  fontFamily: "sans",
  fontPreset: "inter",
  fontSize: 16,
  lineHeight: 1.8,
  maxWidth: 920,
  theme: "sepia",
  themeTemp: "warm",
  themeContrast: "high",
  themeAccent: "amber",
  themeTexture: true,
  uiMode: "default",
};

const baseSnapshot = () =>
  captureUiModeIntegritySnapshot({
    editor: baseEditorSettings,
    ui: {
      view: "editor",
      contextTab: "synopsis",
      worldTab: "terms",
      isSplitView: true,
      splitRatio: 0.55,
      splitSide: "right",
      rightPanelContent: {
        type: "research",
        id: "chapter-2",
        tab: "world",
      },
      isSidebarOpen: true,
      isContextOpen: true,
      isManuscriptMenuOpen: false,
      sidebarWidth: 280,
      contextWidth: 360,
      docsRightTab: "world",
      isBinderBarOpen: true,
    },
    activeProjectId: "project-1",
    activeChapterId: "chapter-2",
  });

describe("uiMode integrity snapshot", () => {
  it("accepts mode-only changes", () => {
    const before = baseSnapshot();
    const after = {
      ...before,
      uiMode: "docs" as const,
    };

    const violations = getUiModeIntegrityViolations(before, after);
    expect(violations).toEqual([]);
  });

  it("reports non-layout mutations during mode switch", () => {
    const before = baseSnapshot();
    const after = {
      ...before,
      uiMode: "editor" as const,
      docsRightTab: "character" as const,
      contextWidth: 420,
    };

    const violations = getUiModeIntegrityViolations(before, after);
    expect(violations).toContain("docsRightTab");
    expect(violations).toContain("contextWidth");
  });

  it("ignores state diffs when mode did not change", () => {
    const before = baseSnapshot();
    const after = {
      ...before,
      contextWidth: 420,
    };

    const violations = getUiModeIntegrityViolations(before, after);
    expect(violations).toEqual([]);
  });
});
