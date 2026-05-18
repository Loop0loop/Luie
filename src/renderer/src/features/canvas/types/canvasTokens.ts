/**
 * canvasTokens.ts
 *
 * Renderer-only design tokens for the canvas feature.
 * Lives in /types because it depends on CanvasNodeKind, which is a
 * renderer-side view-model enum (canvasProjection.types).
 *
 * Sizing/numeric constants live in @shared/constants/canvasSizing.
 */

import type { CanvasNodeKind } from "./canvasProjection.types";

/**
 * Node kind → CSS variable colour token.
 * Falls back to a hard-coded hex if the variable is not defined,
 * so the canvas always renders with sane defaults.
 */
export const CANVAS_NODE_KIND_COLOUR: Record<CanvasNodeKind, string> = {
  chapter: "var(--accent-bg)",
  character: "var(--canvas-node-character, #f97316)",
  event: "var(--canvas-node-event, #a855f7)",
  faction: "var(--canvas-node-faction, #ef4444)",
  term: "var(--canvas-node-term, #22c55e)",
  "world-entity": "var(--canvas-node-world-entity, #64748b)",
} as const;
