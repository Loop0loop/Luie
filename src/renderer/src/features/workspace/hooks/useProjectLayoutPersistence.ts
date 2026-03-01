import { useEffect, useRef } from "react";
import type { EditorUiMode } from "@shared/types";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import {
  sanitizePersistedDocsRightTab,
  type ProjectLayoutState,
  useProjectLayoutStore,
} from "@renderer/features/workspace/stores/projectLayoutStore";

const isDocsLikeMode = (uiMode: EditorUiMode): boolean =>
  uiMode === "docs" || uiMode === "editor";

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

  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);
  const setContextOpen = useUIStore((state) => state.setContextOpen);
  const setBinderBarOpen = useUIStore((state) => state.setBinderBarOpen);
  const setDocsRightTab = useUIStore((state) => state.setDocsRightTab);
  const setScrivenerSidebarOpen = useUIStore((state) => state.setScrivenerSidebarOpen);
  const setScrivenerInspectorOpen = useUIStore((state) => state.setScrivenerInspectorOpen);
  const setScrivenerSections = useUIStore((state) => state.setScrivenerSections);

  const upsertProjectLayout = useProjectLayoutStore((state) => state.upsertProjectLayout);
  const getProjectLayout = useProjectLayoutStore((state) => state.getProjectLayout);

  const isRestoringRef = useRef(false);
  const restoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSupportedMode =
    uiMode === "default" || isDocsLikeMode(uiMode) || uiMode === "scrivener";

  const areScrivenerSectionsEqual = (
    left: ProjectLayoutState["scrivener"]["sections"],
    right: ProjectLayoutState["scrivener"]["sections"],
  ): boolean =>
    left.manuscript === right.manuscript &&
    left.characters === right.characters &&
    left.world === right.world &&
    left.scrap === right.scrap &&
    left.snapshots === right.snapshots &&
    left.analysis === right.analysis &&
    left.trash === right.trash;

  useEffect(() => {
    if (!projectId || !hasHydrated || !isSupportedMode) return;

    const saved = getProjectLayout(projectId);
    isRestoringRef.current = true;

    if (uiMode === "default") {
      setSidebarOpen(saved.main.sidebarOpen);
      setContextOpen(saved.main.contextOpen);
    } else if (isDocsLikeMode(uiMode)) {
      setSidebarOpen(saved.docs.sidebarOpen);
      setBinderBarOpen(saved.docs.binderBarOpen);
      setDocsRightTab(sanitizePersistedDocsRightTab(saved.docs.rightTab));
    } else if (uiMode === "scrivener") {
      setScrivenerSidebarOpen(saved.scrivener.sidebarOpen);
      setScrivenerInspectorOpen(saved.scrivener.inspectorOpen);
      setScrivenerSections(saved.scrivener.sections);
    }

    if (restoreTimerRef.current) {
      clearTimeout(restoreTimerRef.current);
    }
    restoreTimerRef.current = setTimeout(() => {
      isRestoringRef.current = false;
      restoreTimerRef.current = null;
    }, 0);

    return () => {
      if (restoreTimerRef.current) {
        clearTimeout(restoreTimerRef.current);
        restoreTimerRef.current = null;
      }
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
    setSidebarOpen,
    uiMode,
    hasHydrated,
    isSupportedMode,
  ]);

  useEffect(() => {
    if (!projectId || !hasHydrated || !isSupportedMode || isRestoringRef.current) return;

    const saved = getProjectLayout(projectId);

    if (uiMode === "default") {
      if (
        saved.main.sidebarOpen === isSidebarOpen &&
        saved.main.contextOpen === isContextOpen
      ) {
        return;
      }
      upsertProjectLayout(projectId, {
        main: {
          sidebarOpen: isSidebarOpen,
          contextOpen: isContextOpen,
        },
      });
      return;
    }

    if (isDocsLikeMode(uiMode)) {
      const sanitizedTab = sanitizePersistedDocsRightTab(docsRightTab);
      if (
        saved.docs.sidebarOpen === isSidebarOpen &&
        saved.docs.binderBarOpen === isBinderBarOpen &&
        saved.docs.rightTab === sanitizedTab
      ) {
        return;
      }
      upsertProjectLayout(projectId, {
        docs: {
          sidebarOpen: isSidebarOpen,
          binderBarOpen: isBinderBarOpen,
          rightTab: sanitizedTab,
        },
      });
      return;
    }

    if (uiMode === "scrivener") {
      if (
        saved.scrivener.sidebarOpen === scrivenerSidebarOpen &&
        saved.scrivener.inspectorOpen === scrivenerInspectorOpen &&
        areScrivenerSectionsEqual(saved.scrivener.sections, scrivenerSections)
      ) {
        return;
      }
      upsertProjectLayout(projectId, {
        scrivener: {
          sidebarOpen: scrivenerSidebarOpen,
          inspectorOpen: scrivenerInspectorOpen,
          sections: scrivenerSections,
        },
      });
    }
  }, [
    docsRightTab,
    isBinderBarOpen,
    isContextOpen,
    isSidebarOpen,
    projectId,
    scrivenerInspectorOpen,
    scrivenerSections,
    scrivenerSidebarOpen,
    uiMode,
    hasHydrated,
    isSupportedMode,
    getProjectLayout,
    upsertProjectLayout,
  ]);
}
