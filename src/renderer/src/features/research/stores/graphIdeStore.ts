import { create } from "zustand";

export type GraphIdeTab = "graph" | "timeline" | "note" | "entity" | "library";
export type GraphLayoutMode = "auto" | "cluster" | "reset";
export type PluginCategoryTab = Exclude<GraphIdeTab, "library">;
export type PluginSection = "browse" | "installed";

interface GraphIdeLayoutState {
  activeTab: GraphIdeTab;
  activeLibraryTab: PluginCategoryTab;
  activeLibrarySection: PluginSection;
  noteSearchQuery: string;
  selectedNoteId: string | null;
  isSidebarOpen: boolean;
  layoutTrigger: { mode: GraphLayoutMode; version: number } | null;
  setActiveTab: (tab: GraphIdeTab) => void;
  setActiveLibraryTab: (tab: PluginCategoryTab) => void;
  setActiveLibrarySection: (section: PluginSection) => void;
  setNoteSearchQuery: (query: string) => void;
  setSelectedNoteId: (id: string | null) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  triggerLayout: (mode: GraphLayoutMode) => void;
}

export const useGraphIdeStore = create<GraphIdeLayoutState>((set) => ({
  activeTab: "graph",
  activeLibraryTab: "graph",
  activeLibrarySection: "installed",
  noteSearchQuery: "",
  selectedNoteId: null,
  isSidebarOpen: true,
  layoutTrigger: null,
  setActiveTab: (tab) => set({ activeTab: tab, isSidebarOpen: true }),
  setActiveLibraryTab: (tab) => set({ activeLibraryTab: tab }),
  setActiveLibrarySection: (section) => set({ activeLibrarySection: section }),
  setNoteSearchQuery: (noteSearchQuery) => set({ noteSearchQuery }),
  setSelectedNoteId: (selectedNoteId) => set({ selectedNoteId }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  triggerLayout: (mode) =>
    set((state) => ({
      layoutTrigger: { mode, version: (state.layoutTrigger?.version ?? 0) + 1 },
    })),
}));
