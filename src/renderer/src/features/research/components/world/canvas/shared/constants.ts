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

/** 레이아웃 너비/높이 (px) */
export const CANVAS_LAYOUT = {
  SIDEBAR_WIDTH: 260,
  BINDER_WIDTH: 360,
  TOOLBAR_HEIGHT: 40,
  SIDEBAR_MIN_WIDTH: 220,
  BINDER_MIN_WIDTH: 320,
} as const;

/** Sidebar / Binder 섹션 i18n key */
export const CANVAS_SECTION_KEYS = {
  scope: "canvas.sidebar.scope.title",
  outline: "canvas.sidebar.outline.title",
  layers: "canvas.sidebar.layers.title",
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

export const CANVAS_LAYER_OPTIONS: readonly CanvasLayerOption[] = [
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
