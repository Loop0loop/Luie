import { useCallback, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { openDocsRightTab } from "@renderer/features/workspace/services/docsPanelService";
import {
  setDocsBinderRailOpen,
  setDocsSidebarOpen as setDocsSidebarRegionOpen,
} from "@renderer/features/workspace/services/layoutRegionActions";
import type { DocsLayoutPanelTab } from "@renderer/shared/constants/layoutSizing";
import { useLayoutPersist } from "@renderer/features/workspace/hooks/useLayoutPersist";
import {
  EDITOR_RULER_DEFAULT_MARGIN_LEFT_PX,
  EDITOR_RULER_DEFAULT_MARGIN_RIGHT_PX,
} from "@renderer/shared/constants/editorLayout";
import type { DocsPageMargins } from "./googleDocsLayout.types";
import {
  buildDocsRightLayoutPersistEntries,
  buildDocsSidebarLayoutPersistEntries,
  getActiveDocsRightTab,
  getDocsLayoutSurfaceState,
} from "../../utils/docsLayoutModel";

export function useGoogleDocsLayoutState(projectId?: string | null) {
  const [trashRefreshKey, setTrashRefreshKey] = useState(0);
  const [pageMargins, setPageMargins] = useState<DocsPageMargins>({
    left: EDITOR_RULER_DEFAULT_MARGIN_LEFT_PX,
    right: EDITOR_RULER_DEFAULT_MARGIN_RIGHT_PX,
    firstLineIndent: 0,
  });

  const {
    isSidebarOpen,
    docsRightTab,
    rightPanelActiveTab,
    isRightPanelOpen,
    isPanelRailOpen,
    layoutSurfaceRatios,
    closeRightPanel,
    setFocusedClosableTarget,
  } = useUIStore(
    useShallow((state) => ({
      isSidebarOpen: state.regions.leftSidebar.open,
      docsRightTab: state.regions.rightPanel.activeTab,
      rightPanelActiveTab: state.regions.rightPanel.activeTab,
      isRightPanelOpen: state.regions.rightPanel.open,
      isPanelRailOpen: state.regions.rightRail.open,
      layoutSurfaceRatios: state.layoutSurfaceRatios,
      closeRightPanel: state.closeRightPanel,
      setFocusedClosableTarget: state.setFocusedClosableTarget,
    })),
  );

  const activeRightTab = getActiveDocsRightTab(
    isRightPanelOpen,
    docsRightTab,
    rightPanelActiveTab,
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

  const layoutEntries = useMemo(
    () => buildDocsSidebarLayoutPersistEntries(),
    [],
  );
  const rightLayoutEntries = useMemo(
    () => buildDocsRightLayoutPersistEntries(activeRightTab),
    [activeRightTab],
  );
  const onSidebarLayoutChanged = useLayoutPersist(layoutEntries, { projectId });
  const onRightLayoutChanged = useLayoutPersist(rightLayoutEntries, { projectId });

  const setPanelRailOpen = useCallback(
    (open: boolean) => {
      setDocsBinderRailOpen(open);
    },
    [],
  );

  const setDocsSidebarOpen = useCallback(
    (open: boolean) => {
      setDocsSidebarRegionOpen(open);
    },
    [],
  );

  const {
    activePanelSurface,
    docsSidebarConfig,
    docsSidebarRatio,
    rightPanelConfig,
    rightPanelRatio,
  } = getDocsLayoutSurfaceState(layoutSurfaceRatios, activeRightTab);

  return {
    activePanelSurface,
    activeRightTab,
    closeRightPanel,
    docsSidebarConfig,
    docsSidebarRatio,
    handleRightTabClick,
    isPanelRailOpen,
    isSidebarOpen,
    onRightLayoutChanged,
    onSidebarLayoutChanged,
    pageMargins,
    rightPanelConfig,
    rightPanelRatio,
    setDocsSidebarOpen,
    setFocusedClosableTarget,
    setPageMargins,
    setPanelRailOpen,
    setTrashRefreshKey,
    trashRefreshKey,
  };
}
