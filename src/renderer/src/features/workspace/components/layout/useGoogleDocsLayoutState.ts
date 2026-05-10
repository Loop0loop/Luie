import { useCallback, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import {
  sanitizePersistedDocsRightTab,
  useProjectLayoutStore,
} from "@renderer/features/workspace/stores/projectLayoutStore";
import { openDocsRightTab } from "@renderer/features/workspace/services/docsPanelService";
import type { DocsLayoutPanelTab } from "@shared/constants/layoutSizing";
import { useLayoutPersist } from "@renderer/features/workspace/hooks/useLayoutPersist";
import {
  EDITOR_RULER_DEFAULT_MARGIN_LEFT_PX,
  EDITOR_RULER_DEFAULT_MARGIN_RIGHT_PX,
} from "@shared/constants/configs";
import type { DocsPageMargins } from "./googleDocsLayout.types";
import {
  buildDocsLayoutPersistEntries,
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
    setRegionOpen,
    closeRightPanel,
    setBinderBarOpen,
    setFocusedClosableTarget,
    uiHasHydrated,
  } = useUIStore(
    useShallow((state) => ({
      isSidebarOpen: state.regions.leftSidebar.open,
      docsRightTab: state.docsRightTab,
      rightPanelActiveTab: state.regions.rightPanel.activeTab,
      isRightPanelOpen: state.regions.rightPanel.open,
      isPanelRailOpen: state.regions.rightRail.open,
      layoutSurfaceRatios: state.layoutSurfaceRatios,
      setRegionOpen: state.setRegionOpen,
      closeRightPanel: state.closeRightPanel,
      setBinderBarOpen: state.setBinderBarOpen,
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
    () => buildDocsLayoutPersistEntries(activeRightTab),
    [activeRightTab],
  );
  const onLayoutChanged = useLayoutPersist(layoutEntries, { projectId });

  const setPanelRailOpen = useCallback(
    (open: boolean) => {
      setBinderBarOpen(open);
      if (!projectId || !uiHasHydrated || !projectLayoutHasHydrated) return;
      upsertProjectLayout(projectId, {
        docs: {
          sidebarOpen: isSidebarOpen,
          binderBarOpen: open,
          rightTab: sanitizePersistedDocsRightTab(activeRightTab),
        },
      });
    },
    [
      activeRightTab,
      isSidebarOpen,
      projectId,
      projectLayoutHasHydrated,
      setBinderBarOpen,
      uiHasHydrated,
      upsertProjectLayout,
    ],
  );

  const setDocsSidebarOpen = useCallback(
    (open: boolean) => {
      setRegionOpen("leftSidebar", open);
      if (!projectId || !uiHasHydrated || !projectLayoutHasHydrated) return;
      upsertProjectLayout(projectId, {
        docs: {
          sidebarOpen: open,
          binderBarOpen: isPanelRailOpen,
          rightTab: sanitizePersistedDocsRightTab(activeRightTab),
        },
      });
    },
    [
      activeRightTab,
      isPanelRailOpen,
      projectId,
      projectLayoutHasHydrated,
      setRegionOpen,
      uiHasHydrated,
      upsertProjectLayout,
    ],
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
    onLayoutChanged,
    pageMargins,
    rightPanelConfig,
    rightPanelRatio,
    setDocsSidebarOpen,
    setFocusedClosableTarget,
    setPageMargins,
    setPanelRailOpen,
    setRegionOpen,
    setTrashRefreshKey,
    trashRefreshKey,
  };
}
