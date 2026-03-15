import type { LayoutSurfaceId } from "@shared/constants/layoutSizing";
import type { SidebarWidthFeature } from "@shared/constants/sidebarSizing";
import type { Snapshot } from "@shared/types";
import type { FocusedClosableTarget } from "./closableFocusStore";

export type ContextTab = "synopsis" | "characters" | "terms";
export type ResearchTab =
  | "character"
  | "world"
  | "event"
  | "faction"
  | "scrap"
  | "analysis";
export type WorldTab =
  | "synopsis"
  | "terms"
  | "mindmap"
  | "drawing"
  | "plot"
  | "graph";
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

export interface RightPanelContent {
  type: "research" | "editor" | "snapshot" | "export";
  id?: string;
  tab?: ResearchTab;
  snapshot?: Snapshot;
}

export interface ResizablePanelData {
  id: string;
  content: RightPanelContent;
  size: number;
}

export type ScrivenerSectionId =
  | "manuscript"
  | "characters"
  | "events"
  | "factions"
  | "world"
  | "scrap"
  | "snapshots"
  | "analysis"
  | "trash";

export type ScrivenerSectionsState = Record<ScrivenerSectionId, boolean>;

export const DEFAULT_SCRIVENER_SECTIONS: ScrivenerSectionsState = {
  manuscript: true,
  characters: true,
  events: false,
  factions: false,
  world: false,
  scrap: false,
  snapshots: false,
  analysis: false,
  trash: false,
};

export type MainView = {
  type:
    | "editor"
    | "character"
    | "event"
    | "faction"
    | "world"
    | "memo"
    | "trash"
    | "analysis";
  id?: string;
};

export interface UIStore {
  view: "template" | "editor" | "corkboard" | "outliner";
  contextTab: ContextTab;
  worldTab: WorldTab;
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
  regions: UIRegionsState;
  sidebarWidths: Record<string, number>;
  layoutSurfaceRatios: Record<LayoutSurfaceId, number>;
  mainView: MainView;
  setView: (view: UIStore["view"]) => void;
  setContextTab: (tab: ContextTab) => void;
  setWorldTab: (tab: WorldTab) => void;
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
  setScrivenerSectionOpen: (
    section: ScrivenerSectionId,
    isOpen: boolean,
  ) => void;
  setScrivenerSections: (sections: Partial<ScrivenerSectionsState>) => void;
  setSidebarWidth: (feature: string, width: number) => void;
  setLayoutSurfaceRatio: (surface: LayoutSurfaceId, ratio: number) => void;
  setRegionOpen: (region: RegionId, open: boolean) => void;
  setRegionWidth: (
    region: Exclude<RegionId, "rightRail">,
    width: number,
  ) => void;
  openRightPanelTab: (tab: RightPanelTab) => void;
  closeRightPanel: () => void;
  toggleLeftSidebar: () => void;
  setRightPanelWidth: (tab: RightPanelTab, width: number) => void;
  setHasHydrated: (value: boolean) => void;
  setFocusedClosableTarget: (target: FocusedClosableTarget | null) => void;
  closeFocusedSurface: () => boolean;
  setMainView: (view: MainView) => void;
}
