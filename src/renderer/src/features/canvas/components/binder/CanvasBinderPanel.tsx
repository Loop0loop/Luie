/**
 * CanvasBinderPanel — content for the BinderSidebar "canvas" tab.
 *
 * Reads canvasViewStore.selection:
 *   - kind === "node" → <CanvasNodeInspector nodeId={id} />
 *   - kind === "none" → <CanvasBinderEmpty />
 *
 * Also wires node selection → BinderBar auto-open (via uiStore).
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

  const { openRightPanelTab } = useUIStore(
    useShallow((state) => ({
      openRightPanelTab: state.openRightPanelTab,
    })),
  );

  // When a node is selected, auto-open the BinderBar on the canvas tab.
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
