/**
 * Canvas 공통 상수.
 *
 * 컴포넌트 안에서 매직 넘버나 한국어 문자열을 하드코딩하지 않는다.
 * 라벨은 i18n key로 두고, 너비/사이즈는 여기서 한 번에 관리한다.
 */

import type {
  CanvasLayerId,
  CanvasNodeFilterId,
  CanvasScope,
} from "../types";

/**
 * 레이아웃 너비/높이.
 *
 * - DEFAULT_RATIO_*: 첫 렌더에서 사용할 비율(%). 컨테이너 너비를 모를 때 fallback.
 * - *_PX: 컨테이너 너비를 알 때 % 변환에 쓰는 픽셀 기준값.
 *
 * 비율과 px는 둘 다 필요하다. 컨테이너가 마운트되기 전에는 비율로
 * 첫 렌더가 안정되어야 하고, 측정 후에는 px 기반 클램프가 정확해야 한다.
 */
export const CANVAS_LAYOUT = {
  // 기본 비율 (1440px 기준 산출)
  // Obsidian/Scrivener 풍: 양 사이드는 좁고 본문이 넓다.
  SIDEBAR_DEFAULT_RATIO: 16,
  BINDER_DEFAULT_RATIO: 18,
  // 픽셀 제약 — Inspector 패턴에 맞춘 좁은 폭.
  SIDEBAR_MIN_PX: 200,
  SIDEBAR_MAX_PX: 320,
  BINDER_MIN_PX: 240,
  BINDER_MAX_PX: 360,
  // 레이아웃 기타
  TOOLBAR_HEIGHT: 36,
} as const;

/** Sidebar / Binder 섹션 i18n key */
export const CANVAS_SECTION_KEYS = {
  scope: "canvas.sidebar.scope.title",
  display: "canvas.sidebar.display.title",
  advanced: "canvas.sidebar.advanced.title",
  filters: "canvas.sidebar.filters.title",
  inspector: "canvas.binder.inspector.title",
  related: "canvas.binder.related.title",
  suggestions: "canvas.binder.suggestions.title",
  agent: "canvas.binder.agent.title",
} as const;

/** Scope 프리셋. label은 i18n key. */
export interface CanvasScopePreset {
  id: string;
  labelKey: string;
  scope: CanvasScope;
}

export const CANVAS_SCOPE_PRESETS: readonly CanvasScopePreset[] = [
  {
    id: "all",
    labelKey: "canvas.sidebar.scope.preset.all",
    scope: { kind: "all" },
  },
] as const;

/** Layer 토글 옵션 */
export interface CanvasLayerOption {
  id: CanvasLayerId;
  labelKey: string;
  hintKey?: string;
}

/** 사이드바 "표시" 섹션의 핵심 레이어 — 항상 노출. */
export const CANVAS_LAYER_PRIMARY: readonly CanvasLayerOption[] = [
  {
    id: "canonical",
    labelKey: "canvas.sidebar.layers.canonical.label",
    hintKey: "canvas.sidebar.layers.canonical.hint",
  },
  {
    id: "derived",
    labelKey: "canvas.sidebar.layers.derived.label",
    hintKey: "canvas.sidebar.layers.derived.hint",
  },
  {
    id: "timeline",
    labelKey: "canvas.sidebar.layers.timeline.label",
  },
] as const;

/** 사이드바 "고급 옵션" — 기본 접힘. */
export const CANVAS_LAYER_ADVANCED: readonly CanvasLayerOption[] = [
  {
    id: "relation-strength",
    labelKey: "canvas.sidebar.layers.relationStrength.label",
  },
  {
    id: "conflict",
    labelKey: "canvas.sidebar.layers.conflict.label",
  },
  {
    id: "foreshadowing",
    labelKey: "canvas.sidebar.layers.foreshadowing.label",
  },
] as const;

/** Layers 전체 — 호환용. (loop 등 기존 코드용) */
export const CANVAS_LAYER_OPTIONS: readonly CanvasLayerOption[] = [
  ...CANVAS_LAYER_PRIMARY,
  ...CANVAS_LAYER_ADVANCED,
] as const;

/** Filter 옵션 */
export interface CanvasFilterOption {
  id: CanvasNodeFilterId;
  labelKey: string;
}

export const CANVAS_FILTER_OPTIONS: readonly CanvasFilterOption[] = [
  { id: "episode", labelKey: "canvas.sidebar.filters.episode" },
  { id: "character", labelKey: "canvas.sidebar.filters.character" },
  { id: "event", labelKey: "canvas.sidebar.filters.event" },
  { id: "place", labelKey: "canvas.sidebar.filters.place" },
  { id: "note", labelKey: "canvas.sidebar.filters.note" },
  { id: "relation", labelKey: "canvas.sidebar.filters.relation" },
] as const;

/** Toolbar 액션 */
export const CANVAS_TOOLBAR_ACTION_KEYS = {
  addNode: "canvas.toolbar.addNode",
  addNote: "canvas.toolbar.addNote",
  connect: "canvas.toolbar.connect",
  group: "canvas.toolbar.group",
  autoLayout: "canvas.toolbar.autoLayout",
  fitView: "canvas.toolbar.fitView",
  searchPlaceholder: "canvas.toolbar.searchPlaceholder",
} as const;

/** Agent 액션 ID. label key는 별도 매핑한다. */
export const CANVAS_AGENT_ACTIONS = {
  summarizeScope: "canvas.binder.agent.summarizeScope",
  processCandidates: "canvas.binder.agent.processCandidates",
  checkTimeline: "canvas.binder.agent.checkTimeline",
  edgeConflict: "canvas.binder.agent.edgeConflict",
  summarizeNode: "canvas.binder.agent.summarizeNode",
  findRelated: "canvas.binder.agent.findRelated",
} as const;

/** Stage 그리드 표시 */
export const CANVAS_STAGE = {
  GRID_GAP: 16,
  GRID_DOT_SIZE: 1,
} as const;
