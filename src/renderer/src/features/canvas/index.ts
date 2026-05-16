/**
 * Canvas feature public surface.
 *
 * Phases:
 *   P0 — viewport pane shell only.
 *   P1 — canvasViewStore + types.
 *   P2 — Sidebar shell + EditorRoot/MainLayout integration.
 *   P3 — CanvasPane Toolbar/StatusBar/Empty + canvas panel layout hooks.
 *
 * Note: WorldCanvasPanel was removed in P0; consumers (graph tab, world-graph window)
 * now mount {@link CanvasPane} as the viewport-only entry point.
 */
export { default as CanvasPane } from "./components/CanvasPane";
export { default as CanvasActivityShell } from "./components/CanvasActivityShell";
export { default as CanvasIconRail } from "./components/CanvasIconRail";
export { default as SidePanelRouter } from "./components/SidePanelRouter";
export { useCanvasViewStore } from "./stores";
export type { CanvasViewState } from "./stores";
export {
  useCanvasPanelLayout,
  useCanvasLayoutPersist,
} from "./hooks";
export type { CanvasPanelLayout } from "./hooks";
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
