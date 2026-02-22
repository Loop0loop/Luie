import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  DEFAULT_UI_CONTEXT_TAB,
  DEFAULT_UI_VIEW,
  DEFAULT_UI_SIDEBAR_OPEN,
  DEFAULT_UI_CONTEXT_OPEN,
  STORAGE_KEY_UI,
} from "@shared/constants";
import type { Snapshot } from "@shared/types";

export type ContextTab = "synopsis" | "characters" | "terms";
export type ResearchTab = "character" | "world" | "scrap" | "analysis";
export type WorldTab = "synopsis" | "terms" | "mindmap" | "drawing" | "plot";
export type SidebarFeature = "binder" | "character" | "world" | "scrap" | "analysis" | "snapshot" | "trash" | "memo" | "export";
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

export interface ResizablePanelData {
  id: string; // Unique ID for the panel
  content: RightPanelContent;
  size: number; // Percentage or flex size
}

interface UIStore {
  view: "template" | "editor" | "corkboard" | "outliner";
  contextTab: ContextTab;
  worldTab: WorldTab;

  // Resizable Panels State
  panels: ResizablePanelData[];

  isSidebarOpen: boolean;
  isContextOpen: boolean;
  isManuscriptMenuOpen: boolean;
  docsRightTab: DocsRightTab;
  isBinderBarOpen: boolean;

  // Sidebar Widths (in pixels)
  sidebarWidths: Record<string, number>;

  setView: (view: UIStore["view"]) => void;
  setContextTab: (tab: ContextTab) => void;
  setWorldTab: (tab: WorldTab) => void;

  // Panel Layout Actions
  addPanel: (content: RightPanelContent, insertAt?: number) => void;
  removePanel: (id: string) => void;
  updatePanelSize: (id: string, size: number) => void;
  setPanels: (panels: ResizablePanelData[]) => void;

  setSidebarOpen: (isOpen: boolean) => void;
  setContextOpen: (isOpen: boolean) => void;
  setManuscriptMenuOpen: (isOpen: boolean) => void;
  setDocsRightTab: (tab: DocsRightTab) => void;
  setBinderBarOpen: (isOpen: boolean) => void;
  setSidebarWidth: (feature: string, width: number) => void;

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
      panels: [],
      isSidebarOpen: DEFAULT_UI_SIDEBAR_OPEN,
      isContextOpen: DEFAULT_UI_CONTEXT_OPEN,
      isManuscriptMenuOpen: false,
      docsRightTab: null,
      isBinderBarOpen: true,
      sidebarWidths: {
        binder: 280,
        character: 350,
        world: 350,
        memo: 350,
        analysis: 350,
        snapshot: 350,
        trash: 350,
        export: 350,
      },

      mainView: { type: "editor" },

      setView: (view) => set({ view }),
      setContextTab: (contextTab) => set({ contextTab }),
      setWorldTab: (worldTab) => set({ worldTab }),

      addPanel: (content, insertAt) => set((state) => {
        // Prevent duplicates
        const existing = state.panels.find(p =>
          p.content.type === content.type &&
          p.content.id === content.id &&
          p.content.tab === content.tab
        );
        if (existing) return state;

        // Limit overpopulation
        if (state.panels.length >= 3) {
          return state; // Do not add more than 3 side panels
        }

        const newPanel: ResizablePanelData = {
          id: `panel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          content,
          size: state.panels.length === 0 ? 100 : 50
        };
        const newPanels = [...state.panels];
        if (insertAt !== undefined && insertAt >= 0 && insertAt <= newPanels.length) {
          newPanels.splice(insertAt, 0, newPanel);
        } else {
          newPanels.push(newPanel);
        }
        // Normalize sizes roughly
        const sizePerPanel = 100 / newPanels.length;
        newPanels.forEach(p => p.size = sizePerPanel);
        return { ...state, panels: newPanels };
      }),
      removePanel: (id) => set((state) => {
        const newPanels = state.panels.filter(p => p.id !== id);
        if (newPanels.length > 0) {
          const sizePerPanel = 100 / newPanels.length;
          newPanels.forEach(p => p.size = sizePerPanel);
        }
        return { panels: newPanels };
      }),
      updatePanelSize: (id, size) => set((state) => ({
        panels: state.panels.map(p => p.id === id ? { ...p, size } : p)
      })),
      setPanels: (panels) => set({ panels }),

      setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
      setContextOpen: (isContextOpen) => set({ isContextOpen }),
      setManuscriptMenuOpen: (isManuscriptMenuOpen) => set({ isManuscriptMenuOpen }),
      setDocsRightTab: (docsRightTab) => set({ docsRightTab }),
      setBinderBarOpen: (isBinderBarOpen) => set({ isBinderBarOpen }),
      setMainView: (mainView) => set({ mainView }),
      setSidebarWidth: (feature, width) =>
        set((state) => ({
          sidebarWidths: {
            ...state.sidebarWidths,
            [feature]: width,
          },
        })),
    }),
    {
      name: STORAGE_KEY_UI,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        view: state.view,
        contextTab: state.contextTab,
        worldTab: state.worldTab,
        // ✅ panels intentionally excluded from persist:
        // Restored panels often reference stale chapter/snapshot IDs after restart,
        // leading to broken UI. Always start fresh on each app launch.
        isSidebarOpen: state.isSidebarOpen,
        isContextOpen: state.isContextOpen,
        isManuscriptMenuOpen: state.isManuscriptMenuOpen,
        isBinderBarOpen: state.isBinderBarOpen,
        sidebarWidths: state.sidebarWidths,
      }),
    },
  ),
);
