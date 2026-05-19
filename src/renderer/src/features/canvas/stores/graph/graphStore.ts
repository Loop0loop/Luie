import { create } from "zustand";
import type { GraphMode, GraphDepth } from "../../types/graph";

interface GraphState {
  mode: GraphMode;
  depth: GraphDepth;
  focusId: string | null;

  setMode: (mode: GraphMode) => void;
  setDepth: (depth: GraphDepth) => void;
  setFocusId: (id: string | null) => void;
}

export const useGraphStore = create<GraphState>()((set) => ({
  mode: "episode",
  depth: 1,
  focusId: null,

  setMode: (mode) => set({ mode }),
  setDepth: (depth) => set({ depth }),
  setFocusId: (focusId) => set({ focusId }),
}));
