import { create } from "zustand";
import type { GraphDepth } from "../../types/graph";

interface GraphState {
  depth: GraphDepth;
  focusId: string | null;

  // Luie 관계 시나리오 필터 상태
  activeMode: "character" | "event";
  selectedChapterFilter: "all" | "early";
  selectedFocusNode: string;

  setDepth: (depth: GraphDepth) => void;
  setFocusId: (id: string | null) => void;

  // 시나리오 상태 변경 액션
  setActiveMode: (mode: "character" | "event") => void;
  setSelectedChapterFilter: (filter: "all" | "early") => void;
  setSelectedFocusNode: (nodeId: string) => void;
}

export const useGraphStore = create<GraphState>()((set) => ({
  depth: 1,
  focusId: null,

  // 초기값
  activeMode: "character",
  selectedChapterFilter: "all",
  selectedFocusNode: "all",

  setDepth: (depth) => set({ depth }),
  setFocusId: (focusId) => set({ focusId }),

  setActiveMode: (activeMode) => set({ activeMode }),
  setSelectedChapterFilter: (selectedChapterFilter) => set({ selectedChapterFilter }),
  setSelectedFocusNode: (selectedFocusNode) => set({ selectedFocusNode }),
}));
