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
  buildDefaultLayoutSurfaceRatios,
  normalizeLayoutSurfaceRatiosWithMigrations,
  type LayoutSurfaceId,
} from "@shared/constants/layoutSizing";
import {
  buildDefaultSidebarWidths,
  getSidebarDefaultWidth,
  getSynchronizedSidebarWidthFeatures,
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

export type RightPanelTab = Exclude<DocsRightTab, null>;

export type RegionId = "leftSidebar" | "rightPanel" | "rightRail";

export interface LeftSidebarRegionState {
  open: boolean;
  widthPx: number;
}

export interface RightPanelRegionState {
  open: boolean;
  activeTab: RightPanelTab | null;
  widthByTab: Record<RightPanelTab, number>;
}

export interface RightRailRegionState {
  open: boolean;
}

export interface UIRegionsState {
  leftSidebar: LeftSidebarRegionState;
  rightPanel: RightPanelRegionState;
  rightRail: RightRailRegionState;
}

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
const DEFAULT_LAYOUT_SURFACE_RATIOS: Record<LayoutSurfaceId, number> =
  buildDefaultLayoutSurfaceRatios();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const RIGHT_PANEL_TABS = [
  "character",
  "event",
  "faction",
  "world",
  "scrap",
  "analysis",
  "snapshot",
  "trash",
  "editor",
  "export",
] as const satisfies readonly RightPanelTab[];

const RIGHT_PANEL_TAB_FEATURE_MAP: Record<RightPanelTab, SidebarWidthFeature> = {
  character: "docsCharacter",
  event: "docsEvent",
  faction: "docsFaction",
  world: "docsWorld",
  scrap: "docsScrap",
  analysis: "docsAnalysis",
  snapshot: "docsSnapshot",
  trash: "docsTrash",
  editor: "docsEditor",
  export: "docsExport",
};

const getRightPanelTabByFeature = (feature: string): RightPanelTab | null => {
  switch (feature) {
    case "docsCharacter":
    case "editorCharacter":
    case "character":
      return "character";
    case "docsEvent":
    case "event":
      return "event";
    case "docsFaction":
    case "faction":
      return "faction";
    case "docsWorld":
    case "editorWorld":
    case "world":
      return "world";
    case "docsScrap":
    case "editorScrap":
    case "scrap":
      return "scrap";
    case "docsAnalysis":
    case "editorAnalysis":
    case "analysis":
      return "analysis";
    case "docsSnapshot":
    case "editorSnapshot":
    case "snapshot":
      return "snapshot";
    case "docsTrash":
    case "editorTrash":
    case "trash":
      return "trash";
    case "docsEditor":
    case "editor":
      return "editor";
    case "docsExport":
    case "export":
      return "export";
    default:
      return null;
  }
};

const buildDefaultRightPanelWidths = (): Record<RightPanelTab, number> =>
  Object.fromEntries(
    RIGHT_PANEL_TABS.map((tab) => [
      tab,
      getSidebarDefaultWidth(RIGHT_PANEL_TAB_FEATURE_MAP[tab]),
    ]),
  ) as Record<RightPanelTab, number>;

const normalizeRightPanelTab = (value: unknown): RightPanelTab | null => {
  if (typeof value !== "string") return null;
  return RIGHT_PANEL_TABS.includes(value as RightPanelTab)
    ? (value as RightPanelTab)
    : null;
};

const buildRegionsFromLegacyState = (legacy: {
  isSidebarOpen?: boolean;
  isContextOpen?: boolean;
  docsRightTab?: DocsRightTab;
  isBinderBarOpen?: boolean;
  scrivenerSidebarOpen?: boolean;
  scrivenerInspectorOpen?: boolean;
  sidebarWidths?: Record<string, number>;
  regions?: unknown;
}): UIRegionsState => {
  const normalizedSidebarWidths = normalizeSidebarWidthsWithMigrations(legacy.sidebarWidths);
  const defaultRightPanelWidths = buildDefaultRightPanelWidths();
  const fallbackActiveTab = normalizeRightPanelTab(legacy.docsRightTab);
  const persistedRegions = isRecord(legacy.regions) ? legacy.regions : null;
  const persistedLeft = persistedRegions && isRecord(persistedRegions.leftSidebar)
    ? persistedRegions.leftSidebar
    : null;
  const persistedRightPanel = persistedRegions && isRecord(persistedRegions.rightPanel)
    ? persistedRegions.rightPanel
    : null;
  const persistedRightRail = persistedRegions && isRecord(persistedRegions.rightRail)
    ? persistedRegions.rightRail
    : null;
  const persistedWidthByTab = persistedRightPanel && isRecord(persistedRightPanel.widthByTab)
    ? persistedRightPanel.widthByTab
    : null;

  const widthByTab = { ...defaultRightPanelWidths };
  RIGHT_PANEL_TABS.forEach((tab) => {
    const persistedWidth = persistedWidthByTab ? persistedWidthByTab[tab] : undefined;
    const normalizedPersistedWidth = normalizeSidebarWidthInput(
      RIGHT_PANEL_TAB_FEATURE_MAP[tab],
      persistedWidth,
    );
    if (normalizedPersistedWidth !== null) {
      widthByTab[tab] = normalizedPersistedWidth;
      return;
    }
    const legacyWidth = normalizeSidebarWidthInput(
      RIGHT_PANEL_TAB_FEATURE_MAP[tab],
      normalizedSidebarWidths[RIGHT_PANEL_TAB_FEATURE_MAP[tab]],
    );
    if (legacyWidth !== null) {
      widthByTab[tab] = legacyWidth;
    }
  });

  const legacyLeftWidth = normalizeSidebarWidthInput(
    "mainSidebar",
    normalizedSidebarWidths.mainSidebar,
  );
  const leftWidthFromRegions = normalizeSidebarWidthInput(
    "mainSidebar",
    persistedLeft?.widthPx,
  );
  const leftSidebarWidthPx =
    leftWidthFromRegions ??
    legacyLeftWidth ??
    getSidebarDefaultWidth("mainSidebar");

  const activeTabFromRegions = normalizeRightPanelTab(
    persistedRightPanel?.activeTab,
  );
  const activeTab = activeTabFromRegions ?? fallbackActiveTab;

  const leftOpenFromRegions =
    typeof persistedLeft?.open === "boolean"
      ? persistedLeft.open
      : undefined;
  const rightOpenFromRegions =
    typeof persistedRightPanel?.open === "boolean"
      ? persistedRightPanel.open
      : undefined;
  const rightRailOpenFromRegions =
    typeof persistedRightRail?.open === "boolean"
      ? persistedRightRail.open
      : undefined;

  return {
    leftSidebar: {
      open:
        leftOpenFromRegions ??
        (typeof legacy.isSidebarOpen === "boolean"
          ? legacy.isSidebarOpen
          : typeof legacy.scrivenerSidebarOpen === "boolean"
            ? legacy.scrivenerSidebarOpen
            : DEFAULT_UI_SIDEBAR_OPEN),
      widthPx: leftSidebarWidthPx,
    },
    rightPanel: {
      open:
        rightOpenFromRegions ??
        (activeTab !== null
          ? true
          : typeof legacy.isContextOpen === "boolean"
            ? legacy.isContextOpen
            : typeof legacy.scrivenerInspectorOpen === "boolean"
              ? legacy.scrivenerInspectorOpen
              : DEFAULT_UI_CONTEXT_OPEN),
      activeTab,
      widthByTab,
    },
    rightRail: {
      open:
        rightRailOpenFromRegions ??
        (typeof legacy.isBinderBarOpen === "boolean"
          ? legacy.isBinderBarOpen
          : true),
    },
  };
};

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

const DEFAULT_REGIONS: UIRegionsState = buildRegionsFromLegacyState({
  isSidebarOpen: DEFAULT_UI_SIDEBAR_OPEN,
  isContextOpen: DEFAULT_UI_CONTEXT_OPEN,
  docsRightTab: null,
  isBinderBarOpen: true,
  scrivenerSidebarOpen: true,
  scrivenerInspectorOpen: true,
  sidebarWidths: DEFAULT_SIDEBAR_WIDTHS,
});

const cloneRegions = (regions: UIRegionsState): UIRegionsState => ({
  leftSidebar: { ...regions.leftSidebar },
  rightPanel: {
    ...regions.rightPanel,
    widthByTab: { ...regions.rightPanel.widthByTab },
  },
  rightRail: { ...regions.rightRail },
});

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
  regions: UIRegionsState;

  // Sidebar Widths (in pixels)
  sidebarWidths: Record<string, number>;
  layoutSurfaceRatios: Record<LayoutSurfaceId, number>;

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
  setLayoutSurfaceRatio: (surface: LayoutSurfaceId, ratio: number) => void;
  setRegionOpen: (region: RegionId, open: boolean) => void;
  setRegionWidth: (region: Exclude<RegionId, "rightRail">, width: number) => void;
  openRightPanelTab: (tab: RightPanelTab) => void;
  closeRightPanel: () => void;
  toggleLeftSidebar: () => void;
  setRightPanelWidth: (tab: RightPanelTab, width: number) => void;
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
      isSidebarOpen: DEFAULT_REGIONS.leftSidebar.open,
      isContextOpen: DEFAULT_REGIONS.rightPanel.open,
      isManuscriptMenuOpen: false,
      docsRightTab: DEFAULT_REGIONS.rightPanel.activeTab,
      isBinderBarOpen: DEFAULT_REGIONS.rightRail.open,
      scrivenerSidebarOpen: DEFAULT_REGIONS.leftSidebar.open,
      scrivenerInspectorOpen: DEFAULT_REGIONS.rightPanel.open,
      scrivenerSections: { ...DEFAULT_SCRIVENER_SECTIONS },
      hasHydrated: false,
      focusedClosableTarget: null,
      sidebarWidths: { ...DEFAULT_SIDEBAR_WIDTHS },
      layoutSurfaceRatios: { ...DEFAULT_LAYOUT_SURFACE_RATIOS },
      regions: cloneRegions(DEFAULT_REGIONS),

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
            focusedUnchanged &&
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
            focusedClosableTarget: nextFocusedClosableTarget,
          };
        }),
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
      setRegionOpen: (region, open) =>
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
              patch.focusedClosableTarget =
                state.focusedClosableTarget?.kind === "docs-tab"
                  ? null
                  : state.focusedClosableTarget;
            }
          }
          if (region === "rightRail") {
            patch.isBinderBarOpen = open;
          }
          return patch;
        }),
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
      openRightPanelTab: (tab) =>
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
            focusedClosableTarget: { kind: "docs-tab" },
          };
        }),
      closeRightPanel: () =>
        set((state) => {
          if (!state.regions.rightPanel.open && state.docsRightTab === null) {
            return state;
          }
          const nextRegions = cloneRegions(state.regions);
          nextRegions.rightPanel.open = false;
          return {
            docsRightTab: null,
            isContextOpen: false,
            scrivenerInspectorOpen: false,
            regions: nextRegions,
            focusedClosableTarget:
              state.focusedClosableTarget?.kind === "docs-tab"
                ? null
                : state.focusedClosableTarget,
          };
        }),
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
            const nextRegions = cloneRegions(state.regions);
            nextRegions.rightPanel.open = false;
            nextRegions.rightPanel.activeTab = null;
            return {
              docsRightTab: null,
              isContextOpen: false,
              scrivenerInspectorOpen: false,
              regions: nextRegions,
              focusedClosableTarget: null,
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
        layoutSurfaceRatios: normalizeLayoutSurfaceRatiosWithMigrations(
          state.layoutSurfaceRatios,
          state.sidebarWidths,
        ),
        regions: cloneRegions(state.regions),
      }),
      merge: (persistedState, currentState) => {
        if (!isRecord(persistedState)) {
          return currentState;
        }

        const typedPersisted = persistedState as Partial<UIStore>;
        const normalizedSidebarWidths = normalizeSidebarWidthsWithMigrations(
          typedPersisted.sidebarWidths,
        );
        const normalizedLayoutSurfaceRatios = normalizeLayoutSurfaceRatiosWithMigrations(
          typedPersisted.layoutSurfaceRatios,
          normalizedSidebarWidths,
        );
        const migratedRegions = buildRegionsFromLegacyState({
          isSidebarOpen:
            typeof typedPersisted.isSidebarOpen === "boolean"
              ? typedPersisted.isSidebarOpen
              : undefined,
          isContextOpen:
            typeof typedPersisted.isContextOpen === "boolean"
              ? typedPersisted.isContextOpen
              : undefined,
          docsRightTab: normalizeRightPanelTab(typedPersisted.docsRightTab),
          isBinderBarOpen:
            typeof typedPersisted.isBinderBarOpen === "boolean"
              ? typedPersisted.isBinderBarOpen
              : undefined,
          scrivenerSidebarOpen:
            typeof typedPersisted.scrivenerSidebarOpen === "boolean"
              ? typedPersisted.scrivenerSidebarOpen
              : undefined,
          scrivenerInspectorOpen:
            typeof typedPersisted.scrivenerInspectorOpen === "boolean"
              ? typedPersisted.scrivenerInspectorOpen
              : undefined,
          sidebarWidths: normalizedSidebarWidths,
          regions: typedPersisted.regions,
        });

        const docsRightTab =
          normalizeRightPanelTab(typedPersisted.docsRightTab) ??
          migratedRegions.rightPanel.activeTab;
        return {
          ...currentState,
          ...typedPersisted,
          isSidebarOpen: migratedRegions.leftSidebar.open,
          isContextOpen: migratedRegions.rightPanel.open,
          docsRightTab,
          isBinderBarOpen: migratedRegions.rightRail.open,
          scrivenerSidebarOpen: migratedRegions.leftSidebar.open,
          scrivenerInspectorOpen: migratedRegions.rightPanel.open,
          scrivenerSections: {
            ...DEFAULT_SCRIVENER_SECTIONS,
            ...(isRecord(typedPersisted.scrivenerSections)
              ? typedPersisted.scrivenerSections as Partial<ScrivenerSectionsState>
              : {}),
          },
          sidebarWidths: normalizedSidebarWidths,
          layoutSurfaceRatios: normalizedLayoutSurfaceRatios,
          regions: migratedRegions,
        };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
