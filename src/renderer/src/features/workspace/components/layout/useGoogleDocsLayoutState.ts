import { useCallback, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { openDocsRightTab } from "@renderer/features/workspace/services/docsPanelService";
import { setDocsSidebarOpen as setDocsSidebarRegionOpen } from "@renderer/features/workspace/services/layoutRegionActions";
import type { DocsLayoutPanelTab } from "@renderer/shared/constants/layoutSizing";
import { useLayoutPersist } from "@renderer/features/workspace/hooks/useLayoutPersist";
import { useSidebarResizeCommit } from "@renderer/features/workspace/hooks/useSidebarResizeCommit";
import {
  getSidebarWidthConfig,
  normalizeSidebarWidthInput,
} from "@renderer/shared/constants/sidebarSizing";
import {
  EDITOR_RULER_DEFAULT_MARGIN_LEFT_PX,
  EDITOR_RULER_DEFAULT_MARGIN_RIGHT_PX,
} from "@renderer/shared/constants/editorLayout";
import type { DocsPageMargins } from "./googleDocsLayout.types";
import {
  buildDocsRightLayoutPersistEntries,
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
    layoutSurfaceRatios,
    closeRightPanel,
    setFocusedClosableTarget,
  } = useUIStore(
    useShallow((state) => ({
      isSidebarOpen: state.regions.leftSidebar.open,
      docsRightTab: state.regions.rightPanel.activeTab,
      rightPanelActiveTab: state.regions.rightPanel.activeTab,
      isRightPanelOpen: state.regions.rightPanel.open,
      layoutSurfaceRatios: state.layoutSurfaceRatios,
      closeRightPanel: state.closeRightPanel,
      setFocusedClosableTarget: state.setFocusedClosableTarget,
    })),
  );

  // NOTE: 사이드바 폭은 px로 저장한다. min/max가 px 상수(220/420)이므로 ratio로 저장하면 모니터
  // 폭에 따라 같은 값이 밴드를 벗어나 cap으로 클램프되고, 그 클램프 결과가 사용자 폭으로
  // 저장돼 고착됐다. 단위를 px 하나로 두면 그 왕복이 사라진다.
  const rawDocsSidebarWidthPx = useUIStore(
    (state) => state.sidebarWidths.docsBinder,
  );
  const setSidebarWidth = useUIStore((state) => state.setSidebarWidth);
  const docsSidebarWidthPx =
    normalizeSidebarWidthInput("docsBinder", rawDocsSidebarWidthPx) ??
    getSidebarWidthConfig("docsBinder").defaultPx;
  // NOTE: 이 controller가 "사용자 제스처로 만든 폭만 저장한다"는 규칙을 강제한다. 핸들에서
  // pointer/키보드 조작이 시작되지 않은 resize는 기준값만 갱신하고 저장하지 않으므로,
  // mount 시 클램프·복원·열기닫기 애니메이션이 저장 폭을 덮어쓸 수 없다.
  const sidebarResize = useSidebarResizeCommit("docsBinder", setSidebarWidth, {
    initialWidth: docsSidebarWidthPx,
  });

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

  const rightLayoutEntries = useMemo(
    () => buildDocsRightLayoutPersistEntries(activeRightTab),
    [activeRightTab],
  );
  const onRightLayoutChanged = useLayoutPersist(rightLayoutEntries, { projectId });

  const setDocsSidebarOpen = useCallback(
    (open: boolean) => {
      setDocsSidebarRegionOpen(open);
    },
    [],
  );

  const { activePanelSurface, rightPanelConfig, rightPanelRatio } =
    getDocsLayoutSurfaceState(layoutSurfaceRatios, activeRightTab);

  return {
    activePanelSurface,
    activeRightTab,
    closeRightPanel,
    docsSidebarWidthPx,
    handleRightTabClick,
    isSidebarOpen,
    onRightLayoutChanged,
    pageMargins,
    sidebarResize,
    rightPanelConfig,
    rightPanelRatio,
    setDocsSidebarOpen,
    setFocusedClosableTarget,
    setPageMargins,
    setTrashRefreshKey,
    trashRefreshKey,
  };
}
