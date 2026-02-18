import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  DEFAULT_UI_CONTEXT_TAB,
  DEFAULT_UI_RESEARCH_TAB,
  DEFAULT_UI_RIGHT_PANEL_TYPE,
  DEFAULT_UI_SPLIT_RATIO,
  DEFAULT_UI_SPLIT_VIEW_ENABLED,
  DEFAULT_UI_VIEW,
  DEFAULT_UI_SIDEBAR_OPEN,
  DEFAULT_UI_CONTEXT_OPEN,
  STORAGE_KEY_UI,
} from "../../../shared/constants";
import type { Snapshot } from "../../../shared/types";

export type ContextTab = "synopsis" | "characters" | "terms";
export type ResearchTab = "character" | "world" | "scrap" | "analysis";
export type WorldTab = "synopsis" | "terms" | "mindmap" | "drawing" | "plot";
export type DocsRightTab =
  | "character"
  | "world"
  | "scrap"
  | "analysis"
  | "snapshot"
  | "trash"
  | "editor"
  | "export"
  | null;

interface RightPanelContent {
  type: "research" | "editor" | "snapshot" | "export";
  id?: string;
  tab?: ResearchTab;
  snapshot?: Snapshot;
}

interface UIStore {
  view: "template" | "editor" | "corkboard" | "outliner";
  contextTab: ContextTab;
  worldTab: WorldTab;
  isSplitView: boolean;
  splitRatio: number;
  splitSide: "left" | "right";
  rightPanelContent: RightPanelContent;
  isSidebarOpen: boolean;
  isContextOpen: boolean;
  isManuscriptMenuOpen: boolean;
  sidebarWidth: number;
  contextWidth: number;
  docsRightTab: DocsRightTab;
  isBinderBarOpen: boolean;

  setView: (view: UIStore["view"]) => void;
  setContextTab: (tab: ContextTab) => void;
  setWorldTab: (tab: WorldTab) => void;
  setSplitView: (isSplit: boolean) => void;
  setSplitRatio: (ratio: number) => void;
  setSplitSide: (side: UIStore["splitSide"]) => void;
  toggleSplitSide: () => void;
  setRightPanelContent: (content: RightPanelContent) => void;
  setSidebarOpen: (isOpen: boolean) => void;
  setContextOpen: (isOpen: boolean) => void;
  setManuscriptMenuOpen: (isOpen: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setContextWidth: (width: number) => void;
  setDocsRightTab: (tab: DocsRightTab) => void;
  setBinderBarOpen: (isOpen: boolean) => void;

  // Scrivener Mode Main View State
  mainView: { type: "editor" | "character" | "world" | "memo" | "trash" | "analysis"; id?: string };
  setMainView: (view: { type: "editor" | "character" | "world" | "memo" | "trash" | "analysis"; id?: string }) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      view: DEFAULT_UI_VIEW as UIStore["view"],
      contextTab: DEFAULT_UI_CONTEXT_TAB as ContextTab,
      worldTab: "terms",
      isSplitView: DEFAULT_UI_SPLIT_VIEW_ENABLED,
      splitRatio: DEFAULT_UI_SPLIT_RATIO,
      splitSide: "right",
      rightPanelContent: {
        type: DEFAULT_UI_RIGHT_PANEL_TYPE as RightPanelContent["type"],
        tab: DEFAULT_UI_RESEARCH_TAB as ResearchTab,
      },
      isSidebarOpen: DEFAULT_UI_SIDEBAR_OPEN,
      isContextOpen: DEFAULT_UI_CONTEXT_OPEN,
      isManuscriptMenuOpen: false,
      sidebarWidth: 260,
      contextWidth: 320,
      docsRightTab: null,
      isBinderBarOpen: true,
      
      mainView: { type: "editor" },

      setView: (view) => set({ view }),
      setContextTab: (contextTab) => set({ contextTab }),
      setWorldTab: (worldTab) => set({ worldTab }),
      setSplitView: (isSplitView) => set({ isSplitView }),
      setSplitRatio: (splitRatio) => set({ splitRatio }),
      setSplitSide: (splitSide) => set({ splitSide }),
      toggleSplitSide: () =>
        set((state) => ({ splitSide: state.splitSide === "right" ? "left" : "right" })),
      setRightPanelContent: (rightPanelContent) => set({ rightPanelContent }),
      setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
      setContextOpen: (isContextOpen) => set({ isContextOpen }),
      setManuscriptMenuOpen: (isManuscriptMenuOpen) => set({ isManuscriptMenuOpen }),
      setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
      setContextWidth: (contextWidth) => set({ contextWidth }),
      setDocsRightTab: (docsRightTab) => set({ docsRightTab }),
      setBinderBarOpen: (isBinderBarOpen) => set({ isBinderBarOpen }),
      setMainView: (mainView) => set({ mainView }),
    }),
    {
      name: STORAGE_KEY_UI,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        view: state.view,
        contextTab: state.contextTab,
        worldTab: state.worldTab,
        splitRatio: state.splitRatio,
        isSplitView: state.isSplitView,
        splitSide: state.splitSide,
        isSidebarOpen: state.isSidebarOpen,
        isContextOpen: state.isContextOpen,
        isManuscriptMenuOpen: state.isManuscriptMenuOpen,
        sidebarWidth: state.sidebarWidth,
        contextWidth: state.contextWidth,
        isBinderBarOpen: state.isBinderBarOpen,
        rightPanelContent:
          state.rightPanelContent.type === "snapshot"
            ? {
                type: DEFAULT_UI_RIGHT_PANEL_TYPE as RightPanelContent["type"],
                tab: DEFAULT_UI_RESEARCH_TAB as ResearchTab,
              }
            : state.rightPanelContent,
      }),
    },
  ),
);
