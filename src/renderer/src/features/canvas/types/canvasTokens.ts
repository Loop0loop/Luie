import type { CanvasNodeKind } from "./canvasProjection.types";

export const CANVAS_NODE_KIND_COLOUR: Record<CanvasNodeKind, string> = {
  chapter:       "var(--canvas-node-chapter,      #bf5af2)",
  character:     "var(--canvas-node-character,    #0a84ff)",
  event:         "var(--canvas-node-event,        #ff9f0a)",
  faction:       "var(--canvas-node-faction,      #30d158)",
  term:          "var(--canvas-node-term,         #64d2ff)",
  "world-entity":"var(--canvas-node-world-entity, #ffd60a)",
} as const;
