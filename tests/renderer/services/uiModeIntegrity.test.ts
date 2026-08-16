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
  letterSpacing: 0,
  wordSpacing: 0,
  paragraphSpacing: 1,
  maxWidth: 920,
  spellcheckEnabled: true,
  theme: "sepia",
  themeTemp: "warm",
  themeContrast: "high",
  themeAccent: "amber",
  uiMode: "default",
  enableAnimations: true,
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
      leftSidebarOpen: true,
      rightPanelOpen: true,
      isManuscriptMenuOpen: false,
      rightPanelActiveTab: "world",
      rightRailOpen: false,
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
      rightPanelActiveTab: "character" as const,
    };

    const violations = getUiModeIntegrityViolations(before, after);
    expect(violations).toContain("rightPanelActiveTab");
  });

  it("ignores state diffs when mode did not change", () => {
    const before = baseSnapshot();
    const after = {
      ...before,
      rightPanelActiveTab: "character" as const,
    };

    const violations = getUiModeIntegrityViolations(before, after);
    expect(violations).toEqual([]);
  });
});
