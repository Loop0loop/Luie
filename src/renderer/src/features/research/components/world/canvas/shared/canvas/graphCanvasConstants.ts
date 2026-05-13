export const GRAPH_CANVAS_DEFAULT_EDGE_COLORS = [
  "#f59e0b",
  "#22d3ee",
  "#a78bfa",
  "#f472b6",
  "#34d399",
  "#f97316",
] as const;

// Node sizing
export const GRAPH_CANVAS_NODE_DEFAULT_WIDTH_PX = 220;
export const GRAPH_CANVAS_NODE_DEFAULT_HEIGHT_PX = 120;
export const GRAPH_CANVAS_GUIDE_SNAP_DISTANCE_PX = 10;

export const GRAPH_CANVAS_RELATION_HINT_EDGE_PREFIX = "entity-hint:";

// ReactFlow viewport — canvas-specific (differs from generic world-graph layout)
export const GRAPH_CANVAS_FLOW_MIN_ZOOM = 0.15;
export const GRAPH_CANVAS_FLOW_MAX_ZOOM = 2.5;
export const GRAPH_CANVAS_FLOW_DEFAULT_VIEWPORT = { x: 0, y: 0, zoom: 0.9 } as const;
export const GRAPH_CANVAS_BG_DOT_GAP_PX = 20;
export const GRAPH_CANVAS_BG_DOT_SIZE_PX = 1.5;
export const GRAPH_CANVAS_FIT_VIEW_PADDING = 0.12;
export const GRAPH_CANVAS_FIT_VIEW_DURATION_MS = 400;
