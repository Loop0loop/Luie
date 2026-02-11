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
