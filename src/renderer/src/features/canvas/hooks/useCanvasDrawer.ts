/**
 * useCanvasDrawer — 캔버스 우측 Slide-out Drawer 및 Inspector 패널 제어용 전용 커스텀 훅.
 * 
 * SRP (Single Responsibility Principle) 준수 및 Side-effect 책임 일원화:
 *   - 캔버스 뷰포트 내부 노드 선택 상태와 우측 서랍(Drawer) 및 rightPanel 토글 상태를 단일 이펙트로 연동합니다.
 *   - Zustand 스토어의 selection 변경 시 우측 패널 개폐 및 탭 포커스 상태를 한곳에서 안전하게 동기화합니다.
 */

import { useCallback, useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { useCanvasViewStore } from "../stores";
import { useCanvasSelection } from "./useCanvasView";

export function useCanvasDrawer() {
  const { selection } = useCanvasSelection();
  const clearSelection = useCanvasViewStore((s) => s.clearSelection);

  const { rightPanelOpen, setRegionOpen, openRightPanelTab } = useUIStore(
    useShallow((state) => ({
      rightPanelOpen: state.regions.rightPanel.open,
      setRegionOpen: state.setRegionOpen,
      openRightPanelTab: state.openRightPanelTab,
    })),
  );

  // 우측 패널(Inspector 및 Binder) 개폐 타이밍을 단일 Side-effect로 통합 연동
  useEffect(() => {
    if (selection.kind === "node") {
      if (!rightPanelOpen) {
        setRegionOpen("rightPanel", true);
      }
      openRightPanelTab("canvas");
    } else if (selection.kind === "none") {
      if (rightPanelOpen) {
        setRegionOpen("rightPanel", false);
      }
    }
  }, [selection.kind, rightPanelOpen, setRegionOpen, openRightPanelTab]);

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
