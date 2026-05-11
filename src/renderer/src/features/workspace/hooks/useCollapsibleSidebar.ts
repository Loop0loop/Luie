import { useCallback } from "react";
import type { PanelSize } from "react-resizable-panels";
import type { SidebarWidthFeature } from "@shared/constants/sidebarSizing";
import { useCollapsedSidebarStore } from "./useCollapsedSidebarStore";

export type UseCollapsibleSidebarResult = {
  isCollapsed: boolean;
  onResize: (panelSize: PanelSize) => void;
  expand: () => void;
  collapse: () => void;
  toggle: () => void;
};

export function useCollapsibleSidebar(
  feature: SidebarWidthFeature,
  baseOnResize: (panelSize: PanelSize) => void,
): UseCollapsibleSidebarResult {
  const isCollapsed = useCollapsedSidebarStore(
    (state) => state.collapsedSidebars[feature] ?? false,
  );
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
      const collapsed =
        typeof panelSize.inPixels === "number" && panelSize.inPixels <= 0;
      setCollapsedSidebar(feature, collapsed);
      if (!collapsed) {
        baseOnResize(panelSize);
      }
    },
    [baseOnResize, feature, setCollapsedSidebar],
  );

  return { isCollapsed, onResize, expand, collapse, toggle };
}
