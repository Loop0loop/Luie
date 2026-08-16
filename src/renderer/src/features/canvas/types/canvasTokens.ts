import type { CanvasNodeKind } from "./canvasProjection.types";

export const CANVAS_NODE_KIND_COLOUR: Record<CanvasNodeKind, string> = {
  chapter:       "var(--canvas-node-chapter,      #a882ff)",
  character:     "var(--canvas-node-character,    #fb464c)",
  event:         "var(--canvas-node-event,        #e9973f)",
  faction:       "var(--canvas-node-faction,      #44cf6e)",
  term:          "var(--canvas-node-term,         #53dfdd)",
  "world-entity":"var(--canvas-node-world-entity, #e0de71)",
} as const;
