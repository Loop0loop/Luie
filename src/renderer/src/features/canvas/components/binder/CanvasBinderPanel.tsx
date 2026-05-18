/**
 * CanvasBinderPanel — BinderSidebar "canvas" tab content.
 *
 * - selection.kind === "node" → CanvasNodeInspector
 * - selection.kind === "none" → CanvasBinderEmpty
 *
 * Side-effect: auto-opens the BinderBar on the canvas tab when a node
 * is selected in the viewport.
 */

import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { useCanvasViewStore } from "@renderer/features/canvas/stores";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import CanvasBinderEmpty from "./CanvasBinderEmpty";
import CanvasNodeInspector from "./CanvasNodeInspector";

export default function CanvasBinderPanel() {
  const selection = useCanvasViewStore(
    useShallow((state) => state.selection),
  );

  const openRightPanelTab = useUIStore(
    useShallow((state) => state.openRightPanelTab),
  );

  // Auto-open BinderBar when a node is selected.
  useEffect(() => {
    if (selection.kind === "node") {
      openRightPanelTab("canvas");
    }
  }, [selection, openRightPanelTab]);

  if (selection.kind === "node") {
    return <CanvasNodeInspector nodeId={selection.id} />;
  }

  return <CanvasBinderEmpty />;
}
