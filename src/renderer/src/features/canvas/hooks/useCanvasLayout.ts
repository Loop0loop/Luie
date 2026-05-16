import { useShallow } from "zustand/react/shallow";
import {
  useCanvasLayoutStore,
  CANVAS_SURFACE,
} from "../stores/canvasLayoutStore";

/**
 * Canvas 레이아웃(폭/접힘) 셀렉터.
 *
 * 두 surface(activity / binder)를 한 번에 읽고, 컴포넌트는 useShallow로
 * 묶인 이 hook만 본다. store 직접 import 금지.
 */
export function useCanvasLayout() {
  return useCanvasLayoutStore(
    useShallow((state) => ({
      activityWidth: state.activityWidth,
      binderWidth: state.binderWidth,
      isActivityCollapsed: state.isActivityCollapsed,
      isBinderCollapsed: state.isBinderCollapsed,
      hasHydrated: state.hasHydrated,
      setActivityWidth: state.setActivityWidth,
      setBinderWidth: state.setBinderWidth,
      toggleActivity: state.toggleActivity,
      toggleBinder: state.toggleBinder,
      setActivityCollapsed: state.setActivityCollapsed,
      setBinderCollapsed: state.setBinderCollapsed,
    })),
  );
}

export { CANVAS_SURFACE };
