import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { GraphDepth } from "../../types/graph";

interface GraphState {
  depth: GraphDepth;
  focusId: string | null;
  hoverId: string | null;

  activeMode: "character" | "event";
  selectedChapterFilter: "all" | "early";
  selectedFocusNode: string;

  setDepth: (depth: GraphDepth) => void;
  setFocusId: (id: string | null) => void;
  setHoverId: (id: string | null) => void;

  setActiveMode: (mode: "character" | "event") => void;
  setSelectedChapterFilter: (filter: "all" | "early") => void;
  setSelectedFocusNode: (nodeId: string) => void;
}

export const useGraphStore = create<GraphState>()(
  persist(
    (set) => ({
      depth: 1,
      focusId: null,
      hoverId: null,

      activeMode: "character",
      selectedChapterFilter: "all",
      selectedFocusNode: "all",

      setDepth: (depth) => set({ depth }),
      setFocusId: (focusId) => set({ focusId }),
      setHoverId: (hoverId) => set({ hoverId }),

      setActiveMode: (activeMode) => set({ activeMode }),
      setSelectedChapterFilter: (selectedChapterFilter) => set({ selectedChapterFilter }),
      setSelectedFocusNode: (selectedFocusNode) => set({ selectedFocusNode }),
    }),
    {
      name: "graph_store_v1",
      storage: createJSONStorage(() => localStorage),
      // NOTE: hoverId와 focusId는 transient state라 저장하지 않는다.
      partialize: (state) => ({
        depth: state.depth,
        activeMode: state.activeMode,
        selectedChapterFilter: state.selectedChapterFilter,
        selectedFocusNode: state.selectedFocusNode,
      }),
    }
  )
);
