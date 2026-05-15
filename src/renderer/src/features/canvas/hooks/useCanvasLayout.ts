import { useShallow } from "zustand/react/shallow";
import {
  useCanvasLayoutStore,
  CANVAS_LAYOUT_FEATURES,
} from "../stores/canvasLayoutStore";

/**
 * Canvas 레이아웃(폭/접힘) 셀렉터.
 *
 * 컴포넌트는 이 hook을 통해 sidebar/binder의 width와 collapsed 상태를
 * 동시에 받고, useShallow로 한 묶음 처리한다.
 */
export function useCanvasLayout() {
  return useCanvasLayoutStore(
    useShallow((state) => ({
      sidebarWidth: state.sidebarWidth,
      binderWidth: state.binderWidth,
      isSidebarCollapsed: state.isSidebarCollapsed,
      isBinderCollapsed: state.isBinderCollapsed,
      hasHydrated: state.hasHydrated,
      setSidebarWidth: state.setSidebarWidth,
      setBinderWidth: state.setBinderWidth,
      toggleSidebar: state.toggleSidebar,
      toggleBinder: state.toggleBinder,
      setSidebarCollapsed: state.setSidebarCollapsed,
      setBinderCollapsed: state.setBinderCollapsed,
    })),
  );
}

export { CANVAS_LAYOUT_FEATURES };
