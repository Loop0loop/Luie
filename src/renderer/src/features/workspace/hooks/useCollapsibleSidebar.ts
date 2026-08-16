import { useCallback } from "react";
import type { PanelSize } from "react-resizable-panels";
import type { SidebarWidthFeature } from "@renderer/shared/constants/sidebarSizing";
import { toPxSize } from "@renderer/shared/constants/sidebarSizing";
import { useCollapsedSidebarStore } from "./useCollapsedSidebarStore";
import { isLayoutRestoring } from "./useSidebarResizeCommit";

export type UseCollapsibleSidebarResult = {
  isCollapsed: boolean;
  isHydrated: boolean;
  onResize: (panelSize: PanelSize) => void;
  expand: () => void;
  collapse: () => void;
  toggle: () => void;
};

export type CollapsibleSidebarVisibilityInput = {
  enableAnimations: boolean;
  uiHasHydrated: boolean;
  projectLayoutHasHydrated: boolean;
  isLayoutReady: boolean;
  isCollapseHydrated: boolean;
};

export const getCollapsibleSidebarPanelSize = (
  isCollapsed: boolean,
  widthPx: number,
): string => toPxSize(isCollapsed ? 0 : widthPx);

export const shouldHideCollapsibleSidebarLayout = ({
  enableAnimations,
  uiHasHydrated,
  projectLayoutHasHydrated,
  isLayoutReady,
  isCollapseHydrated,
}: CollapsibleSidebarVisibilityInput): boolean =>
  !uiHasHydrated ||
  !projectLayoutHasHydrated ||
  !isCollapseHydrated ||
  (!enableAnimations && !isLayoutReady);

export function useCollapsibleSidebar(
  feature: SidebarWidthFeature,
  baseOnResize: (panelSize: PanelSize) => void,
): UseCollapsibleSidebarResult {
  const isCollapsed = useCollapsedSidebarStore(
    (state) => state.collapsedSidebars[feature] ?? false,
  );
  const isHydrated = useCollapsedSidebarStore((state) => state.hasHydrated);
  const setCollapsedSidebar = useCollapsedSidebarStore(
    (state) => state.setCollapsedSidebar,
  );

  const expand = useCallback(
    () => setCollapsedSidebar(feature, false),
    [feature, setCollapsedSidebar],
  );

  const collapse = useCallback(
    () => setCollapsedSidebar(feature, true),
    [feature, setCollapsedSidebar],
  );

  const toggle = useCallback(
    () => setCollapsedSidebar(feature, !isCollapsed),
    [feature, isCollapsed, setCollapsedSidebar],
  );

  const onResize = useCallback(
    (panelSize: PanelSize) => {
      // NOTE: programmatic layout의 resize를 저장하면 reopen 시 collapsed 상태가 뒤집힌다.
      if (isLayoutRestoring()) {
        return;
      }
      const collapsed =
        typeof panelSize.inPixels === "number" && panelSize.inPixels <= 0;
      if (collapsed) {
        // NOTE: 0까지 직접 drag한 경우만 접고 resize만으로 자동 확장하지 않는다.
        setCollapsedSidebar(feature, true);
      } else {
        baseOnResize(panelSize);
      }
    },
    [baseOnResize, feature, setCollapsedSidebar],
  );

  return { isCollapsed, isHydrated, onResize, expand, collapse, toggle };
}
