// ─── domain view-model types ──────────────────────────────────────────────────
export type {
  CanvasMode,
  CanvasAvailableMode,
  CanvasType,
  CanvasRange,
  CanvasLayer,
  CanvasActivityPanel,
  CanvasScope,
  CanvasViewport,
  CanvasSelection,
} from "./canvas.types";
export { CANVAS_AVAILABLE_MODES } from "./canvas.types";

// ─── projection (legacy view-model used by status bar) ───────────────────────
export type {
  CanvasProjection,
  CanvasProjectionNode,
  CanvasProjectionEdge,
  CanvasProjectionStatus,
  CanvasNodeKind,
  CanvasEdgeStyle,
} from "./canvasProjection.types";
export { ENTITY_TYPE_TO_NODE_KIND } from "./canvasProjection.types";
export { buildProjection } from "./canvasProjectionAdapter";

// ─── React-Flow adapter (renderer-only view types + conversion) ───────────────
export type {
  RFEntityNodeData,
  RFMemoNodeData,
  RFTimelineNodeData,
  RFRelationEdgeData,
  RFCanvasEdgeData,
} from "./reactFlow.types";
export type { CanvasFlowGraph } from "./canvasFlowAdapter";
export { buildFlowGraph } from "./canvasFlowAdapter";

// ─── Renderer-only design tokens ──────────────────────────────────────────────
export { CANVAS_NODE_KIND_COLOUR } from "./canvasTokens";
