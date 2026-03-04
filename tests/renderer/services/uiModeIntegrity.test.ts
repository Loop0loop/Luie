import { describe, expect, it } from "vitest";
import {
  captureUiModeIntegritySnapshot,
  getUiModeIntegrityViolations,
} from "../../../src/renderer/src/features/workspace/services/uiModeIntegrity";
import type { EditorSettings } from "../../../src/shared/types";

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
      isSidebarOpen: true,
      isContextOpen: true,
      isManuscriptMenuOpen: false,
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
    };

    const violations = getUiModeIntegrityViolations(before, after);
    expect(violations).toContain("docsRightTab");
  });

  it("ignores state diffs when mode did not change", () => {
    const before = baseSnapshot();
    const after = {
      ...before,
      docsRightTab: "character" as const,
    };

    const violations = getUiModeIntegrityViolations(before, after);
    expect(violations).toEqual([]);
  });
});
