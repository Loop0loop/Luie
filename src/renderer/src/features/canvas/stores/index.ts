/**
 * Canvas store entry — 외부는 hook(`useCanvasViewState` 등)을 통해서만
 * 접근하고, store 인스턴스를 직접 import하지 않는 게 권장된다.
 * 그래도 union된 entry로 두면 발견성이 좋아서 노출.
 */
export {
  useCanvasViewStore,
  type CanvasViewState,
} from "./canvasViewStore";
export {
  useCanvasLayoutStore,
  CANVAS_LAYOUT_FEATURES,
  type CanvasLayoutState,
} from "./canvasLayoutStore";
export {
  useCanvasProjectionStore,
  buildProjectionCacheKey,
  type CanvasProjectionState,
} from "./canvasProjectionStore";
