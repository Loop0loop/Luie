import { useState, useCallback } from "react";
import type { PanelSize } from "react-resizable-panels";

export type UseCollapsibleSidebarResult = {
  /** True when the panel is snapped to collapsedSize (0px). */
  isCollapsed: boolean;
  /**
   * Drop-in replacement for the Panel's onResize prop.
   * Tracks collapse state and suppresses width commits while collapsed,
   * preserving the last valid width for restore on expand.
   */
  onResize: (panelSize: PanelSize) => void;
};

/**
 * Wraps a base sidebar onResize handler to add collapse/expand tracking.
 *
 * Collapse is detected when `panelSize.inPixels` reaches 0 (the panel has
 * snapped to `collapsedSize`). The base handler is deliberately NOT called
 * while collapsed so the width store retains the last pre-collapse value,
 * enabling a clean restore on expand.
 *
 * Session-local — collapsed state is not persisted across app restarts.
 * Works with react-resizable-panels' native `collapsible` + `collapsedSize` props.
 */
export function useCollapsibleSidebar(
  baseOnResize: (panelSize: PanelSize) => void,
): UseCollapsibleSidebarResult {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const onResize = useCallback(
    (panelSize: PanelSize) => {
      const collapsed =
        typeof panelSize.inPixels === "number" && panelSize.inPixels <= 0;

      setIsCollapsed((prev) => (prev === collapsed ? prev : collapsed));

      if (!collapsed) {
        baseOnResize(panelSize);
      }
    },
    [baseOnResize],
  );

  return { isCollapsed, onResize };
}
