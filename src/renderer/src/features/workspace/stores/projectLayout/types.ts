import type { LayoutSurfaceId } from "@renderer/shared/constants/layoutSizing";
import type {
  DocsRightTab,
  ResearchTab,
  ResizablePanelData,
  ScrivenerSectionsState,
} from "../uiStore";

export type PersistedDocsRightTab =
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

export type ProjectWorkspaceLayoutState = {
  panels: ResizablePanelData[];
  researchPanelSizes: Partial<Record<ResearchTab, number>>;
};

export type ProjectLayoutState = {
  main: {
    sidebarOpen: boolean;
    contextOpen: boolean;
  };
  docs: {
    sidebarOpen: boolean;
    binderBarOpen: boolean;
    rightTab: PersistedDocsRightTab;
  };
  scrivener: {
    sidebarOpen: boolean;
    inspectorOpen: boolean;
    sections: ScrivenerSectionsState;
  };
  editor: {
    sidebarOpen: boolean;
    binderRailOpen: boolean;
    rightTab: PersistedDocsRightTab;
    activeChapterId: string | null;
    scrollYByChapter: Record<string, number>;
  };
  workspace: ProjectWorkspaceLayoutState;
  sidebarWidths: Record<string, number>;
  layoutSurfaceRatios: Record<LayoutSurfaceId, number>;
};

export type ProjectLayoutPatch = {
  main?: Partial<ProjectLayoutState["main"]>;
  docs?: Partial<ProjectLayoutState["docs"]>;
  scrivener?: Partial<ProjectLayoutState["scrivener"]>;
  editor?: Partial<ProjectLayoutState["editor"]>;
  sidebarWidths?: ProjectLayoutState["sidebarWidths"];
  layoutSurfaceRatios?: ProjectLayoutState["layoutSurfaceRatios"];
  workspace?: Partial<ProjectWorkspaceLayoutState>;
};

export interface ProjectLayoutStore {
  hasHydrated: boolean;
  byProject: Record<string, ProjectLayoutState>;
  upsertProjectLayout: (
    projectId: string,
    patch: ProjectLayoutPatch,
  ) => void;
  getProjectLayout: (projectId: string) => ProjectLayoutState;
  clearProjectLayout: (projectId: string) => void;
  setHasHydrated: (value: boolean) => void;
}

export type DocsRightTabInput =
  | DocsRightTab
  | PersistedDocsRightTab
  | null
  | undefined;
