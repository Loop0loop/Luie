import type { CSSProperties } from "react";
import { CANVAS_RELATION_EDGE_DEFAULTS } from "../constants/edge";

export interface EdgeDefaults {
  strokeWidth: number;
  strokeWidthSelected: number;
  opacity: number;
  opacitySelected: number;
  transitionDuration: number;
}

export type EdgeStyle = Pick<
  CSSProperties,
  "stroke" | "strokeWidth" | "opacity" | "transition"
>;

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
