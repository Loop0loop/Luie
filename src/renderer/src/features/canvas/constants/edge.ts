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
    stroke: "rgba(165, 180, 252, 0.45)", // 은은하고 매혹적인 별자리(Constellation) 바이올렛 블루
    widthMultiplier: 0.8, // 줌 아웃 시 시인성 확보를 위해 미세 증폭
    opacityBase: 0.35,
    opacityMultiplier: 0.15,
    dasharray: "4 6", // 뚜렷하지만 유려한 점선 형태의 성간선
    markerSize: undefined,
  },
  event: {
    stroke: "rgba(248, 113, 113, 0.75)", // 수사 드라마의 직관적인 빨간 실(Thread Red) 라이트닝 레드 테마
    widthMultiplier: 1.1,
    opacityBase: 0.50,
    opacityMultiplier: 0.20,
    markerSize: 10,
  },
} as const;
