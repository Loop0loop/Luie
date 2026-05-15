import { useShallow } from "zustand/react/shallow";
import { useCanvasViewStore } from "../stores/canvasViewStore";

/**
 * 캔버스 View 상태에서 자주 함께 읽는 필드들을 useShallow로 묶은 hook.
 *
 * 컴포넌트가 store를 직접 구독할 때마다 selector를 새로 만들면 useShallow
 * 효과가 사라진다. 이 hook을 통해 한 번만 만들고 재사용.
 *
 * 셀렉터는 도메인 그룹별로 분리. 너무 큰 묶음 하나는 불필요한 리렌더
 * 원인이라 mode/scope/selection/layers/focus를 별도 hook으로 노출.
 */

export function useCanvasMode() {
  return useCanvasViewStore(
    useShallow((state) => ({
      mode: state.mode,
      setMode: state.setMode,
    })),
  );
}

export function useCanvasScope() {
  return useCanvasViewStore(
    useShallow((state) => ({
      scope: state.scope,
      setScope: state.setScope,
    })),
  );
}

export function useCanvasSelection() {
  return useCanvasViewStore(
    useShallow((state) => ({
      selection: state.selection,
      selectNode: state.selectNode,
      selectEdge: state.selectEdge,
      clearSelection: state.clearSelection,
    })),
  );
}

export function useCanvasLayers() {
  return useCanvasViewStore(
    useShallow((state) => ({
      layers: state.layers,
      toggleLayer: state.toggleLayer,
    })),
  );
}

export function useCanvasFocuses() {
  return useCanvasViewStore(
    useShallow((state) => ({
      focuses: state.focuses,
      toggleFocus: state.toggleFocus,
    })),
  );
}

export function useCanvasViewport() {
  return useCanvasViewStore(
    useShallow((state) => ({
      zoom: state.zoom,
      pan: state.pan,
      setViewport: state.setViewport,
    })),
  );
}
