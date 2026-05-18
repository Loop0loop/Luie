/**
 * CanvasBinderPanel — BinderSidebar "canvas" 탭 콘텐츠.
 *
 * - selection.kind === "node" → CanvasNodeInspector
 * - selection.kind === "none" → CanvasBinderEmpty
 *
 * Side-effect: BinderBar가 닫혀있을 때만 자동으로 엽니다.
 */

import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { useCanvasSelection } from "@renderer/features/canvas/hooks/useCanvasView";
import CanvasBinderEmpty from "./CanvasBinderEmpty";
import CanvasNodeInspector from "./CanvasNodeInspector";

export default function CanvasBinderPanel() {
  // 빈번히 바뀌는 selection만 구독
  const { selection } = useCanvasSelection();

  const { rightPanelOpen, openRightPanelTab } = useUIStore(
    useShallow((state) => ({
      rightPanelOpen: state.regions.rightPanel.open,
      openRightPanelTab: state.openRightPanelTab,
    })),
  );

  useEffect(() => {
    if (selection.kind === "node" && !rightPanelOpen) {
      openRightPanelTab("canvas");
    }
  }, [selection, rightPanelOpen, openRightPanelTab]);

  if (selection.kind === "node") {
    return <CanvasNodeInspector nodeId={selection.id} />;
  }

  return <CanvasBinderEmpty />;
}
