/**
 * CanvasBinderPanel — BinderSidebar "canvas" tab content.
 *
 * - selection.kind === "node" → CanvasNodeInspector
 * - selection.kind === "none" → CanvasBinderEmpty
 *
 * Side-effect: 노드가 선택됐을 때 BinderBar가 닫혀있는 경우에만 자동으로 엽니다.
 * 이미 열려있거나 사용자가 직접 닫은 경우에는 강제로 다시 열지 않습니다.
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

  const { rightPanelOpen, openRightPanelTab } = useUIStore(
    useShallow((state) => ({
      rightPanelOpen: state.regions.rightPanel.open,
      openRightPanelTab: state.openRightPanelTab,
    })),
  );

  // BinderBar가 닫혀있을 때만 자동으로 엽니다.
  // 이미 열려있으면 사용자 의도를 존중해 강제 재오픈하지 않습니다.
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
