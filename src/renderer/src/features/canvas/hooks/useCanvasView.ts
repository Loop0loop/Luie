/**
 * useCanvasView — canvasViewStore 구독 레이어.
 *
 * SRP 원칙에 따라 변경 빈도 기준으로 두 훅으로 분리합니다:
 *
 *   useCanvasView()       — 안정적인 상태 (mode, scope, canvasType, sidebar)
 *                           사용자 인터랙션마다 바뀌지 않음
 *
 *   useCanvasSelection()  — 빈번히 바뀌는 상태 (selection)
 *                           노드 클릭마다 변경됨
 *
 * Actions는 useShallow에 포함하지 않습니다.
 * Zustand actions는 store 생성 시 고정된 함수 참조이므로
 * shallow 비교에 넣어도 무의미하고 비교 비용만 증가합니다.
 * Actions는 useCanvasViewStore((s) => s.setMode) 형태로 직접 구독합니다.
 *
 * 사용 예:
 *   const { mode, scope, canvasType } = useCanvasView();
 *   const { selection } = useCanvasSelection();
 *   const setMode = useCanvasViewStore((s) => s.setMode);
 */
import { useShallow } from "zustand/react/shallow";
import { useCanvasViewStore } from "../stores";

// ─── 안정적인 상태 (mode, scope, canvasType, sidebar) ─────────────────────────

export function useCanvasView() {
  return useCanvasViewStore(
    useShallow((s) => ({

      mode:                 s.mode,
      scope:                s.scope,
      layers:               s.layers,
      activePanel:          s.activePanel,
      isActivityCollapsed:  s.isActivityCollapsed,
      isBinderCollapsed:    s.isBinderCollapsed,
    })),
  );
}

// ─── 빈번히 바뀌는 상태 (selection) ──────────────────────────────────────────
// viewport(pan/zoom)는 ReactFlow가 자체 관리하므로 여기서 구독하지 않습니다.

export function useCanvasSelection() {
  return useCanvasViewStore(
    useShallow((s) => ({
      selection: s.selection,
    })),
  );
}
