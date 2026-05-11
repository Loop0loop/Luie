import { useEffect, useLayoutEffect, useRef } from "react";
import type { EditorUiMode } from "@shared/types";
import {
  normalizeLayoutSurfaceRatiosWithMigrations,
  type LayoutSurfaceId,
} from "@shared/constants/layoutSizing";
import { normalizeSidebarWidthsWithMigrations } from "@shared/constants/sidebarSizing";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import type { ResizablePanelData } from "@renderer/features/workspace/stores/uiStore";
import {
  sanitizePersistedDocsRightTab,
  sanitizeWorkspacePanels,
  type ProjectLayoutState,
  useProjectLayoutStore,
} from "@renderer/features/workspace/stores/projectLayoutStore";

let layoutRestoringDepth = 0;

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
  uiMode: EditorUiMode,
): void {
  const hasHydrated = useUIStore((state) => state.hasHydrated);
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);
  const isContextOpen = useUIStore((state) => state.isContextOpen);
  const isBinderBarOpen = useUIStore((state) => state.isBinderBarOpen);
  const docsRightTab = useUIStore((state) => state.docsRightTab);
  const scrivenerSidebarOpen = useUIStore((state) => state.scrivenerSidebarOpen);
  const scrivenerInspectorOpen = useUIStore((state) => state.scrivenerInspectorOpen);
  const scrivenerSections = useUIStore((state) => state.scrivenerSections);
  const sidebarWidths = useUIStore((state) => state.sidebarWidths);
  const layoutSurfaceRatios = useUIStore((state) => state.layoutSurfaceRatios);
  const panels = useUIStore((state) => state.panels);

  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);
  const setContextOpen = useUIStore((state) => state.setContextOpen);
  const setBinderBarOpen = useUIStore((state) => state.setBinderBarOpen);
  const setDocsRightTab = useUIStore((state) => state.setDocsRightTab);
  const setScrivenerSidebarOpen = useUIStore((state) => state.setScrivenerSidebarOpen);
  const setScrivenerInspectorOpen = useUIStore((state) => state.setScrivenerInspectorOpen);
  const setScrivenerSections = useUIStore((state) => state.setScrivenerSections);
  const setSidebarWidths = useUIStore((state) => state.setSidebarWidths);
  const setLayoutSurfaceRatios = useUIStore((state) => state.setLayoutSurfaceRatios);
  const setPanels = useUIStore((state) => state.setPanels);

  const projectLayoutHasHydrated = useProjectLayoutStore(
    (state) => state.hasHydrated,
  );
  const upsertProjectLayout = useProjectLayoutStore((state) => state.upsertProjectLayout);
  const getProjectLayout = useProjectLayoutStore((state) => state.getProjectLayout);

  const isRestoringRef = useRef(false);
  const restoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoreFrameRef = useRef<number | null>(null);
  const endLayoutRestoringRef = useRef<(() => void) | null>(null);

  const isSupportedMode =
    uiMode === "default" ||
    uiMode === "docs" ||
    uiMode === "editor" ||
    uiMode === "scrivener";

  const areScrivenerSectionsEqual = (
    left: ProjectLayoutState["scrivener"]["sections"],
    right: ProjectLayoutState["scrivener"]["sections"],
  ): boolean =>
    left.manuscript === right.manuscript &&
    left.characters === right.characters &&
    left.events === right.events &&
    left.factions === right.factions &&
    left.world === right.world &&
    left.scrap === right.scrap &&
    left.snapshots === right.snapshots &&
    left.analysis === right.analysis &&
    left.trash === right.trash;

  const areNumberRecordsEqual = (
    left: Record<string, number>,
    right: Record<string, number>,
  ): boolean => {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    for (const key of keys) {
      if (Math.abs((left[key] ?? 0) - (right[key] ?? 0)) >= 0.1) {
        return false;
      }
    }
    return true;
  };

  const serializeWorkspacePanels = (
    inputPanels: ResizablePanelData[],
  ): ResizablePanelData[] =>
    sanitizeWorkspacePanels(
      inputPanels.map((panel) => ({
        id: panel.id,
        content:
          panel.content.type === "research"
            ? {
                type: "research",
                id: panel.content.id,
                tab: panel.content.tab,
              }
            : panel.content.type === "editor"
              ? { type: "editor", id: panel.content.id }
              : panel.content.type === "export"
                ? { type: "export" }
                : { type: panel.content.type },
        size: panel.size,
      })),
    );

  const buildResearchPanelSizes = (
    saved: ProjectLayoutState["workspace"]["researchPanelSizes"],
    inputPanels: ResizablePanelData[],
  ): ProjectLayoutState["workspace"]["researchPanelSizes"] => {
    const next = { ...saved };
    for (const panel of inputPanels) {
      if (panel.content.type !== "research" || !panel.content.tab) continue;
      if (typeof panel.size !== "number" || !Number.isFinite(panel.size)) {
        continue;
      }
      next[panel.content.tab] = panel.size;
    }
    return next;
  };

  const areWorkspacePanelsEqual = (
    left: ResizablePanelData[],
    right: ResizablePanelData[],
  ): boolean => {
    if (left.length !== right.length) return false;
    return left.every((leftPanel, index) => {
      const rightPanel = right[index];
      return (
        rightPanel !== undefined &&
        leftPanel.id === rightPanel.id &&
        leftPanel.content.type === rightPanel.content.type &&
        leftPanel.content.id === rightPanel.content.id &&
        leftPanel.content.tab === rightPanel.content.tab &&
        Math.abs(leftPanel.size - rightPanel.size) < 0.1
      );
    });
  };

  const areResearchPanelSizesEqual = (
    left: ProjectLayoutState["workspace"]["researchPanelSizes"],
    right: ProjectLayoutState["workspace"]["researchPanelSizes"],
  ): boolean => {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    for (const key of keys) {
      if (Math.abs((left[key as keyof typeof left] ?? 0) - (right[key as keyof typeof right] ?? 0)) >= 0.1) {
        return false;
      }
    }
    return true;
  };

  useLayoutEffect(() => {
    if (!projectId || !hasHydrated || !projectLayoutHasHydrated || !isSupportedMode) {
      return;
    }

    const saved = getProjectLayout(projectId);
    isRestoringRef.current = true;
    endLayoutRestoringRef.current?.();
    endLayoutRestoringRef.current = beginLayoutRestoring();
    setSidebarWidths(saved.sidebarWidths);
    setLayoutSurfaceRatios(saved.layoutSurfaceRatios);
    setPanels(saved.workspace.panels);

    if (uiMode === "default") {
      setSidebarOpen(saved.main.sidebarOpen);
      setContextOpen(saved.main.contextOpen);
    } else if (uiMode === "docs") {
      setSidebarOpen(saved.docs.sidebarOpen);
      setBinderBarOpen(saved.docs.binderBarOpen);
      setDocsRightTab(sanitizePersistedDocsRightTab(saved.docs.rightTab));
    } else if (uiMode === "editor") {
      setSidebarOpen(saved.editor.sidebarOpen);
      setBinderBarOpen(saved.editor.binderRailOpen);
      setDocsRightTab(sanitizePersistedDocsRightTab(saved.editor.rightTab));
    } else if (uiMode === "scrivener") {
      setScrivenerSidebarOpen(saved.scrivener.sidebarOpen);
      setScrivenerInspectorOpen(saved.scrivener.inspectorOpen);
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
    projectId,
    setBinderBarOpen,
    setContextOpen,
    setDocsRightTab,
    setScrivenerInspectorOpen,
    setScrivenerSections,
    setScrivenerSidebarOpen,
    setLayoutSurfaceRatios,
    setPanels,
    setSidebarWidths,
    setSidebarOpen,
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
    const normalizedSidebarWidths = normalizeSidebarWidthsWithMigrations(sidebarWidths);
    const normalizedLayoutSurfaceRatios = normalizeLayoutSurfaceRatiosWithMigrations(
      layoutSurfaceRatios,
      normalizedSidebarWidths,
    );
    const workspacePanels = serializeWorkspacePanels(panels);
    const researchPanelSizes = buildResearchPanelSizes(
      saved.workspace.researchPanelSizes,
      workspacePanels,
    );
    const layoutPatch: Pick<
      ProjectLayoutState,
      "sidebarWidths" | "layoutSurfaceRatios" | "workspace"
    > = {
      sidebarWidths: normalizedSidebarWidths,
      layoutSurfaceRatios:
        normalizedLayoutSurfaceRatios as Record<LayoutSurfaceId, number>,
      workspace: {
        panels: workspacePanels,
        researchPanelSizes,
      },
    };
    const hasLayoutSizingChanged =
      !areNumberRecordsEqual(saved.sidebarWidths, normalizedSidebarWidths) ||
      !areNumberRecordsEqual(
        saved.layoutSurfaceRatios,
        normalizedLayoutSurfaceRatios,
      ) ||
      !areWorkspacePanelsEqual(saved.workspace.panels, workspacePanels) ||
      !areResearchPanelSizesEqual(
        saved.workspace.researchPanelSizes,
        researchPanelSizes,
      );

    if (uiMode === "default") {
      if (
        saved.main.sidebarOpen === isSidebarOpen &&
        saved.main.contextOpen === isContextOpen &&
        !hasLayoutSizingChanged
      ) {
        return;
      }
      upsertProjectLayout(projectId, {
        main: {
          sidebarOpen: isSidebarOpen,
          contextOpen: isContextOpen,
        },
        ...layoutPatch,
      });
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
      upsertProjectLayout(projectId, {
        docs: {
          sidebarOpen: isSidebarOpen,
          binderBarOpen: isBinderBarOpen,
          rightTab: sanitizedTab,
        },
        ...layoutPatch,
      });
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
      upsertProjectLayout(projectId, {
        editor: {
          sidebarOpen: isSidebarOpen,
          binderRailOpen: isBinderBarOpen,
          rightTab: sanitizedTab,
        },
        ...layoutPatch,
      });
      return;
    }

    if (uiMode === "scrivener") {
      if (
        saved.scrivener.sidebarOpen === scrivenerSidebarOpen &&
        saved.scrivener.inspectorOpen === scrivenerInspectorOpen &&
        areScrivenerSectionsEqual(saved.scrivener.sections, scrivenerSections) &&
        !hasLayoutSizingChanged
      ) {
        return;
      }
      upsertProjectLayout(projectId, {
        scrivener: {
          sidebarOpen: scrivenerSidebarOpen,
          inspectorOpen: scrivenerInspectorOpen,
          sections: scrivenerSections,
        },
        ...layoutPatch,
      });
    }
  }, [
    docsRightTab,
    isBinderBarOpen,
    isContextOpen,
    isSidebarOpen,
    layoutSurfaceRatios,
    panels,
    projectId,
    scrivenerInspectorOpen,
    scrivenerSections,
    scrivenerSidebarOpen,
    sidebarWidths,
    uiMode,
    hasHydrated,
    projectLayoutHasHydrated,
    isSupportedMode,
    getProjectLayout,
    upsertProjectLayout,
  ]);
}
