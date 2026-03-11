import { useCallback, useMemo } from "react";
import type { PanelSize } from "react-resizable-panels";
import { useShallow } from "zustand/react/shallow";
import {
  getEditorLayoutPanelSurface,
  getLayoutSurfaceConfig,
  getLayoutSurfaceDefaultRatio,
} from "@shared/constants/layoutSizing";
import { useLayoutSurfaceResizeCommit } from "@renderer/features/workspace/hooks/useLayoutSurfaceResizeCommit";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { BINDER_VALID_TABS, type BinderTab } from "./binderSidebar.shared";

export function useBinderSidebarState() {
  const {
    docsRightTab,
    rightPanelOpen,
    rightPanelActiveTab,
    isPanelRailOpen,
    isRightRailOpen,
    openRightPanelTab,
    closeRightPanel,
    setRegionOpen,
    layoutSurfaceRatios,
    setLayoutSurfaceRatio,
    setFocusedClosableTarget,
  } = useUIStore(
    useShallow((state) => ({
      docsRightTab: state.docsRightTab,
      rightPanelOpen: state.regions.rightPanel.open,
      rightPanelActiveTab: state.regions.rightPanel.activeTab,
      isPanelRailOpen: state.regions.rightRail.open,
      isRightRailOpen: state.regions.rightRail.open,
      openRightPanelTab: state.openRightPanelTab,
      closeRightPanel: state.closeRightPanel,
      setRegionOpen: state.setRegionOpen,
      layoutSurfaceRatios: state.layoutSurfaceRatios,
      setLayoutSurfaceRatio: state.setLayoutSurfaceRatio,
      setFocusedClosableTarget: state.setFocusedClosableTarget,
    })),
  );

  const activeTabCandidate = rightPanelOpen
    ? (docsRightTab ?? rightPanelActiveTab)
    : null;
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
      openRightPanelTab(tab);
    },
    [closeRightPanel, openRightPanelTab],
  );

  const resizeHandlers = {
    character: useLayoutSurfaceResizeCommit(
      getEditorLayoutPanelSurface("character"),
      setLayoutSurfaceRatio,
    ),
    world: useLayoutSurfaceResizeCommit(
      getEditorLayoutPanelSurface("world"),
      setLayoutSurfaceRatio,
    ),
    scrap: useLayoutSurfaceResizeCommit(
      getEditorLayoutPanelSurface("scrap"),
      setLayoutSurfaceRatio,
    ),
    analysis: useLayoutSurfaceResizeCommit(
      getEditorLayoutPanelSurface("analysis"),
      setLayoutSurfaceRatio,
    ),
    snapshot: useLayoutSurfaceResizeCommit(
      getEditorLayoutPanelSurface("snapshot"),
      setLayoutSurfaceRatio,
    ),
    trash: useLayoutSurfaceResizeCommit(
      getEditorLayoutPanelSurface("trash"),
      setLayoutSurfaceRatio,
    ),
  } satisfies Record<BinderTab, (panelSize: PanelSize) => void>;

  const handleRightTabClick = useCallback(
    (tab: BinderTab) => {
      setFocusedClosableTarget({ kind: "docs-tab" });
      setActiveRightTab(activeRightTab === tab ? null : tab);
    },
    [activeRightTab, setActiveRightTab, setFocusedClosableTarget],
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
    layoutSurfaceRatios[activePanelSurface] ??
    getLayoutSurfaceDefaultRatio(activePanelSurface);

  const widthConfig = getLayoutSurfaceConfig(activePanelSurface);

  const railState = useMemo(
    () => ({
      activeRightTab,
      isPanelRailOpen,
      isRightRailOpen,
      savedRatio,
      setActiveRightTab,
      setRegionOpen,
      widthConfig,
    }),
    [
      activeRightTab,
      isPanelRailOpen,
      isRightRailOpen,
      savedRatio,
      setActiveRightTab,
      setRegionOpen,
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
