/**
 * edgeStyles.ts
 *
 * Edge style computation for canvas relation edges.
 * Extracted from RelationEdge to centralize stroke/opacity/transition logic.
 */

import { CANVAS_RELATION_EDGE_DEFAULTS } from "../constants/edge";

export interface EdgeDefaults {
  strokeWidth: number;
  strokeWidthSelected: number;
  opacity: number;
  opacitySelected: number;
  transitionDuration: number;
}

export interface EdgeStyle {
  stroke: string;
  strokeWidth: number;
  opacity: number;
  transition: string;
}

/**
 * Compute edge style object for a RelationEdge.
 *
 * @param selected — whether the edge is currently selected
 * @param strokeColour — resolved stroke color (CSS variable or literal)
 * @param defaults — edge defaults (defaults to CANVAS_RELATION_EDGE_DEFAULTS)
 */
export function getEdgeStyle(
  selected: boolean,
  strokeColour: string,
  defaults: EdgeDefaults = CANVAS_RELATION_EDGE_DEFAULTS,
): EdgeStyle {
  const strokeWidth = selected
    ? defaults.strokeWidthSelected
    : defaults.strokeWidth;

  const opacity = selected
    ? defaults.opacitySelected
    : defaults.opacity;

  const transition = `stroke ${defaults.transitionDuration}ms, stroke-width ${defaults.transitionDuration}ms, opacity ${defaults.transitionDuration}ms`;

  return {
    stroke: strokeColour,
    strokeWidth,
    opacity,
    transition,
  };
}
