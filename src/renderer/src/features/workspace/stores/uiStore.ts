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
import {
  buildDefaultSidebarWidths,
  normalizeSidebarWidthsWithMigrations,
  normalizeSidebarWidthInput,
  type SidebarWidthFeature,
} from "@shared/constants/sidebarSizing";

export type ContextTab = "synopsis" | "characters" | "terms";
export type ResearchTab = "character" | "world" | "event" | "faction" | "scrap" | "analysis";
export type WorldTab = "synopsis" | "terms" | "mindmap" | "drawing" | "plot" | "graph";
export type SidebarFeature = SidebarWidthFeature;
export type DocsRightTab =
  | "character"
  | "event"
  | "faction"
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

type FocusedClosableTarget =
  | { kind: "panel"; id: string }
  | { kind: "docs-tab" };

export interface ResizablePanelData {
  id: string; // Unique ID for the panel
  content: RightPanelContent;
  size: number; // Percentage or flex size
}

const DEFAULT_SIDEBAR_WIDTHS: Record<string, number> = buildDefaultSidebarWidths();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export type ScrivenerSectionId =
  | "manuscript"
  | "characters"
  | "world"
  | "scrap"
  | "snapshots"
  | "analysis"
  | "trash";

export type ScrivenerSectionsState = Record<ScrivenerSectionId, boolean>;

const DEFAULT_SCRIVENER_SECTIONS: ScrivenerSectionsState = {
  manuscript: true,
  characters: true,
  world: false,
  scrap: false,
  snapshots: false,
  analysis: false,
  trash: false,
};

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
  scrivenerSidebarOpen: boolean;
  scrivenerInspectorOpen: boolean;
  scrivenerSections: ScrivenerSectionsState;
  hasHydrated: boolean;
  focusedClosableTarget: FocusedClosableTarget | null;

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
  setScrivenerSidebarOpen: (isOpen: boolean) => void;
  setScrivenerInspectorOpen: (isOpen: boolean) => void;
  setScrivenerSectionOpen: (section: ScrivenerSectionId, isOpen: boolean) => void;
  setScrivenerSections: (sections: Partial<ScrivenerSectionsState>) => void;
  setSidebarWidth: (feature: string, width: number) => void;
  setHasHydrated: (value: boolean) => void;
  setFocusedClosableTarget: (target: FocusedClosableTarget | null) => void;
  closeFocusedSurface: () => boolean;

  // Scrivener Mode Main View State
  mainView: { type: "editor" | "character" | "event" | "faction" | "world" | "memo" | "trash" | "analysis"; id?: string };
  setMainView: (view: { type: "editor" | "character" | "event" | "faction" | "world" | "memo" | "trash" | "analysis"; id?: string }) => void;
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
      scrivenerSidebarOpen: true,
      scrivenerInspectorOpen: true,
      scrivenerSections: { ...DEFAULT_SCRIVENER_SECTIONS },
      hasHydrated: false,
      focusedClosableTarget: null,
      sidebarWidths: { ...DEFAULT_SIDEBAR_WIDTHS },

      mainView: { type: "editor" },

      setView: (view) =>
        set((state) => (state.view === view ? state : { view })),
      setContextTab: (contextTab) =>
        set((state) => (state.contextTab === contextTab ? state : { contextTab })),
      setWorldTab: (worldTab) =>
        set((state) => (state.worldTab === worldTab ? state : { worldTab })),

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
        return {
          ...state,
          panels: newPanels,
          focusedClosableTarget: { kind: "panel", id: newPanel.id },
        };
      }),
      removePanel: (id) => set((state) => {
        const newPanels = state.panels.filter(p => p.id !== id);
        if (newPanels.length > 0) {
          const sizePerPanel = 100 / newPanels.length;
          newPanels.forEach(p => p.size = sizePerPanel);
        }
        const shouldClearFocus =
          state.focusedClosableTarget?.kind === "panel" &&
          state.focusedClosableTarget.id === id;
        return {
          panels: newPanels,
          focusedClosableTarget: shouldClearFocus ? null : state.focusedClosableTarget,
        };
      }),
      updatePanelSize: (id, size) => set((state) => ({
        panels: state.panels.map(p => p.id === id ? { ...p, size } : p)
      })),
      setPanels: (panels) => set({ panels }),

      setSidebarOpen: (isSidebarOpen) =>
        set((state) =>
          state.isSidebarOpen === isSidebarOpen ? state : { isSidebarOpen }),
      setContextOpen: (isContextOpen) =>
        set((state) =>
          state.isContextOpen === isContextOpen ? state : { isContextOpen }),
      setManuscriptMenuOpen: (isManuscriptMenuOpen) =>
        set((state) =>
          state.isManuscriptMenuOpen === isManuscriptMenuOpen
            ? state
            : { isManuscriptMenuOpen }),
      setDocsRightTab: (docsRightTab) =>
        set((state) => {
          const nextFocusedClosableTarget =
            docsRightTab !== null
              ? { kind: "docs-tab" as const }
              : state.focusedClosableTarget?.kind === "docs-tab"
                ? null
                : state.focusedClosableTarget;
          const focusedUnchanged =
            state.focusedClosableTarget?.kind === nextFocusedClosableTarget?.kind &&
            (state.focusedClosableTarget?.kind !== "panel" ||
              state.focusedClosableTarget.id ===
                (nextFocusedClosableTarget?.kind === "panel"
                  ? nextFocusedClosableTarget.id
                  : undefined));
          if (state.docsRightTab === docsRightTab && focusedUnchanged) {
            return state;
          }
          return {
            docsRightTab,
            focusedClosableTarget: nextFocusedClosableTarget,
          };
        }),
      setBinderBarOpen: (isBinderBarOpen) =>
        set((state) =>
          state.isBinderBarOpen === isBinderBarOpen
            ? state
            : { isBinderBarOpen }),
      setScrivenerSidebarOpen: (scrivenerSidebarOpen) =>
        set((state) =>
          state.scrivenerSidebarOpen === scrivenerSidebarOpen
            ? state
            : { scrivenerSidebarOpen }),
      setScrivenerInspectorOpen: (scrivenerInspectorOpen) =>
        set((state) =>
          state.scrivenerInspectorOpen === scrivenerInspectorOpen
            ? state
            : { scrivenerInspectorOpen }),
      setScrivenerSectionOpen: (section, isOpen) =>
        set((state) => {
          if (state.scrivenerSections[section] === isOpen) return state;
          return {
            scrivenerSections: {
              ...state.scrivenerSections,
              [section]: isOpen,
            },
          };
        }),
      setScrivenerSections: (sections) =>
        set((state) => {
          const nextSections = {
            ...state.scrivenerSections,
            ...sections,
          };
          const unchanged = (Object.keys(DEFAULT_SCRIVENER_SECTIONS) as ScrivenerSectionId[])
            .every((section) => state.scrivenerSections[section] === nextSections[section]);
          return unchanged ? state : { scrivenerSections: nextSections };
        }),
      setMainView: (mainView) =>
        set((state) =>
          state.mainView.type === mainView.type && state.mainView.id === mainView.id
            ? state
            : { mainView }),
      setSidebarWidth: (feature, width) =>
        set((state) => {
          const next = normalizeSidebarWidthInput(feature, width);
          if (next === null) return state;
          const prev = normalizeSidebarWidthInput(feature, state.sidebarWidths[feature]);
          if (prev !== null && Math.abs(prev - next) < 2) return state;
          return {
            sidebarWidths: {
              ...state.sidebarWidths,
              [feature]: next,
            },
          };
        }),
      setHasHydrated: (hasHydrated) =>
        set((state) => (state.hasHydrated === hasHydrated ? state : { hasHydrated })),
      setFocusedClosableTarget: (focusedClosableTarget) =>
        set((state) => {
          const current = state.focusedClosableTarget;
          const same =
            current?.kind === focusedClosableTarget?.kind &&
            (current?.kind !== "panel" ||
              current.id ===
                (focusedClosableTarget?.kind === "panel"
                  ? focusedClosableTarget.id
                  : undefined));
          return same ? state : { focusedClosableTarget };
        }),
      closeFocusedSurface: () => {
        let handled = false;
        set((state) => {
          const normalizePanelSizes = (panels: ResizablePanelData[]): ResizablePanelData[] => {
            if (panels.length === 0) return [];
            const sizePerPanel = 100 / panels.length;
            return panels.map((panel) => ({ ...panel, size: sizePerPanel }));
          };
          const focusedTarget = state.focusedClosableTarget;

          if (
            focusedTarget?.kind === "panel" &&
            state.panels.some((panel) => panel.id === focusedTarget.id)
          ) {
            handled = true;
            const nextPanels = normalizePanelSizes(
              state.panels.filter((panel) => panel.id !== focusedTarget.id),
            );
            return {
              panels: nextPanels,
              focusedClosableTarget: null,
            };
          }

          if (focusedTarget?.kind === "docs-tab" && state.docsRightTab) {
            handled = true;
            return {
              docsRightTab: null,
              focusedClosableTarget: null,
            };
          }

          if (state.docsRightTab) {
            handled = true;
            return {
              docsRightTab: null,
              focusedClosableTarget: null,
            };
          }

          if (state.panels.length > 0) {
            handled = true;
            const nextPanels = normalizePanelSizes(state.panels.slice(0, -1));
            return {
              panels: nextPanels,
              focusedClosableTarget: null,
            };
          }

          return state;
        });
        return handled;
      },
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
        scrivenerSidebarOpen: state.scrivenerSidebarOpen,
        scrivenerInspectorOpen: state.scrivenerInspectorOpen,
        scrivenerSections: state.scrivenerSections,
        sidebarWidths: normalizeSidebarWidthsWithMigrations(state.sidebarWidths),
      }),
      merge: (persistedState, currentState) => {
        if (!isRecord(persistedState)) {
          return currentState;
        }

        const typedPersisted = persistedState as Partial<UIStore>;
        return {
          ...currentState,
          ...typedPersisted,
          scrivenerSections: {
            ...DEFAULT_SCRIVENER_SECTIONS,
            ...(isRecord(typedPersisted.scrivenerSections)
              ? typedPersisted.scrivenerSections as Partial<ScrivenerSectionsState>
              : {}),
          },
          sidebarWidths: normalizeSidebarWidthsWithMigrations(typedPersisted.sidebarWidths),
        };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
