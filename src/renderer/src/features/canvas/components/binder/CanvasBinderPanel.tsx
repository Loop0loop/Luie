/**
 * CanvasBinderPanel — BinderSidebar "canvas" 탭 콘텐츠.
 *
 * - selection.kind === "node" → CanvasNodeInspector
 * - selection.kind === "none" → CanvasBinderEmpty
 *
 * Side-effect: BinderBar가 닫혀있을 때만 자동으로 엽니다.
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
