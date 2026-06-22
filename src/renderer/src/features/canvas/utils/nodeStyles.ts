/**
 * nodeStyles.ts
 *
 * Node style computation for canvas entity nodes.
 * Extracted from EntityNode to centralize kind-based colour/tint lookups.
 *
 * Re-exports CANVAS_NODE_KIND_COLOUR and CANVAS_NODE_KIND_BG from
 * canvasTokens for backward compatibility and single-source truth.
 */

import {
  CANVAS_NODE_KIND_COLOUR,
  CANVAS_NODE_KIND_BG,
} from "../types/canvasTokens";
import type { CanvasNodeKind } from "../types/canvasProjection.types";

// Re-export for backward compatibility — single source of truth
export { CANVAS_NODE_KIND_COLOUR, CANVAS_NODE_KIND_BG };

export interface NodeStyle {
  colour: string;
  bgTint: string;
}

/**
 * Get style tokens for a given node kind.
 * Returns colour (border/accent) and bgTint (background tint).
 */
export function getNodeStyle(kind: CanvasNodeKind): NodeStyle {
  return {
    colour: CANVAS_NODE_KIND_COLOUR[kind],
    bgTint: CANVAS_NODE_KIND_BG[kind],
  };
}
