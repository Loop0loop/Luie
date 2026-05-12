export const GRAPH_DEFAULT_NODE_COLUMNS = 4;
export const GRAPH_DEFAULT_NODE_COLUMN_GAP_PX = 280;
export const GRAPH_DEFAULT_NODE_ROW_GAP_PX = 220;
export const GRAPH_DEFAULT_NODE_OFFSET_X_PX = 120;
export const GRAPH_DEFAULT_NODE_OFFSET_Y_PX = 120;

export const GRAPH_FLOW_DEFAULT_VIEWPORT = {
  x: 0,
  y: 0,
  zoom: 0.85,
} as const;

export const GRAPH_FLOW_MIN_ZOOM = 0.4;
export const GRAPH_FLOW_MAX_ZOOM = 2;

export const GRAPH_VIEWPORT_FALLBACK_SIZE = {
  width: 800,
  height: 600,
} as const;

export const GRAPH_VIEWPORT_CREATE_OFFSET = {
  x: 140,
  y: 60,
} as const;

export const GRAPH_FLOW_BACKGROUND_DOT_GAP_PX = 32;
export const GRAPH_FLOW_BACKGROUND_DOT_SIZE_PX = 1;

export const GRAPH_FIT_VIEW_PADDING_DEFAULT = 0.2;
export const GRAPH_FIT_VIEW_PADDING_CANVAS = 0.05;
export const GRAPH_FIT_VIEW_PADDING_AUTO_LAYOUT = 0.24;

export const GRAPH_FIT_VIEW_DURATION_SHORT_MS = 220;
export const GRAPH_FIT_VIEW_DURATION_AUTO_LAYOUT_MS = 300;
export const GRAPH_AUTO_LAYOUT_FIT_VIEW_DELAY_MS = 50;

export const GRAPH_EDGE_ZOOM_FIT_PADDING = 0.35;
export const GRAPH_EDGE_ZOOM_MIN_BOUNDS = {
  width: 120,
  height: 80,
} as const;

export const GRAPH_SIDEBAR_WIDTH = {
  min: 220,
  max: 520,
  default: 320,
  collapseThreshold: 120,
} as const;
