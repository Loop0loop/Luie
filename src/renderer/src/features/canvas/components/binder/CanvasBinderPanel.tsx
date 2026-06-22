/**
 * CanvasBinderPanel — BinderSidebar "canvas" 탭 콘텐츠.
 *
 * - selection.kind === "node" → CanvasNodeInspector
 * - selection.kind === "none" → CanvasBinderEmpty
 */

import { useCanvasSelection } from "@renderer/features/canvas/hooks/useCanvasView";
import CanvasBinderEmpty from "./CanvasBinderEmpty";
import CanvasNodeInspector from "./CanvasNodeInspector";

export default function CanvasBinderPanel() {
  const { selection } = useCanvasSelection();

  if (selection.kind === "node") {
    return <CanvasNodeInspector nodeId={selection.id} />;
  }

  return <CanvasBinderEmpty />;
}
