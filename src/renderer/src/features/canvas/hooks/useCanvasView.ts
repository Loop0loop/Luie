/** selection 변경이 안정적인 canvas view 구독자를 render하지 않도록 구독을 분리한다. */
import { useShallow } from "zustand/react/shallow";
import { useCanvasViewStore } from "../stores";

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

export function useCanvasSelection() {
  return useCanvasViewStore(
    useShallow((s) => ({
      selection: s.selection,
    })),
  );
}
