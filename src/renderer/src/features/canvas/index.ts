/**
 * Canvas feature public surface.
 *
 * Phases:
 *   P0 — viewport pane shell only.
 *   P1 — canvasViewStore + types.
 *   P2 — Sidebar shell + EditorRoot/MainLayout integration.
 *   P3 — CanvasPane Toolbar/StatusBar/Empty + canvas panel layout hooks.
 *   P4 — 5 activity panels (Explorer/CanvasControl/Entities/Memory/Search).
 *   P5 — CanvasViewport + projection adapter + scope/projection hooks.
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
  useCanvasScope,
  useCanvasProjection,
} from "./hooks";
export type { CanvasPanelLayout, UseCanvasProjectionResult } from "./hooks";
export type {
  CanvasMode,
  CanvasAvailableMode,
  CanvasRange,
  CanvasLayer,
  CanvasActivityPanel,
  CanvasScope,
  CanvasViewport,
  CanvasSelection,
  CanvasProjection,
  CanvasProjectionNode,
  CanvasProjectionEdge,
  CanvasProjectionStatus,
  CanvasNodeKind,
  CanvasEdgeStyle,
} from "./types";
export { CANVAS_AVAILABLE_MODES, ENTITY_TYPE_TO_NODE_KIND } from "./types";
