import { create } from "zustand";

export type GraphIdeTab = "graph" | "timeline" | "note" | "entity" | "library";
export type GraphLayoutMode = "auto" | "cluster" | "reset";
interface GraphIdeLayoutState {
  activeTab: GraphIdeTab;
  noteSearchQuery: string;
  selectedNoteId: string | null;
  isSidebarOpen: boolean;
  layoutTrigger: { mode: GraphLayoutMode; version: number } | null;
  setActiveTab: (tab: GraphIdeTab) => void;
  setNoteSearchQuery: (query: string) => void;
  setSelectedNoteId: (id: string | null) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  triggerLayout: (mode: GraphLayoutMode) => void;
}

export const useGraphIdeStore = create<GraphIdeLayoutState>((set) => ({
  activeTab: "graph",
  noteSearchQuery: "",
  selectedNoteId: null,
  isSidebarOpen: true,
  layoutTrigger: null,
  setActiveTab: (tab) => set({ activeTab: tab, isSidebarOpen: true }),
  setNoteSearchQuery: (noteSearchQuery) => set({ noteSearchQuery }),
  setSelectedNoteId: (selectedNoteId) => set({ selectedNoteId }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  triggerLayout: (mode) =>
    set((state) => ({
      layoutTrigger: { mode, version: (state.layoutTrigger?.version ?? 0) + 1 },
    })),
}));
