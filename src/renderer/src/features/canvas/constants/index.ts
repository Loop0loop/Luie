/**
 * canvas/constants/index.ts
 *
 * Canvas feature 내부 런타임 상수.
 *
 * 위치 결정 원칙:
 *   - 숫자/크기 상수 (px, zoom 등)  → @shared/constants/canvasSizing.ts
 *   - 타입 선언                      → canvas/types/
 *   - 런타임 구성 데이터 (배열, 객체) → 여기 (canvas/constants/)
 */

import type { CanvasActivityPanel } from "../types/canvas.types";

// ─── SidePanelRouter — 패널 라우팅 키 목록 ───────────────────────────────────

export const CANVAS_PANEL_KEYS: ReadonlyArray<CanvasActivityPanel> = [
  "explorer",
  "canvas",
  "entities",
  "memory",
  "search",
] as const;

// ─── CanvasIconRail — 아이콘 레일 아이템 정의 ─────────────────────────────────
// i18nKey는 `canvas.activity.${i18nKey}` 형태로 사용합니다.

export interface CanvasRailItem {
  readonly panel: CanvasActivityPanel;
  readonly i18nKey: string;
  readonly iconName: "Compass" | "LayoutGrid" | "Users" | "Brain" | "Search";
}

export const CANVAS_RAIL_ITEMS: ReadonlyArray<CanvasRailItem> = [
  { panel: "explorer",  i18nKey: "explorer",  iconName: "Compass"    },
  { panel: "canvas",    i18nKey: "canvas",    iconName: "LayoutGrid" },
  { panel: "entities",  i18nKey: "entities",  iconName: "Users"      },
  { panel: "memory",    i18nKey: "memory",    iconName: "Brain"      },
  { panel: "search",    i18nKey: "search",    iconName: "Search"     },
] as const;

// ─── Edge style defaults ──────────────────────────────────────────────────────
// RelationEdge (엔티티 관계 엣지) 기본값

export const CANVAS_RELATION_EDGE_DEFAULTS = {
  strokeWidth: 1.5,
  strokeWidthSelected: 2,
  opacity: 0.6,
  opacitySelected: 1,
  transitionDuration: 150,
} as const;

// FreeEdge (자유 연결 캔버스 엣지) 기본값
export const CANVAS_FREE_EDGE_DEFAULTS = {
  strokeWidth: 2,
  strokeWidthSelected: 2.5,
  opacity: 0.8,
  opacitySelected: 1,
  transitionDuration: 150,
} as const;

// ─── 하위 호환 alias (이전 이름 → 새 이름) ───────────────────────────────────
// @deprecated CANVAS_EDGE_DEFAULTS → CANVAS_RELATION_EDGE_DEFAULTS
// @deprecated CANVAS_CANVAS_EDGE_DEFAULTS → CANVAS_FREE_EDGE_DEFAULTS
export const CANVAS_EDGE_DEFAULTS = CANVAS_RELATION_EDGE_DEFAULTS;
export const CANVAS_CANVAS_EDGE_DEFAULTS = CANVAS_FREE_EDGE_DEFAULTS;
