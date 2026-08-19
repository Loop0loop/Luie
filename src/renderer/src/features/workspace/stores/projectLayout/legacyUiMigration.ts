import type { EditorUiMode } from "@shared/types";
import type { LayoutSurfaceId } from "@renderer/shared/constants/layoutSizing";
import type {
  PersistedDocsRightTab,
  ProjectLayoutPatch,
} from "./types";
import type { ScrivenerSectionsState } from "../uiStore";

export type LegacyUiLayoutSnapshot = {
  leftSidebarOpen: boolean;
  rightPanelOpen: boolean;
  rightRailOpen: boolean;
  rightPanelTab: PersistedDocsRightTab;
  scrivenerSections: ScrivenerSectionsState;
  sidebarWidths: Record<string, number>;
  layoutSurfaceRatios: Record<LayoutSurfaceId, number>;
};

/**
 * uiStore v4에 남아 있는 전역 layout 값을 최초 프로젝트 layout으로 옮긴다.
 * 과거에는 모드별 값을 구분할 수 없었으므로 현재 진입 모드의 slot만 채우고,
 * 공통 sizing은 그대로 보존한다. 이미 프로젝트 값이 있으면 이 함수는 호출하지 않는다.
 */
export const buildLegacyUiProjectLayoutPatch = (
  uiMode: EditorUiMode | "canvas",
  snapshot: LegacyUiLayoutSnapshot,
): ProjectLayoutPatch => {
  const patch: ProjectLayoutPatch = {
    sidebarWidths: snapshot.sidebarWidths,
    layoutSurfaceRatios: snapshot.layoutSurfaceRatios,
  };

  if (uiMode === "default") {
    patch.main = {
      sidebarOpen: snapshot.leftSidebarOpen,
      contextOpen: snapshot.rightPanelOpen,
    };
  } else if (uiMode === "docs") {
    patch.docs = {
      sidebarOpen: snapshot.leftSidebarOpen,
      binderBarOpen: snapshot.rightRailOpen,
      rightTab: snapshot.rightPanelTab,
    };
  } else if (uiMode === "editor") {
    patch.editor = {
      sidebarOpen: snapshot.leftSidebarOpen,
      binderRailOpen: snapshot.rightRailOpen,
      rightTab: snapshot.rightPanelTab,
    };
  } else if (uiMode === "scrivener") {
    patch.scrivener = {
      sidebarOpen: snapshot.leftSidebarOpen,
      inspectorOpen: snapshot.rightPanelOpen,
      sections: snapshot.scrivenerSections,
    };
  }

  return patch;
};
