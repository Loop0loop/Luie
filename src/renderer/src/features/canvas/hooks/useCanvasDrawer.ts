/**
 * useCanvasDrawer — 캔버스 우측 Slide-out Drawer 제어용 전용 커스텀 훅.
 * 
 * SRP (Single Responsibility Principle) 준수:
 *   - 캔버스 뷰포트 내부 노드 선택 상태와 우측 서랍(Drawer)의 토글 상태를 브릿지합니다.
 *   - Zustand 스토어의 selection 변경으로 인한 컴포넌트 리렌더링 구독을 캡슐화합니다.
 */

import { useCallback } from "react";
import { useCanvasViewStore } from "../stores";
import { useCanvasSelection } from "./useCanvasView";

export function useCanvasDrawer() {
  const { selection } = useCanvasSelection();
  const clearSelection = useCanvasViewStore((s) => s.clearSelection);

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
