/**
 * canvasTokens.ts
 *
 * Renderer-only design tokens for the canvas feature.
 *
 * Obsidian Canvas 색상 프리셋 참고:
 *   1 = red    (#fb464c)
 *   2 = orange (#e9973f)
 *   3 = yellow (#e0de71)
 *   4 = green  (#44cf6e)
 *   5 = cyan   (#53dfdd)
 *   6 = purple (#a882ff)
 *
 * 각 kind는 CSS variable로 참조하고 fallback hex를 제공합니다.
 * 테마에서 --canvas-node-{kind} 변수를 정의하면 자동으로 반영됩니다.
 */

import type { CanvasNodeKind } from "./canvasProjection.types";

/** Node kind → 테두리/강조 색상 토큰 */
export const CANVAS_NODE_KIND_COLOUR: Record<CanvasNodeKind, string> = {
  // Obsidian 프리셋 색상 기반
  chapter:       "var(--canvas-node-chapter,      #a882ff)", // purple (6)
  character:     "var(--canvas-node-character,    #fb464c)", // red    (1)
  event:         "var(--canvas-node-event,        #e9973f)", // orange (2)
  faction:       "var(--canvas-node-faction,      #44cf6e)", // green  (4)
  term:          "var(--canvas-node-term,         #53dfdd)", // cyan   (5)
  "world-entity":"var(--canvas-node-world-entity, #e0de71)", // yellow (3)
} as const;

