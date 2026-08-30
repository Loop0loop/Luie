import type { CanvasNodeKind } from "./canvasProjection.types";

/**
 * entity 종류별 의미 색. 실제 값은 global.tokens.css의 Canvas 섹션이 theme별로 정의한다.
 * fallback은 `:root`(light) 값과 같게 맞춰, stylesheet가 아직 붙지 않은 순간에도 현재
 * theme과 어긋난 색이 보이지 않게 한다.
 */
export const CANVAS_NODE_KIND_COLOUR: Record<CanvasNodeKind, string> = {
  chapter:       "var(--canvas-node-chapter,      #9333ea)",
  character:     "var(--canvas-node-character,    #2563eb)",
  event:         "var(--canvas-node-event,        #ea580c)",
  faction:       "var(--canvas-node-faction,      #15803d)",
  term:          "var(--canvas-node-term,         #0891b2)",
  "world-entity":"var(--canvas-node-world-entity, #a16207)",
} as const;
