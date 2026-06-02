import { CANVAS_FIT_VIEW_PADDING } from "@shared/constants/canvasSizing";

export const PRO_OPTIONS = { hideAttribution: true } as const;
export const FIT_VIEW_OPTIONS = { padding: CANVAS_FIT_VIEW_PADDING } as const;

export const LAYOUT_CENTER_CHARACTER = { x: 280, y: 250 } as const;
export const LAYOUT_CENTER_EVENT = { x: 340, y: 280 } as const;
export const LAYOUT_ITERATIONS_CHARACTER = 75 as const;
export const LAYOUT_ITERATIONS_EVENT = 85 as const;

export const EDGE_FALLBACK_OPACITY = 0.6 as const;
export const EDGE_FALLBACK_STROKE_WIDTH = 1.5 as const;
export const EDGE_FOCUS_OPACITY = 0.95 as const;
