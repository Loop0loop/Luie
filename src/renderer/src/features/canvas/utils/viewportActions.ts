/**
 * viewportActions.ts
 *
 * Pure factory for canvas viewport zoom/pan actions.
 * Extracted from CanvasToolbar to enable reuse and testability.
 *
 * Constraints:
 *   - No React, no store access — pure functions only.
 *   - Zoom constants imported from shared canvasSizing.
 */

import {
  CANVAS_ZOOM_MIN,
  CANVAS_ZOOM_MAX,
  CANVAS_ZOOM_STEP,
} from "@shared/constants/canvasSizing";

export interface ViewportState {
  zoom: number;
  pan: { x: number; y: number };
}

export interface ViewportActions {
  zoomIn: () => Pick<ViewportState, "zoom">;
  zoomOut: () => Pick<ViewportState, "zoom">;
  fitView: () => Pick<ViewportState, "zoom" | "pan">;
}

/**
 * Create viewport action functions bound to a given zoom value.
 * Each call returns the partial state to apply (caller handles setViewport).
 */
export function createViewportActions(
  zoom: number,
): ViewportActions {
  return {
    zoomIn: () => ({
      zoom: Math.min(CANVAS_ZOOM_MAX, zoom + CANVAS_ZOOM_STEP),
    }),
    zoomOut: () => ({
      zoom: Math.max(CANVAS_ZOOM_MIN, zoom - CANVAS_ZOOM_STEP),
    }),
    fitView: () => ({
      zoom: 1,
      pan: { x: 0, y: 0 },
    }),
  };
}
