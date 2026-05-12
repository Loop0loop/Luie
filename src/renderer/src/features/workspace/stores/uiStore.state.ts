import type { StateCreator } from "zustand";
import {
  DEFAULT_UI_CONTEXT_TAB,
  DEFAULT_UI_VIEW,
} from "@shared/constants";
import {
  buildDefaultLayoutSurfaceRatios,
  normalizeLayoutSurfaceRatiosWithMigrations,
  type LayoutSurfaceId,
} from "@shared/constants/layoutSizing";
import {
  buildDefaultSidebarWidths,
  getSynchronizedSidebarWidthFeatures,
  normalizeSidebarWidthInput,
  normalizeSidebarWidthsWithMigrations,
} from "@shared/constants/sidebarSizing";
import {
  clearFocusedClosableTarget,
  getFocusedClosableTarget,
  setFocusedClosableTarget as setTransientFocusedClosableTarget,
} from "@renderer/features/workspace/stores/closableFocusStore";
import {
  buildRegionsFromLegacyState,
  cloneRegions,
  DEFAULT_REGIONS,
  getRightPanelTabByFeature,
  normalizeRightPanelTab,
  RIGHT_PANEL_TAB_FEATURE_MAP,
} from "./uiStore.regions";
import { DEFAULT_SCRIVENER_SECTIONS } from "./uiStore.types";
import type {
  ContextTab,
  MainView,
  RightPanelContent,
  ResizablePanelData,
  ScrivenerSectionId,
  UIStore,
} from "./uiStore.types";

const DEFAULT_SIDEBAR_WIDTHS: Record<string, number> = buildDefaultSidebarWidths();
const DEFAULT_LAYOUT_SURFACE_RATIOS: Record<LayoutSurfaceId, number> =
  buildDefaultLayoutSurfaceRatios();

export const buildStablePanelId = (content: RightPanelContent): string => {
  if (content.type === "research" && content.tab) {
    if (content.id) {
      return `research-${content.tab}-${content.id}`;
    }
    return `research-${content.tab}`;
  }
  if (content.type === "editor" && content.id) {
    return `editor-${content.id}`;
  }
  if (content.type === "export") {
    return "export-preview";
  }
  if (content.type === "snapshot" && content.snapshot?.id) {
    return `snapshot-${content.snapshot.id}`;
  }
  return `panel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const createUIStoreState: StateCreator<UIStore, [], [], UIStore> = (set) => ({
  view: DEFAULT_UI_VIEW as UIStore["view"],
  contextTab: DEFAULT_UI_CONTEXT_TAB as ContextTab,
  worldTab: "terms",
  panels: [],
  isManuscriptMenuOpen: false,
  scrivenerSections: { ...DEFAULT_SCRIVENER_SECTIONS },
  hasHydrated: false,
  sidebarWidths: { ...DEFAULT_SIDEBAR_WIDTHS },
  layoutSurfaceRatios: { ...DEFAULT_LAYOUT_SURFACE_RATIOS },
  regions: cloneRegions(DEFAULT_REGIONS),
  mainView: { type: "editor" } as MainView,

  setView: (view) =>
    set((state) => (state.view === view ? state : { view })),
  setContextTab: (contextTab) =>
    set((state) => (state.contextTab === contextTab ? state : { contextTab })),
  setWorldTab: (worldTab) =>
    set((state) => (state.worldTab === worldTab ? state : { worldTab })),

  addPanel: (content, insertAt, initialSize) => {
    let nextFocusedPanelId: string | null = null;
    set((state) => {
      if (content.type === "snapshot" && content.snapshot?.id) {
        const existingSnapshotIndex = state.panels.findIndex(
          (panel) => panel.content.type === "snapshot",
        );
        if (existingSnapshotIndex >= 0) {
          const nextPanels = [...state.panels];
          nextPanels[existingSnapshotIndex] = {
            ...nextPanels[existingSnapshotIndex],
            id: buildStablePanelId(content),
            content,
          };
          nextFocusedPanelId = nextPanels[existingSnapshotIndex].id;
          return {
            ...state,
            panels: nextPanels,
          };
        }
      }

      const existing = state.panels.find((panel) =>
        panel.content.type === content.type &&
        (content.type === "snapshot"
          ? panel.content.snapshot?.id === content.snapshot?.id
          : panel.content.id === content.id &&
            panel.content.tab === content.tab),
      );
      if (existing || state.panels.length >= 3) {
        return state;
      }

      const newPanel: ResizablePanelData = {
        id: buildStablePanelId(content),
        content,
        size:
          typeof initialSize === "number" && Number.isFinite(initialSize)
            ? Math.min(90, Math.max(15, initialSize))
            : state.panels.length === 0
              ? 100
              : 50,
      };
      const newPanels = [...state.panels];
      if (insertAt !== undefined && insertAt >= 0 && insertAt <= newPanels.length) {
        newPanels.splice(insertAt, 0, newPanel);
      } else {
        newPanels.push(newPanel);
      }
      if (initialSize === undefined || !Number.isFinite(initialSize)) {
        const sizePerPanel = 100 / newPanels.length;
        newPanels.forEach((panel) => {
          panel.size = sizePerPanel;
        });
      }
      nextFocusedPanelId = newPanel.id;
      return {
        ...state,
        panels: newPanels,
      };
    });
    if (nextFocusedPanelId) {
      setTransientFocusedClosableTarget({ kind: "panel", id: nextFocusedPanelId });
    }
  },
  removePanel: (id) => {
    const focusedTarget = getFocusedClosableTarget();
    set((state) => {
      const newPanels = state.panels.filter((panel) => panel.id !== id);
      if (newPanels.length > 0) {
        const sizePerPanel = 100 / newPanels.length;
        newPanels.forEach((panel) => {
          panel.size = sizePerPanel;
        });
      }
      return { panels: newPanels };
    });
    if (focusedTarget?.kind === "panel" && focusedTarget.id === id) {
      clearFocusedClosableTarget();
    }
  },
  updatePanelSize: (id, size) =>
    set((state) => ({
      panels: state.panels.map((panel) =>
        panel.id === id ? { ...panel, size } : panel,
      ),
    })),
  setPanels: (panels) => set({ panels }),

  setManuscriptMenuOpen: (isManuscriptMenuOpen) =>
    set((state) =>
      state.isManuscriptMenuOpen === isManuscriptMenuOpen
        ? state
        : { isManuscriptMenuOpen }),
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
      const targetFeatures = [feature, ...getSynchronizedSidebarWidthFeatures(feature)];
      const uniqueTargetFeatures = Array.from(new Set(targetFeatures));
      const nextSidebarWidths = { ...state.sidebarWidths };
      const nextRegions = cloneRegions(state.regions);
      let didUpdate = false;

      for (const targetFeature of uniqueTargetFeatures) {
        const next = normalizeSidebarWidthInput(targetFeature, width);
        if (next === null) continue;
        const prev = normalizeSidebarWidthInput(
          targetFeature,
          state.sidebarWidths[targetFeature],
        );
        if (prev !== null && Math.abs(prev - next) < 2) continue;
        nextSidebarWidths[targetFeature] = next;
        if (
          targetFeature === "mainSidebar" ||
          targetFeature === "docsBinder" ||
          targetFeature === "scrivenerBinder" ||
          targetFeature === "binder"
        ) {
          nextRegions.leftSidebar.widthPx = next;
        }
        const targetTab = getRightPanelTabByFeature(targetFeature);
        if (targetTab) {
          nextRegions.rightPanel.widthByTab[targetTab] = next;
        }
        didUpdate = true;
      }

      if (!didUpdate) return state;
      return {
        sidebarWidths: nextSidebarWidths,
        regions: nextRegions,
      };
    }),
  setSidebarWidths: (widths) =>
    set((state) => {
      const normalizedSidebarWidths = normalizeSidebarWidthsWithMigrations({
        ...state.sidebarWidths,
        ...widths,
      });
      const nextRegions = buildRegionsFromLegacyState({
        sidebarWidths: normalizedSidebarWidths,
        regions: state.regions,
      });
      return {
        sidebarWidths: normalizedSidebarWidths,
        regions: nextRegions,
      };
    }),
  setLayoutSurfaceRatio: (surface, ratio) =>
    set((state) => {
      const normalizedRatios = normalizeLayoutSurfaceRatiosWithMigrations({
        ...state.layoutSurfaceRatios,
        [surface]: ratio,
      });
      const nextRatio = normalizedRatios[surface];
      const previousRatio = state.layoutSurfaceRatios[surface];
      if (Math.abs(previousRatio - nextRatio) < 0.1) {
        return state;
      }

      return {
        layoutSurfaceRatios: {
          ...state.layoutSurfaceRatios,
          [surface]: nextRatio,
        },
      };
    }),
  setLayoutSurfaceRatios: (ratios) =>
    set((state) => {
      const normalizedRatios = normalizeLayoutSurfaceRatiosWithMigrations(
        {
          ...state.layoutSurfaceRatios,
          ...ratios,
        },
        state.sidebarWidths,
      );
      return {
        layoutSurfaceRatios: normalizedRatios,
      };
    }),
  setRegionOpen: (region, open) => {
    set((state) => {
      if (state.regions[region].open === open) return state;
      const nextRegions = cloneRegions(state.regions);
      nextRegions[region].open = open;
      if (region === "rightPanel" && !open) {
        nextRegions.rightPanel.activeTab = null;
      }
      return { regions: nextRegions };
    });
    if (
      region === "rightPanel" &&
      !open &&
      getFocusedClosableTarget()?.kind === "docs-tab"
    ) {
      clearFocusedClosableTarget();
    }
  },
  setRegionWidth: (region, width) =>
    set((state) => {
      if (region === "leftSidebar") {
        const normalized = normalizeSidebarWidthInput("mainSidebar", width);
        if (normalized === null) return state;
        const nextRegions = cloneRegions(state.regions);
        if (Math.abs(nextRegions.leftSidebar.widthPx - normalized) < 2) {
          return state;
        }
        nextRegions.leftSidebar.widthPx = normalized;
        return {
          regions: nextRegions,
          sidebarWidths: {
            ...state.sidebarWidths,
            mainSidebar: normalized,
            docsBinder: normalized,
            scrivenerBinder: normalized,
            binder: normalized,
          },
        };
      }

      const activeTab = state.regions.rightPanel.activeTab ?? "character";
      const targetFeature = RIGHT_PANEL_TAB_FEATURE_MAP[activeTab];
      const normalized = normalizeSidebarWidthInput(targetFeature, width);
      if (normalized === null) return state;
      const nextRegions = cloneRegions(state.regions);
      if (Math.abs(nextRegions.rightPanel.widthByTab[activeTab] - normalized) < 2) {
        return state;
      }
      nextRegions.rightPanel.widthByTab[activeTab] = normalized;
      return {
        regions: nextRegions,
        sidebarWidths: {
          ...state.sidebarWidths,
          [targetFeature]: normalized,
        },
      };
    }),
  openRightPanelTab: (tab) => {
    set((state) => {
      const nextTab = normalizeRightPanelTab(tab);
      if (!nextTab) return state;
      const isAlreadyOpen =
        state.regions.rightPanel.open &&
        state.regions.rightPanel.activeTab === nextTab;
      if (isAlreadyOpen) return state;
      const nextRegions = cloneRegions(state.regions);
      nextRegions.rightPanel.open = true;
      nextRegions.rightPanel.activeTab = nextTab;
      return { regions: nextRegions };
    });
    setTransientFocusedClosableTarget({ kind: "docs-tab" });
  },
  closeRightPanel: () => {
    set((state) => {
      if (!state.regions.rightPanel.open) return state;
      const nextRegions = cloneRegions(state.regions);
      nextRegions.rightPanel.open = false;
      nextRegions.rightPanel.activeTab = null;
      return { regions: nextRegions };
    });
    if (getFocusedClosableTarget()?.kind === "docs-tab") {
      clearFocusedClosableTarget();
    }
  },
  toggleLeftSidebar: () =>
    set((state) => {
      const nextOpen = !state.regions.leftSidebar.open;
      const nextRegions = cloneRegions(state.regions);
      nextRegions.leftSidebar.open = nextOpen;
      return { regions: nextRegions };
    }),
  setRightPanelWidth: (tab, width) =>
    set((state) => {
      const normalizedTab = normalizeRightPanelTab(tab);
      if (!normalizedTab) return state;
      const targetFeature = RIGHT_PANEL_TAB_FEATURE_MAP[normalizedTab];
      const normalizedWidth = normalizeSidebarWidthInput(targetFeature, width);
      if (normalizedWidth === null) return state;
      const currentWidth = state.regions.rightPanel.widthByTab[normalizedTab];
      if (Math.abs(currentWidth - normalizedWidth) < 2) return state;
      const nextRegions = cloneRegions(state.regions);
      nextRegions.rightPanel.widthByTab[normalizedTab] = normalizedWidth;
      return {
        regions: nextRegions,
        sidebarWidths: {
          ...state.sidebarWidths,
          [targetFeature]: normalizedWidth,
        },
      };
    }),
  setHasHydrated: (hasHydrated) =>
    set((state) => (state.hasHydrated === hasHydrated ? state : { hasHydrated })),
  setFocusedClosableTarget: (focusedClosableTarget) => {
    setTransientFocusedClosableTarget(focusedClosableTarget);
  },
  closeFocusedSurface: () => {
    // Capture kind before entering set() — will be used for side-effects after
    const focusedKind = getFocusedClosableTarget()?.kind;

    // compact-binder state lives in BinderBarCompactHover (component-local).
    // We can't mutate it from the store, so we bridge via a DOM custom event.
    // The component listens for "luie:close-compact-binder" and handles priority
    // (snapshot viewer → binder tab). This is intentional and not a store leak.
    if (focusedKind === "compact-binder") {
      clearFocusedClosableTarget();
      window.dispatchEvent(new CustomEvent("luie:close-compact-binder"));
      return true;
    }

    let handled = false;
    set((state) => {
      const normalizePanelSizes = (panels: ResizablePanelData[]): ResizablePanelData[] => {
        if (panels.length === 0) return [];
        const sizePerPanel = 100 / panels.length;
        return panels.map((panel) => ({ ...panel, size: sizePerPanel }));
      };
      const focusedTarget = getFocusedClosableTarget();

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
        };
      }

      if (focusedTarget?.kind === "docs-tab" && state.regions.rightPanel.open) {
        handled = true;
        const nextRegions = cloneRegions(state.regions);
        nextRegions.rightPanel.open = false;
        nextRegions.rightPanel.activeTab = null;
        return { regions: nextRegions };
      }

      if (state.regions.rightPanel.open) {
        handled = true;
        const nextRegions = cloneRegions(state.regions);
        nextRegions.rightPanel.open = false;
        nextRegions.rightPanel.activeTab = null;
        return { regions: nextRegions };
      }

      if (state.panels.length > 0) {
        handled = true;
        const nextPanels = normalizePanelSizes(state.panels.slice(0, -1));
        return {
          panels: nextPanels,
        };
      }

      return state;
    });
    if (handled) {
      clearFocusedClosableTarget();
    }
    return handled;
  },
});
