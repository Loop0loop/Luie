/** canvas node selection과 rightPanel의 canvas tab을 동기화한다. */

import { useCallback, useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { useCanvasViewStore } from "../stores";
import { useCanvasSelection } from "./useCanvasView";

export function useCanvasDrawer() {
  const { selection } = useCanvasSelection();
  const clearSelection = useCanvasViewStore((s) => s.clearSelection);

  const { rightPanelOpen, openRightPanelTab } = useUIStore(
    useShallow((state) => ({
      rightPanelOpen: state.regions.rightPanel.open,
      openRightPanelTab: state.openRightPanelTab,
    })),
  );

  // NOTE: deselect 시 panel은 닫지 않고 빈 inspector를 유지한다.
  useEffect(() => {
    if (selection.kind === "node" && !rightPanelOpen) {
      openRightPanelTab("canvas");
    }
  }, [selection.kind, rightPanelOpen, openRightPanelTab]);

  const isOpen = selection.kind === "node";
  const selectedNodeId = selection.kind === "node" ? selection.id : null;

  const closeDrawer = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  return {
    isOpen,
    selectedNodeId,
    closeDrawer,
  };
}
