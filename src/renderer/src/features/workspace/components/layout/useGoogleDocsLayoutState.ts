import { useCallback, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { openDocsRightTab } from "@renderer/features/workspace/services/docsPanelService";
import {
  getDocsLayoutPanelSurface,
  getLayoutSurfaceConfig,
  getLayoutSurfaceDefaultRatio,
  type DocsLayoutPanelTab,
} from "@shared/constants/layoutSizing";
import type { LayoutPersistEntry } from "@renderer/features/workspace/hooks/useLayoutPersist";
import { useLayoutPersist } from "@renderer/features/workspace/hooks/useLayoutPersist";
import {
  EDITOR_RULER_DEFAULT_MARGIN_LEFT_PX,
  EDITOR_RULER_DEFAULT_MARGIN_RIGHT_PX,
} from "@shared/constants/configs";
import type { DocsPageMargins } from "./googleDocsLayout.types";

export function useGoogleDocsLayoutState() {
  const [trashRefreshKey, setTrashRefreshKey] = useState(0);
  const [pageMargins, setPageMargins] = useState<DocsPageMargins>({
    left: EDITOR_RULER_DEFAULT_MARGIN_LEFT_PX,
    right: EDITOR_RULER_DEFAULT_MARGIN_RIGHT_PX,
    firstLineIndent: 0,
  });

  const {
    isSidebarOpen,
    activeRightTab,
    isPanelRailOpen,
    layoutSurfaceRatios,
    setRegionOpen,
    closeRightPanel,
    setPanelRailOpen,
    setFocusedClosableTarget,
  } = useUIStore(
    useShallow((state) => ({
      isSidebarOpen: state.regions.leftSidebar.open,
      activeRightTab: state.regions.rightPanel.open
        ? state.docsRightTab ?? state.regions.rightPanel.activeTab
        : null,
      isPanelRailOpen: state.regions.rightRail.open,
      layoutSurfaceRatios: state.layoutSurfaceRatios,
      setRegionOpen: state.setRegionOpen,
      closeRightPanel: state.closeRightPanel,
      setPanelRailOpen: state.setBinderBarOpen,
      setFocusedClosableTarget: state.setFocusedClosableTarget,
    })),
  );

  const handleRightTabClick = useCallback(
    (tab: DocsLayoutPanelTab) => {
      if (activeRightTab === tab) {
        closeRightPanel();
        return;
      }

      setFocusedClosableTarget({ kind: "docs-tab" });
      openDocsRightTab(tab);
    },
    [activeRightTab, closeRightPanel, setFocusedClosableTarget],
  );

  const docsSidebarConfig = getLayoutSurfaceConfig("docs.sidebar");
  const layoutEntries = useMemo<LayoutPersistEntry[]>(() => {
    const entries: LayoutPersistEntry[] = [
      { id: "left-sidebar", surface: "docs.sidebar" },
    ];

    if (activeRightTab) {
      entries.push({
        id: `right-context-panel-${activeRightTab}`,
        surface: getDocsLayoutPanelSurface(activeRightTab),
      });
    }

    return entries;
  }, [activeRightTab]);
  const onLayoutChanged = useLayoutPersist(layoutEntries);

  const docsSidebarRatio =
    layoutSurfaceRatios["docs.sidebar"] ??
    getLayoutSurfaceDefaultRatio("docs.sidebar");
  const activePanelSurface = activeRightTab
    ? getDocsLayoutPanelSurface(activeRightTab)
    : null;
  const rightPanelRatio = activePanelSurface
    ? layoutSurfaceRatios[activePanelSurface] ??
      getLayoutSurfaceDefaultRatio(activePanelSurface)
    : null;
  const rightPanelConfig = activePanelSurface
    ? getLayoutSurfaceConfig(activePanelSurface)
    : null;

  return {
    activePanelSurface,
    activeRightTab,
    closeRightPanel,
    docsSidebarConfig,
    docsSidebarRatio,
    handleRightTabClick,
    isPanelRailOpen,
    isSidebarOpen,
    onLayoutChanged,
    pageMargins,
    rightPanelConfig,
    rightPanelRatio,
    setFocusedClosableTarget,
    setPageMargins,
    setPanelRailOpen,
    setRegionOpen,
    setTrashRefreshKey,
    trashRefreshKey,
  };
}
