import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  DEFAULT_UI_CONTEXT_TAB,
  DEFAULT_UI_RESEARCH_TAB,
  DEFAULT_UI_RIGHT_PANEL_TYPE,
  DEFAULT_UI_SPLIT_RATIO,
  DEFAULT_UI_SPLIT_VIEW_ENABLED,
  DEFAULT_UI_VIEW,
  STORAGE_KEY_UI,
} from "../../../shared/constants";
import type { Snapshot } from "../../../shared/types";

export type ContextTab = "synopsis" | "characters" | "terms";
export type ResearchTab = "character" | "world" | "scrap" | "analysis";

interface RightPanelContent {
  type: "research" | "editor" | "snapshot" | "export";
  id?: string;
  tab?: ResearchTab;
  snapshot?: Snapshot;
}

interface UIStore {
  view: "template" | "editor" | "corkboard" | "outliner";
  contextTab: ContextTab;
  isSplitView: boolean;
  splitRatio: number;
  rightPanelContent: RightPanelContent;

  setView: (view: UIStore["view"]) => void;
  setContextTab: (tab: ContextTab) => void;
  setSplitView: (isSplit: boolean) => void;
  setSplitRatio: (ratio: number) => void;
  setRightPanelContent: (content: RightPanelContent) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      view: DEFAULT_UI_VIEW as UIStore["view"],
      contextTab: DEFAULT_UI_CONTEXT_TAB as ContextTab,
      isSplitView: DEFAULT_UI_SPLIT_VIEW_ENABLED,
      splitRatio: DEFAULT_UI_SPLIT_RATIO,
      rightPanelContent: {
        type: DEFAULT_UI_RIGHT_PANEL_TYPE as RightPanelContent["type"],
        tab: DEFAULT_UI_RESEARCH_TAB as ResearchTab,
      },

      setView: (view) => set({ view }),
      setContextTab: (contextTab) => set({ contextTab }),
      setSplitView: (isSplitView) => set({ isSplitView }),
      setSplitRatio: (splitRatio) => set({ splitRatio }),
      setRightPanelContent: (rightPanelContent) => set({ rightPanelContent }),
    }),
    {
      name: STORAGE_KEY_UI,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        view: state.view,
        contextTab: state.contextTab,
        splitRatio: state.splitRatio,
        isSplitView: state.isSplitView,
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
