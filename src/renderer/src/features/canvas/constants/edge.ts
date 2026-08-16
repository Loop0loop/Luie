export const CANVAS_EDGE_BORDER_RADIUS = 12 as const;

export const CANVAS_RELATION_EDGE_DEFAULTS = {
  strokeWidth:         1.5,
  strokeWidthSelected: 2,
  opacity:             0.6,
  opacitySelected:     1,
  transitionDuration:  150,
} as const;

export const CANVAS_FREE_EDGE_DEFAULTS = {
  strokeWidth:         2,
  strokeWidthSelected: 2.5,
  opacity:             0.8,
  opacitySelected:     1,
  transitionDuration:  150,
} as const;

/** @deprecated `CANVAS_RELATION_EDGE_DEFAULTS`를 사용한다. */
export const CANVAS_EDGE_DEFAULTS = CANVAS_RELATION_EDGE_DEFAULTS;
/** @deprecated `CANVAS_FREE_EDGE_DEFAULTS`를 사용한다. */
export const CANVAS_CANVAS_EDGE_DEFAULTS = CANVAS_FREE_EDGE_DEFAULTS;

export const GRAPH_CONSTELLATION_EDGE_DEFAULTS = {
  character: {
    stroke: "var(--accent-bg)",
    widthMultiplier: 0.8,
    opacityBase: 0.35,
    opacityMultiplier: 0.15,
    dasharray: "4 6",
    markerSize: undefined,
  },
  event: {
    stroke: "var(--danger-fg)",
    widthMultiplier: 1.1,
    opacityBase: 0.50,
    opacityMultiplier: 0.20,
    markerSize: 10,
  },
} as const;
