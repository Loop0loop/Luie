import type { EditorSettings, EditorUiMode } from '@shared/types';
import type { ContextTab, DocsRightTab, WorldTab } from "../stores/uiStore";
type SplitSide = "left" | "right" | "bottom";

export type UiModeIntegrityUiState = {
  view: "template" | "editor" | "corkboard" | "outliner";
  contextTab: ContextTab;
  worldTab: WorldTab;
  isSplitView: boolean;
  splitRatio: number;
  splitSide: SplitSide;
  leftSidebarOpen: boolean;
  rightPanelOpen: boolean;
  isManuscriptMenuOpen: boolean;
  rightPanelActiveTab: DocsRightTab;
  rightRailOpen: boolean;
};

export type UiModeIntegritySnapshot = {
  uiMode: EditorUiMode;
  view: UiModeIntegrityUiState["view"];
  contextTab: ContextTab;
  worldTab: WorldTab;
  isSplitView: boolean;
  splitRatio: number;
  splitSide: SplitSide;
  leftSidebarOpen: boolean;
  rightPanelOpen: boolean;
  isManuscriptMenuOpen: boolean;
  rightPanelActiveTab: DocsRightTab;
  rightRailOpen: boolean;
  activeProjectId: string | null;
  activeChapterId: string | null;
  fontFamily: EditorSettings["fontFamily"];
  fontPreset: EditorSettings["fontPreset"];
  fontSize: number;
  lineHeight: number;
  maxWidth: number;
  theme: EditorSettings["theme"];
  themeTemp: EditorSettings["themeTemp"];
  themeContrast: EditorSettings["themeContrast"];
  themeAccent: EditorSettings["themeAccent"];
  themeTexture: EditorSettings["themeTexture"];
};

export function captureUiModeIntegritySnapshot(input: {
  editor: EditorSettings;
  ui: UiModeIntegrityUiState;
  activeProjectId?: string | null;
  activeChapterId?: string | null;
}): UiModeIntegritySnapshot {
  return {
    uiMode: input.editor.uiMode,
    view: input.ui.view,
    contextTab: input.ui.contextTab,
    worldTab: input.ui.worldTab,
    isSplitView: input.ui.isSplitView,
    splitRatio: input.ui.splitRatio,
    splitSide: input.ui.splitSide,
    leftSidebarOpen: input.ui.leftSidebarOpen,
    rightPanelOpen: input.ui.rightPanelOpen,
    isManuscriptMenuOpen: input.ui.isManuscriptMenuOpen,
    rightPanelActiveTab: input.ui.rightPanelActiveTab,
    rightRailOpen: input.ui.rightRailOpen,
    activeProjectId: input.activeProjectId ?? null,
    activeChapterId: input.activeChapterId ?? null,
    fontFamily: input.editor.fontFamily,
    fontPreset: input.editor.fontPreset,
    fontSize: input.editor.fontSize,
    lineHeight: input.editor.lineHeight,
    maxWidth: input.editor.maxWidth,
    theme: input.editor.theme,
    themeTemp: input.editor.themeTemp,
    themeContrast: input.editor.themeContrast,
    themeAccent: input.editor.themeAccent,
    themeTexture: input.editor.themeTexture,
  };
}

const NON_LAYOUT_KEYS: Array<keyof Omit<UiModeIntegritySnapshot, "uiMode">> = [
  "view",
  "contextTab",
  "worldTab",
  "isSplitView",
  "splitRatio",
  "splitSide",
  "splitSide",
  "leftSidebarOpen",
  "rightPanelOpen",
  "isManuscriptMenuOpen",
  "rightPanelActiveTab",
  "rightRailOpen",
  "activeProjectId",
  "activeChapterId",
  "fontFamily",
  "fontPreset",
  "fontSize",
  "lineHeight",
  "maxWidth",
  "theme",
  "themeTemp",
  "themeContrast",
  "themeAccent",
  "themeTexture",
];

export function getUiModeIntegrityViolations(
  before: UiModeIntegritySnapshot,
  after: UiModeIntegritySnapshot,
): string[] {
  if (before.uiMode === after.uiMode) {
    return [];
  }

  const violations: string[] = [];
  for (const key of NON_LAYOUT_KEYS) {
    if (!Object.is(before[key], after[key])) {
      violations.push(key);
    }
  }
  return violations;
}
