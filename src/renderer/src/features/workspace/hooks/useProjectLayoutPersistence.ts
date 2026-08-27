import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { EditorUiMode } from "@shared/types";
import type { MainView } from "@renderer/features/workspace/stores/uiStore";
import {
  normalizeLayoutSurfaceRatiosWithMigrations,
  type LayoutSurfaceId,
} from "@renderer/shared/constants/layoutSizing";
import { normalizeSidebarWidthsWithMigrations } from "@renderer/shared/constants/sidebarSizing";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import {
  sanitizePersistedDocsRightTab,
  type ProjectLayoutPatch,
  useProjectLayoutStore,
} from "@renderer/features/workspace/stores/projectLayoutStore";
import { buildLegacyUiProjectLayoutPatch } from "@renderer/features/workspace/stores/projectLayout/legacyUiMigration";
import {
  areNumberRecordsEqual,
  areResearchPanelSizeEqual,
  areResearchPanelSizesEqual,
  areScrivenerSectionsEqual,
  areWorkspacePanelsEqual,
  buildResearchPanelSize,
  buildResearchPanelSizes,
  serializeWorkspacePanels,
} from "./useProjectLayoutPersistence.snapshot";

let layoutRestoringDepth = 0;

type ProjectLayoutPersistenceMode = EditorUiMode | "canvas";
type ProjectLayoutSizingPatch = Pick<
  ProjectLayoutPatch,
  "sidebarWidths" | "layoutSurfaceRatios" | "workspace"
>;

export const getProjectLayoutPersistenceMode = (
  uiMode: EditorUiMode,
  mainViewType: MainView["type"],
): ProjectLayoutPersistenceMode =>
  mainViewType === "canvas" ? "canvas" : uiMode;

export const appendProjectLayoutSizingPatch = <T extends object>(
  patch: T,
  sizingPatch: ProjectLayoutSizingPatch,
  hasLayoutSizingChanged: boolean,
): T | (T & ProjectLayoutSizingPatch) =>
  hasLayoutSizingChanged ? { ...patch, ...sizingPatch } : patch;

export const beginLayoutRestoring = (): (() => void) => {
  if (typeof document === "undefined") return () => {};
  layoutRestoringDepth += 1;
  document.documentElement.setAttribute("data-layout-restoring", "true");

  let active = true;
  return () => {
    if (!active) return;
    active = false;
    layoutRestoringDepth = Math.max(0, layoutRestoringDepth - 1);
    if (layoutRestoringDepth === 0) {
      document.documentElement.removeAttribute("data-layout-restoring");
    }
  };
};

export function useProjectLayoutPersistence(
  projectId: string | null | undefined,
  uiMode: ProjectLayoutPersistenceMode,
): void {
  const hasHydrated = useUIStore((state) => state.hasHydrated);
  const isSidebarOpen = useUIStore((state) => state.regions.leftSidebar.open);
  const isContextOpen = useUIStore((state) => state.regions.rightPanel.open);
  const isBinderBarOpen = useUIStore((state) => state.regions.rightRail.open);
  const docsRightTab = useUIStore(
    (state) => state.regions.rightPanel.activeTab,
  );
  const scrivenerSections = useUIStore((state) => state.scrivenerSections);
  const sidebarWidths = useUIStore((state) => state.sidebarWidths);
  const layoutSurfaceRatios = useUIStore((state) => state.layoutSurfaceRatios);
  const panels = useUIStore((state) => state.panels);

  const setRegionOpen = useUIStore((state) => state.setRegionOpen);
  const openRightPanelTab = useUIStore((state) => state.openRightPanelTab);
  const closeRightPanel = useUIStore((state) => state.closeRightPanel);
  const setScrivenerSections = useUIStore(
    (state) => state.setScrivenerSections,
  );
  const setSidebarWidths = useUIStore((state) => state.setSidebarWidths);
  const setLayoutSurfaceRatios = useUIStore(
    (state) => state.setLayoutSurfaceRatios,
  );
  const setPanels = useUIStore((state) => state.setPanels);

  const projectLayoutHasHydrated = useProjectLayoutStore(
    (state) => state.hasHydrated,
  );
  const hasProjectLayout = useProjectLayoutStore((state) =>
    projectId ? Boolean(state.byProject[projectId]) : false,
  );
  const upsertProjectLayout = useProjectLayoutStore(
    (state) => state.upsertProjectLayout,
  );
  const getProjectLayout = useProjectLayoutStore(
    (state) => state.getProjectLayout,
  );

  const isRestoringRef = useRef(false);
  const restoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoreFrameRef = useRef<number | null>(null);
  const endLayoutRestoringRef = useRef<(() => void) | null>(null);
  const [restoreEpoch, setRestoreEpoch] = useState(0);

  const isSupportedMode =
    uiMode === "default" ||
    uiMode === "docs" ||
    uiMode === "editor" ||
    uiMode === "scrivener" ||
    uiMode === "canvas";

  useLayoutEffect(() => {
    if (
      !projectId ||
      !hasHydrated ||
      !projectLayoutHasHydrated ||
      !isSupportedMode ||
      hasProjectLayout
    ) {
      return;
    }

    // uiStore v4의 전역 layout을 현재 프로젝트로 한 번만 승격한다.
    // 이후 uiStore persist에는 layout 필드를 쓰지 않아 두 저장소가 다시 갈라지지 않는다.
    upsertProjectLayout(
      projectId,
      buildLegacyUiProjectLayoutPatch(uiMode, {
        leftSidebarOpen: isSidebarOpen,
        rightPanelOpen: isContextOpen,
        rightRailOpen: isBinderBarOpen,
        rightPanelTab: sanitizePersistedDocsRightTab(docsRightTab),
        scrivenerSections,
        sidebarWidths: normalizeSidebarWidthsWithMigrations(sidebarWidths),
        layoutSurfaceRatios: normalizeLayoutSurfaceRatiosWithMigrations(
          layoutSurfaceRatios,
          sidebarWidths,
        ) as Record<LayoutSurfaceId, number>,
      }),
    );
  }, [
    docsRightTab,
    hasHydrated,
    hasProjectLayout,
    isBinderBarOpen,
    isContextOpen,
    isSidebarOpen,
    isSupportedMode,
    layoutSurfaceRatios,
    projectId,
    projectLayoutHasHydrated,
    scrivenerSections,
    sidebarWidths,
    uiMode,
    upsertProjectLayout,
  ]);

  useLayoutEffect(() => {
    if (
      !projectId ||
      !hasHydrated ||
      !projectLayoutHasHydrated ||
      !isSupportedMode ||
      !hasProjectLayout
    ) {
      return;
    }

    const saved = getProjectLayout(projectId);
    isRestoringRef.current = true;
    endLayoutRestoringRef.current?.();
    endLayoutRestoringRef.current = beginLayoutRestoring();
    setSidebarWidths(saved.sidebarWidths);
    setLayoutSurfaceRatios(saved.layoutSurfaceRatios);
    setPanels(
      uiMode === "default"
        ? saved.workspace.byLayout.default.panels
        : saved.workspace.panels,
    );

    const restoreTab = (
      savedTab: ReturnType<typeof sanitizePersistedDocsRightTab>,
    ) => {
      if (savedTab !== null) {
        openRightPanelTab(savedTab);
      } else {
        closeRightPanel();
      }
    };

    if (uiMode === "default") {
      setRegionOpen("leftSidebar", saved.main.sidebarOpen);
      setRegionOpen("rightPanel", saved.main.contextOpen);
    } else if (uiMode === "docs") {
      setRegionOpen("leftSidebar", saved.docs.sidebarOpen);
      setRegionOpen("rightRail", saved.docs.binderBarOpen);
      restoreTab(sanitizePersistedDocsRightTab(saved.docs.rightTab));
    } else if (uiMode === "editor") {
      setRegionOpen("leftSidebar", saved.editor.sidebarOpen ?? false);
      setRegionOpen("rightRail", saved.editor.binderRailOpen ?? false);
      restoreTab(sanitizePersistedDocsRightTab(saved.editor.rightTab));
    } else if (uiMode === "scrivener") {
      setRegionOpen("leftSidebar", saved.scrivener.sidebarOpen);
      setRegionOpen("rightPanel", saved.scrivener.inspectorOpen);
      setScrivenerSections(saved.scrivener.sections);
    }

    if (restoreTimerRef.current) {
      clearTimeout(restoreTimerRef.current);
    }
    if (restoreFrameRef.current !== null) {
      cancelAnimationFrame(restoreFrameRef.current);
      restoreFrameRef.current = null;
    }
    restoreTimerRef.current = setTimeout(() => {
      isRestoringRef.current = false;
      restoreTimerRef.current = null;
      setRestoreEpoch((current) => current + 1);
      restoreFrameRef.current = requestAnimationFrame(() => {
        restoreFrameRef.current = requestAnimationFrame(() => {
          restoreFrameRef.current = null;
          endLayoutRestoringRef.current?.();
          endLayoutRestoringRef.current = null;
        });
      });
    }, 80);

    return () => {
      if (restoreTimerRef.current) {
        clearTimeout(restoreTimerRef.current);
        restoreTimerRef.current = null;
      }
      if (restoreFrameRef.current !== null) {
        cancelAnimationFrame(restoreFrameRef.current);
        restoreFrameRef.current = null;
      }
      endLayoutRestoringRef.current?.();
      endLayoutRestoringRef.current = null;
    };
  }, [
    getProjectLayout,
    hasProjectLayout,
    projectId,
    setRegionOpen,
    openRightPanelTab,
    closeRightPanel,
    setScrivenerSections,
    setLayoutSurfaceRatios,
    setPanels,
    setSidebarWidths,
    uiMode,
    hasHydrated,
    projectLayoutHasHydrated,
    isSupportedMode,
  ]);

  useEffect(() => {
    if (
      !projectId ||
      !hasHydrated ||
      !projectLayoutHasHydrated ||
      !isSupportedMode ||
      isRestoringRef.current
    ) {
      return;
    }

    const saved = getProjectLayout(projectId);
    const normalizedSidebarWidths =
      normalizeSidebarWidthsWithMigrations(sidebarWidths);
    const normalizedLayoutSurfaceRatios =
      normalizeLayoutSurfaceRatiosWithMigrations(
        layoutSurfaceRatios,
        normalizedSidebarWidths,
      );
    const savedWorkspace =
      uiMode === "default" ? saved.workspace.byLayout.default : saved.workspace;
    const workspacePanels = serializeWorkspacePanels(panels);
    const isDefaultLayout = uiMode === "default";
    const researchPanelSize = isDefaultLayout
      ? buildResearchPanelSize(
          saved.workspace.byLayout.default.researchPanelSize,
          workspacePanels,
        )
      : undefined;
    const researchPanelSizes = isDefaultLayout
      ? savedWorkspace.researchPanelSizes
      : buildResearchPanelSizes(
          savedWorkspace.researchPanelSizes,
          workspacePanels,
        );
    const workspacePatch: NonNullable<ProjectLayoutPatch["workspace"]> =
      isDefaultLayout
        ? {
            byLayout: {
              default: {
                panels: workspacePanels,
                researchPanelSize,
              },
            },
          }
        : {
            panels: workspacePanels,
            researchPanelSizes,
          };
    const layoutPatch: ProjectLayoutSizingPatch = {
      sidebarWidths: normalizedSidebarWidths,
      layoutSurfaceRatios: normalizedLayoutSurfaceRatios as Record<
        LayoutSurfaceId,
        number
      >,
      workspace: workspacePatch,
    };
    const hasLayoutSizingChanged =
      !areNumberRecordsEqual(saved.sidebarWidths, normalizedSidebarWidths) ||
      !areNumberRecordsEqual(
        saved.layoutSurfaceRatios,
        normalizedLayoutSurfaceRatios,
      ) ||
      !areWorkspacePanelsEqual(savedWorkspace.panels, workspacePanels) ||
      (isDefaultLayout
        ? !areResearchPanelSizeEqual(
            saved.workspace.byLayout.default.researchPanelSize,
            researchPanelSize,
          )
        : !areResearchPanelSizesEqual(
            savedWorkspace.researchPanelSizes,
            researchPanelSizes,
          ));

    if (uiMode === "default") {
      if (
        saved.main.sidebarOpen === isSidebarOpen &&
        saved.main.contextOpen === isContextOpen &&
        !hasLayoutSizingChanged
      ) {
        return;
      }
      upsertProjectLayout(
        projectId,
        appendProjectLayoutSizingPatch(
          {
            main: {
              sidebarOpen: isSidebarOpen,
              contextOpen: isContextOpen,
            },
          },
          layoutPatch,
          hasLayoutSizingChanged,
        ),
      );
      return;
    }

    if (uiMode === "docs") {
      const sanitizedTab = sanitizePersistedDocsRightTab(docsRightTab);
      if (
        saved.docs.sidebarOpen === isSidebarOpen &&
        saved.docs.binderBarOpen === isBinderBarOpen &&
        saved.docs.rightTab === sanitizedTab &&
        !hasLayoutSizingChanged
      ) {
        return;
      }
      upsertProjectLayout(
        projectId,
        appendProjectLayoutSizingPatch(
          {
            docs: {
              sidebarOpen: isSidebarOpen,
              binderBarOpen: isBinderBarOpen,
              rightTab: sanitizedTab,
            },
          },
          layoutPatch,
          hasLayoutSizingChanged,
        ),
      );
      return;
    }

    if (uiMode === "editor") {
      const sanitizedTab = sanitizePersistedDocsRightTab(docsRightTab);
      if (
        saved.editor.sidebarOpen === isSidebarOpen &&
        saved.editor.binderRailOpen === isBinderBarOpen &&
        saved.editor.rightTab === sanitizedTab &&
        !hasLayoutSizingChanged
      ) {
        return;
      }
      upsertProjectLayout(
        projectId,
        appendProjectLayoutSizingPatch(
          {
            editor: {
              sidebarOpen: isSidebarOpen,
              binderRailOpen: isBinderBarOpen,
              rightTab: sanitizedTab,
            },
          },
          layoutPatch,
          hasLayoutSizingChanged,
        ),
      );
      return;
    }

    if (uiMode === "scrivener") {
      if (
        saved.scrivener.sidebarOpen === isSidebarOpen &&
        saved.scrivener.inspectorOpen === isContextOpen &&
        areScrivenerSectionsEqual(
          saved.scrivener.sections,
          scrivenerSections,
        ) &&
        !hasLayoutSizingChanged
      ) {
        return;
      }
      upsertProjectLayout(
        projectId,
        appendProjectLayoutSizingPatch(
          {
            scrivener: {
              sidebarOpen: isSidebarOpen,
              inspectorOpen: isContextOpen,
              sections: scrivenerSections,
            },
          },
          layoutPatch,
          hasLayoutSizingChanged,
        ),
      );
      return;
    }

    if (uiMode === "canvas" && hasLayoutSizingChanged) {
      // Canvas는 MainLayout surface를 재사용하지만, 이전 편집 모드의 열림 상태를 덮어쓰면 안 된다.
      upsertProjectLayout(projectId, layoutPatch);
    }
  }, [
    docsRightTab,
    isBinderBarOpen,
    isContextOpen,
    isSidebarOpen,
    layoutSurfaceRatios,
    panels,
    projectId,
    scrivenerSections,
    sidebarWidths,
    uiMode,
    hasHydrated,
    projectLayoutHasHydrated,
    isSupportedMode,
    restoreEpoch,
    getProjectLayout,
    upsertProjectLayout,
  ]);
}
