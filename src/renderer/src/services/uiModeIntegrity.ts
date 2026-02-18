import type { EditorSettings, EditorUiMode } from "../../../shared/types/index.js";
import type { ContextTab, DocsRightTab, ResearchTab, WorldTab } from "../stores/uiStore";

type RightPanelType = "research" | "editor" | "snapshot" | "export";
type SplitSide = "left" | "right";

export type UiModeIntegrityUiState = {
  view: "template" | "editor" | "corkboard" | "outliner";
  contextTab: ContextTab;
  worldTab: WorldTab;
  isSplitView: boolean;
  splitRatio: number;
  splitSide: SplitSide;
  rightPanelContent: {
    type: RightPanelType;
    id?: string;
    tab?: ResearchTab;
    snapshot?: { id: string } | null;
  };
  isSidebarOpen: boolean;
  isContextOpen: boolean;
  isManuscriptMenuOpen: boolean;
  sidebarWidth: number;
  contextWidth: number;
  docsRightTab: DocsRightTab;
  isBinderBarOpen: boolean;
};

export type UiModeIntegritySnapshot = {
  uiMode: EditorUiMode;
  view: UiModeIntegrityUiState["view"];
  contextTab: ContextTab;
  worldTab: WorldTab;
  isSplitView: boolean;
  splitRatio: number;
  splitSide: SplitSide;
  rightPanelType: RightPanelType;
  rightPanelId: string | null;
  rightPanelTab: ResearchTab | null;
  rightPanelSnapshotId: string | null;
  isSidebarOpen: boolean;
  isContextOpen: boolean;
  isManuscriptMenuOpen: boolean;
  sidebarWidth: number;
  contextWidth: number;
  docsRightTab: DocsRightTab;
  isBinderBarOpen: boolean;
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
    rightPanelType: input.ui.rightPanelContent.type,
    rightPanelId: input.ui.rightPanelContent.id ?? null,
    rightPanelTab: input.ui.rightPanelContent.tab ?? null,
    rightPanelSnapshotId: input.ui.rightPanelContent.snapshot?.id ?? null,
    isSidebarOpen: input.ui.isSidebarOpen,
    isContextOpen: input.ui.isContextOpen,
    isManuscriptMenuOpen: input.ui.isManuscriptMenuOpen,
    sidebarWidth: input.ui.sidebarWidth,
    contextWidth: input.ui.contextWidth,
    docsRightTab: input.ui.docsRightTab,
    isBinderBarOpen: input.ui.isBinderBarOpen,
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
  "rightPanelType",
  "rightPanelId",
  "rightPanelTab",
  "rightPanelSnapshotId",
  "isSidebarOpen",
  "isContextOpen",
  "isManuscriptMenuOpen",
  "sidebarWidth",
  "contextWidth",
  "docsRightTab",
  "isBinderBarOpen",
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
