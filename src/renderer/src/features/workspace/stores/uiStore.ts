import { create } from "zustand";
import { persist } from "zustand/middleware";
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
} from "@shared/constants/sidebarSizing";
import {
  clearFocusedClosableTarget,
  getFocusedClosableTarget,
  setFocusedClosableTarget as setTransientFocusedClosableTarget,
} from "@renderer/features/workspace/stores/closableFocusStore";
import {
  cloneRegions,
  DEFAULT_REGIONS,
  getRightPanelTabByFeature,
  normalizeRightPanelTab,
  RIGHT_PANEL_TAB_FEATURE_MAP,
} from "./uiStore.regions";
import { buildUiStorePersistOptions } from "./uiStore.persist";
import { DEFAULT_SCRIVENER_SECTIONS } from "./uiStore.types";
import type {
  ContextTab,
  MainView,
  ResizablePanelData,
  ScrivenerSectionId,
  UIStore,
} from "./uiStore.types";

export type {
  ContextTab,
  DocsRightTab,
  MainView,
  RegionId,
  ResizablePanelData,
  ResearchTab,
  RightPanelContent,
  RightPanelTab,
  ScrivenerSectionId,
  ScrivenerSectionsState,
  SidebarFeature,
  UIRegionsState,
  UIStore,
  WorldTab,
} from "./uiStore.types";
const DEFAULT_SIDEBAR_WIDTHS: Record<string, number> = buildDefaultSidebarWidths();
const DEFAULT_LAYOUT_SURFACE_RATIOS: Record<LayoutSurfaceId, number> =
  buildDefaultLayoutSurfaceRatios();

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      view: DEFAULT_UI_VIEW as UIStore["view"],
      contextTab: DEFAULT_UI_CONTEXT_TAB as ContextTab,
      worldTab: "terms",
      panels: [],
      isSidebarOpen: DEFAULT_REGIONS.leftSidebar.open,
      isContextOpen: DEFAULT_REGIONS.rightPanel.open,
      isManuscriptMenuOpen: false,
      docsRightTab: DEFAULT_REGIONS.rightPanel.activeTab,
      isBinderBarOpen: DEFAULT_REGIONS.rightRail.open,
      scrivenerSidebarOpen: DEFAULT_REGIONS.leftSidebar.open,
      scrivenerInspectorOpen: DEFAULT_REGIONS.rightPanel.open,
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

      addPanel: (content, insertAt) => {
        let nextFocusedPanelId: string | null = null;
        set((state) => {
          const existing = state.panels.find((panel) =>
            panel.content.type === content.type &&
            panel.content.id === content.id &&
            panel.content.tab === content.tab,
          );
          if (existing || state.panels.length >= 3) {
            return state;
          }

          const newPanel: ResizablePanelData = {
            id: `panel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            content,
            size: state.panels.length === 0 ? 100 : 50,
          };
          const newPanels = [...state.panels];
          if (insertAt !== undefined && insertAt >= 0 && insertAt <= newPanels.length) {
            newPanels.splice(insertAt, 0, newPanel);
          } else {
            newPanels.push(newPanel);
          }
          const sizePerPanel = 100 / newPanels.length;
          newPanels.forEach((panel) => {
            panel.size = sizePerPanel;
          });
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
      updatePanelSize: (id, size) => set((state) => ({
        panels: state.panels.map(p => p.id === id ? { ...p, size } : p)
      })),
      setPanels: (panels) => set({ panels }),

      setSidebarOpen: (isSidebarOpen) =>
        set((state) => {
          const unchanged =
            state.isSidebarOpen === isSidebarOpen &&
            state.regions.leftSidebar.open === isSidebarOpen;
          if (unchanged) return state;
          return {
            isSidebarOpen,
            regions: {
              ...state.regions,
              leftSidebar: {
                ...state.regions.leftSidebar,
                open: isSidebarOpen,
              },
            },
          };
        }),
      setContextOpen: (isContextOpen) =>
        set((state) => {
          const unchanged =
            state.isContextOpen === isContextOpen &&
            state.regions.rightPanel.open === isContextOpen;
          if (unchanged) return state;
          const nextRegions = cloneRegions(state.regions);
          nextRegions.rightPanel.open = isContextOpen;
          return {
            isContextOpen,
            scrivenerInspectorOpen: isContextOpen,
            regions: nextRegions,
          };
        }),
      setManuscriptMenuOpen: (isManuscriptMenuOpen) =>
        set((state) =>
          state.isManuscriptMenuOpen === isManuscriptMenuOpen
            ? state
            : { isManuscriptMenuOpen }),
      setDocsRightTab: (docsRightTab) => {
        set((state) => {
          const nextRightPanelOpen = docsRightTab !== null;
          const nextRegions = {
            ...state.regions,
            rightPanel: {
              ...state.regions.rightPanel,
              open: nextRightPanelOpen,
              activeTab: docsRightTab,
            },
          };
          if (
            state.docsRightTab === docsRightTab &&
            state.regions.rightPanel.open === nextRightPanelOpen &&
            state.regions.rightPanel.activeTab === docsRightTab
          ) {
            return state;
          }
          return {
            docsRightTab,
            isContextOpen: nextRightPanelOpen,
            scrivenerInspectorOpen: nextRightPanelOpen,
            regions: nextRegions,
          };
        });
        if (docsRightTab !== null) {
          setTransientFocusedClosableTarget({ kind: "docs-tab" });
        } else if (getFocusedClosableTarget()?.kind === "docs-tab") {
          clearFocusedClosableTarget();
        }
      },
      setBinderBarOpen: (isBinderBarOpen) =>
        set((state) => {
          const unchanged =
            state.isBinderBarOpen === isBinderBarOpen &&
            state.regions.rightRail.open === isBinderBarOpen;
          if (unchanged) return state;
          return {
            isBinderBarOpen,
            regions: {
              ...state.regions,
              rightRail: {
                ...state.regions.rightRail,
                open: isBinderBarOpen,
              },
            },
          };
        }),
      setScrivenerSidebarOpen: (scrivenerSidebarOpen) =>
        set((state) => {
          const unchanged =
            state.scrivenerSidebarOpen === scrivenerSidebarOpen &&
            state.regions.leftSidebar.open === scrivenerSidebarOpen;
          if (unchanged) return state;
          return {
            scrivenerSidebarOpen,
            regions: {
              ...state.regions,
              leftSidebar: {
                ...state.regions.leftSidebar,
                open: scrivenerSidebarOpen,
              },
            },
          };
        }),
      setScrivenerInspectorOpen: (scrivenerInspectorOpen) =>
        set((state) => {
          const unchanged =
            state.scrivenerInspectorOpen === scrivenerInspectorOpen &&
            state.regions.rightPanel.open === scrivenerInspectorOpen;
          if (unchanged) return state;
          return {
            scrivenerInspectorOpen,
            regions: {
              ...state.regions,
              rightPanel: {
                ...state.regions.rightPanel,
                open: scrivenerInspectorOpen,
              },
            },
          };
        }),
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
          const targetFeatures = [
            feature,
            ...getSynchronizedSidebarWidthFeatures(feature),
          ];
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
      setRegionOpen: (region, open) => {
        set((state) => {
          if (state.regions[region].open === open) return state;
          const nextRegions = cloneRegions(state.regions);
          nextRegions[region].open = open;
          const patch: Partial<UIStore> = { regions: nextRegions };
          if (region === "leftSidebar") {
            patch.isSidebarOpen = open;
            patch.scrivenerSidebarOpen = open;
          }
          if (region === "rightPanel") {
            patch.isContextOpen = open;
            patch.scrivenerInspectorOpen = open;
            patch.docsRightTab = open ? state.docsRightTab : null;
            if (!open) {
              nextRegions.rightPanel.activeTab = null;
            }
          }
          if (region === "rightRail") {
            patch.isBinderBarOpen = open;
          }
          return patch;
        });
        if (region === "rightPanel" && !open && getFocusedClosableTarget()?.kind === "docs-tab") {
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
            state.regions.rightPanel.activeTab === nextTab &&
            state.docsRightTab === nextTab &&
            state.regions.rightRail.open &&
            state.isBinderBarOpen;
          if (isAlreadyOpen) return state;
          const nextRegions = cloneRegions(state.regions);
          nextRegions.rightPanel.open = true;
          nextRegions.rightPanel.activeTab = nextTab;
          nextRegions.rightRail.open = true;
          return {
            docsRightTab: nextTab,
            isContextOpen: true,
            scrivenerInspectorOpen: true,
            isBinderBarOpen: true,
            regions: nextRegions,
          };
        });
        setTransientFocusedClosableTarget({ kind: "docs-tab" });
      },
      closeRightPanel: () => {
        set((state) => {
          if (!state.regions.rightPanel.open && state.docsRightTab === null) {
            return state;
          }
          const nextRegions = cloneRegions(state.regions);
          nextRegions.rightPanel.open = false;
          nextRegions.rightPanel.activeTab = null;
          return {
            docsRightTab: null,
            isContextOpen: false,
            scrivenerInspectorOpen: false,
            regions: nextRegions,
          };
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
          return {
            isSidebarOpen: nextOpen,
            scrivenerSidebarOpen: nextOpen,
            regions: nextRegions,
          };
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

          if (focusedTarget?.kind === "docs-tab" && state.docsRightTab) {
            handled = true;
            const nextRegions = cloneRegions(state.regions);
            nextRegions.rightPanel.open = false;
            nextRegions.rightPanel.activeTab = null;
            return {
              docsRightTab: null,
              isContextOpen: false,
              scrivenerInspectorOpen: false,
              regions: nextRegions,
            };
          }

          if (state.docsRightTab) {
            handled = true;
            const nextRegions = cloneRegions(state.regions);
            nextRegions.rightPanel.open = false;
            nextRegions.rightPanel.activeTab = null;
            return {
              docsRightTab: null,
              isContextOpen: false,
              scrivenerInspectorOpen: false,
              regions: nextRegions,
            };
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
    }),
    buildUiStorePersistOptions(),
  ),
);
