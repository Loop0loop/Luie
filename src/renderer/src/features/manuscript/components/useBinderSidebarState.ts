import { useCallback, useMemo } from "react";
import type { PanelSize } from "react-resizable-panels";
import { useShallow } from "zustand/react/shallow";
import {
  getEditorLayoutPanelSurface,
  getLayoutSurfaceConfig,
  getLayoutSurfaceDefaultRatio,
  type LayoutSurfaceId,
} from "@renderer/shared/constants/layoutSizing";
import { useLayoutSurfaceResizeCommit } from "@renderer/features/workspace/hooks/useLayoutSurfaceResizeCommit";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { useProjectLayoutStore } from "@renderer/features/workspace/stores/projectLayoutStore";
import { BINDER_VALID_TABS, type BinderTab } from "./binderSidebar.shared";
import {
  openEditorBinderTab,
  setEditorBinderRailOpen,
} from "@renderer/features/workspace/services/layoutRegionActions";

export function useBinderSidebarState(projectId?: string | null) {
  const {
    rightPanelOpen,
    rightPanelActiveTab,
    isPanelRailOpen,
    isRightRailOpen,
    closeRightPanel,
    layoutSurfaceRatios,
    setLayoutSurfaceRatio,
    setFocusedClosableTarget,
    uiHasHydrated,
  } = useUIStore(
    useShallow((state) => ({
      rightPanelOpen: state.regions.rightPanel.open,
      rightPanelActiveTab: state.regions.rightPanel.activeTab,
      isPanelRailOpen: state.regions.rightRail.open,
      isRightRailOpen: state.regions.rightRail.open,
      closeRightPanel: state.closeRightPanel,
      layoutSurfaceRatios: state.layoutSurfaceRatios,
      setLayoutSurfaceRatio: state.setLayoutSurfaceRatio,
      setFocusedClosableTarget: state.setFocusedClosableTarget,
      uiHasHydrated: state.hasHydrated,
    })),
  );
  const projectLayoutHasHydrated = useProjectLayoutStore(
    (state) => state.hasHydrated,
  );
  const upsertProjectLayout = useProjectLayoutStore(
    (state) => state.upsertProjectLayout,
  );

  const persistLayoutSurfaceRatio = useCallback(
    (surface: LayoutSurfaceId, ratio: number) => {
      if (!projectId || !uiHasHydrated || !projectLayoutHasHydrated) return;
      upsertProjectLayout(projectId, {
        layoutSurfaceRatios: {
          [surface]: ratio,
        } as Record<LayoutSurfaceId, number>,
      });
    },
    [projectId, projectLayoutHasHydrated, uiHasHydrated, upsertProjectLayout],
  );

  const activeTabCandidate = rightPanelOpen ? rightPanelActiveTab : null;
  const activeRightTab: BinderTab | null =
    activeTabCandidate && BINDER_VALID_TABS.includes(activeTabCandidate as BinderTab)
      ? (activeTabCandidate as BinderTab)
      : null;

  const setActiveRightTab = useCallback(
    (tab: BinderTab | null) => {
      if (tab === null) {
        closeRightPanel();
        return;
      }
      openEditorBinderTab(tab);
    },
    [closeRightPanel],
  );

  const setRailOpen = useCallback(
    (open: boolean) => {
      setEditorBinderRailOpen(open);
    },
    [],
  );

  const resizeHandlers = {
    character: useLayoutSurfaceResizeCommit(
      getEditorLayoutPanelSurface("character"),
      setLayoutSurfaceRatio,
      { onCommit: persistLayoutSurfaceRatio },
    ),
    event: useLayoutSurfaceResizeCommit(
      getEditorLayoutPanelSurface("event"),
      setLayoutSurfaceRatio,
      { onCommit: persistLayoutSurfaceRatio },
    ),
    faction: useLayoutSurfaceResizeCommit(
      getEditorLayoutPanelSurface("faction"),
      setLayoutSurfaceRatio,
      { onCommit: persistLayoutSurfaceRatio },
    ),
    world: useLayoutSurfaceResizeCommit(
      getEditorLayoutPanelSurface("world"),
      setLayoutSurfaceRatio,
      { onCommit: persistLayoutSurfaceRatio },
    ),
    scrap: useLayoutSurfaceResizeCommit(
      getEditorLayoutPanelSurface("scrap"),
      setLayoutSurfaceRatio,
      { onCommit: persistLayoutSurfaceRatio },
    ),
    analysis: useLayoutSurfaceResizeCommit(
      getEditorLayoutPanelSurface("analysis"),
      setLayoutSurfaceRatio,
      { onCommit: persistLayoutSurfaceRatio },
    ),
    snapshot: useLayoutSurfaceResizeCommit(
      getEditorLayoutPanelSurface("snapshot"),
      setLayoutSurfaceRatio,
      { onCommit: persistLayoutSurfaceRatio },
    ),
    trash: useLayoutSurfaceResizeCommit(
      getEditorLayoutPanelSurface("trash"),
      setLayoutSurfaceRatio,
      { onCommit: persistLayoutSurfaceRatio },
    ),
    canvas: useLayoutSurfaceResizeCommit(
      getEditorLayoutPanelSurface("canvas"),
      setLayoutSurfaceRatio,
      { onCommit: persistLayoutSurfaceRatio },
    ),
  } satisfies Record<BinderTab, (panelSize: PanelSize) => void>;

  const handleRightTabClick = useCallback(
    (tab: BinderTab) => {
      setFocusedClosableTarget({ kind: "docs-tab" });
      if (!isPanelRailOpen && activeRightTab === tab) {
        setRailOpen(true);
        return;
      }
      setActiveRightTab(activeRightTab === tab ? null : tab);
    },
    [activeRightTab, isPanelRailOpen, setActiveRightTab, setFocusedClosableTarget, setRailOpen],
  );

  const handleResize = useCallback(
    (panelSize: PanelSize) => {
      if (!activeRightTab) return;
      resizeHandlers[activeRightTab](panelSize);
    },
    [activeRightTab, resizeHandlers],
  );

  const activePanelSurface = activeRightTab
    ? getEditorLayoutPanelSurface(activeRightTab)
    : getEditorLayoutPanelSurface("character");
  const savedRatio =
    layoutSurfaceRatios[activePanelSurface] ||
    getLayoutSurfaceDefaultRatio(activePanelSurface);

  const widthConfig = getLayoutSurfaceConfig(activePanelSurface);

  const railState = useMemo(
    () => ({
      activeRightTab,
      isPanelRailOpen,
      isRightRailOpen,
      savedRatio,
      setActiveRightTab,
      setRailOpen,
      widthConfig,
    }),
    [
      activeRightTab,
      isPanelRailOpen,
      isRightRailOpen,
      savedRatio,
      setActiveRightTab,
      setRailOpen,
      widthConfig,
    ],
  );

  return {
    ...railState,
    handleResize,
    handleRightTabClick,
    setFocusedClosableTarget,
  };
}
