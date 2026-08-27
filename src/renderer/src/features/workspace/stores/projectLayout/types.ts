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
  | "plotboard"
  | "untitled"
  | "analysis"
  | "snapshot"
  | "trash"
  | "editor"
  | "export"
  | null;

export type ProjectWorkspacePanelState = {
  panels: ResizablePanelData[];
  researchPanelSizes: Partial<Record<ResearchTab, number>>;
};

// NOTE: default 레이아웃은 research 탭이 패널 하나를 공유한다(useSplitView가 research 패널을
// 하나만 유지하고 tab만 교체). 그래서 폭도 탭별이 아니라 하나만 저장한다. 다른 레이아웃은
// 기존 탭별 맵(`researchPanelSizes`)을 계속 쓴다.
export type ProjectDefaultWorkspacePanelState = ProjectWorkspacePanelState & {
  researchPanelSize?: number;
};

export type ProjectWorkspaceLayoutState = ProjectWorkspacePanelState & {
  byLayout: {
    default: ProjectDefaultWorkspacePanelState;
  };
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
  workspace?: Partial<ProjectWorkspacePanelState> & {
    byLayout?: { default?: Partial<ProjectDefaultWorkspacePanelState> };
  };
};

export interface ProjectLayoutStore {
  hasHydrated: boolean;
  byProject: Record<string, ProjectLayoutState>;
  upsertProjectLayout: (projectId: string, patch: ProjectLayoutPatch) => void;
  getProjectLayout: (projectId: string) => ProjectLayoutState;
  clearProjectLayout: (projectId: string) => void;
  setHasHydrated: (value: boolean) => void;
}

export type DocsRightTabInput =
  | DocsRightTab
  | PersistedDocsRightTab
  | null
  | undefined;
