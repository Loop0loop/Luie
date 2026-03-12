import { create } from "zustand";

export type GraphIdeTab = 'graph' | 'timeline' | 'note' | 'entity' | 'library';

interface GraphIdeLayoutState {
  activeTab: GraphIdeTab;
  isSidebarOpen: boolean;
  setActiveTab: (tab: GraphIdeTab) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
}

export const useGraphIdeStore = create<GraphIdeLayoutState>((set) => ({
  activeTab: 'graph',
  isSidebarOpen: true,
  setActiveTab: (tab) => set({ activeTab: tab, isSidebarOpen: true }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
}));