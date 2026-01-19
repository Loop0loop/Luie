import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ContextTab = "synopsis" | "characters" | "terms";
export type ResearchTab = "character" | "world" | "scrap";

interface RightPanelContent {
  type: "research" | "editor";
  id?: string;
  tab?: ResearchTab;
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
      view: "template",
      contextTab: "synopsis",
      isSplitView: false,
      splitRatio: 0.62,
      rightPanelContent: { type: "research", tab: "character" },

      setView: (view) => set({ view }),
      setContextTab: (contextTab) => set({ contextTab }),
      setSplitView: (isSplitView) => set({ isSplitView }),
      setSplitRatio: (splitRatio) => set({ splitRatio }),
      setRightPanelContent: (rightPanelContent) => set({ rightPanelContent }),
    }),
    {
      name: "luie-ui",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        view: state.view,
        contextTab: state.contextTab,
        splitRatio: state.splitRatio,
        isSplitView: state.isSplitView,
        rightPanelContent: state.rightPanelContent,
      }),
    },
  ),
);
