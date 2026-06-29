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
      // Ignore resizes from a programmatic layout pass (mount, container
      // resize, expand/collapse setLayout). Otherwise a transient onResize on
      // reopen would flip the persisted collapsed state on its own.
      if (isLayoutRestoring()) {
        return;
      }
      const collapsed =
        typeof panelSize.inPixels === "number" && panelSize.inPixels <= 0;
      if (collapsed) {
        // Auto-collapse when the user drags to zero. Never auto-expand from a
        // resize — expanding is the toggle button's job — so the saved hidden
        // state is not clobbered.
        setCollapsedSidebar(feature, true);
      } else {
        baseOnResize(panelSize);
      }
    },
    [baseOnResize, feature, setCollapsedSidebar],
  );

  return { isCollapsed, isHydrated, onResize, expand, collapse, toggle };
}
