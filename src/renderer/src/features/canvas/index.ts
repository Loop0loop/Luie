/**
 * Canvas feature public surface.
 *
 * Phases:
 *   P0 — viewport pane shell only.
 *   P1 — canvasViewStore + types.
 *   P2 — Sidebar shell + ScrivenerLayout integration.
 *
 * Note: WorldCanvasPanel was removed in P0; consumers (graph tab, world-graph window)
 * now mount {@link CanvasPane} as the viewport-only entry point.
 */
export { default as CanvasPane } from "./components/CanvasPane";
export { useCanvasViewStore } from "./stores";
export type { CanvasViewState } from "./stores";
export type {
  CanvasMode,
  CanvasAvailableMode,
  CanvasRange,
  CanvasLayer,
  CanvasActivityPanel,
  CanvasScope,
  CanvasViewport,
  CanvasSelection,
} from "./types";
export { CANVAS_AVAILABLE_MODES } from "./types";
