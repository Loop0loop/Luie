/**
 * edge.ts — 엣지 스타일 기본값.
 *
 * RelationEdge, CanvasEdge 컴포넌트에서 사용합니다.
 * 인라인 매직 넘버를 제거하고 한 곳에서 관리합니다.
 */

/** getSmoothStepPath borderRadius — CanvasEdge(FreeEdge) 경로 곡률 */
export const CANVAS_EDGE_BORDER_RADIUS = 12 as const;

// ─── RelationEdge (엔티티 관계 엣지) ─────────────────────────────────────────

export const CANVAS_RELATION_EDGE_DEFAULTS = {
  strokeWidth:         1.5,
  strokeWidthSelected: 2,
  opacity:             0.6,
  opacitySelected:     1,
  transitionDuration:  150,
} as const;

// ─── FreeEdge (자유 연결 캔버스 엣지) ────────────────────────────────────────

export const CANVAS_FREE_EDGE_DEFAULTS = {
  strokeWidth:         2,
  strokeWidthSelected: 2.5,
  opacity:             0.8,
  opacitySelected:     1,
  transitionDuration:  150,
} as const;

// ─── 하위 호환 alias ──────────────────────────────────────────────────────────
// @deprecated → CANVAS_RELATION_EDGE_DEFAULTS
export const CANVAS_EDGE_DEFAULTS = CANVAS_RELATION_EDGE_DEFAULTS;
// @deprecated → CANVAS_FREE_EDGE_DEFAULTS
export const CANVAS_CANVAS_EDGE_DEFAULTS = CANVAS_FREE_EDGE_DEFAULTS;

// ─── World Graph Constellation Edge Style Configuration ───────────────────
export const GRAPH_CONSTELLATION_EDGE_DEFAULTS = {
  character: {
    stroke: "var(--border-strong, rgba(255, 255, 255, 0.15))",
    widthMultiplier: 0.5,
    opacityBase: 0.25,
    opacityMultiplier: 0.12,
    dasharray: "4 4",
    markerSize: undefined,
  },
  event: {
    stroke: "var(--border-strong, rgba(255, 255, 255, 0.25))",
    widthMultiplier: 0.6,
    opacityBase: 0.3,
    opacityMultiplier: 0.12,
    markerSize: 9,
  },
} as const;
