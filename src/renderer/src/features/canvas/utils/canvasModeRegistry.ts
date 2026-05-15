import {
  Boxes,
  CalendarRange,
  Network,
  Sparkles,
  StickyNote,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { CANVAS_MODE_ENABLED } from "../types/canvas.types";
import type {
  CanvasFocus,
  CanvasLayer,
  CanvasMode,
  CanvasViewPreset,
} from "../types/canvas.types";

/**
 * Mode 메타 — 아이콘/i18n key/사용 가능 여부.
 *
 * 컴포넌트는 이 레지스트리만 보고 IconBar/ActivityBar를 렌더한다.
 * Mode 추가는 (1) `CanvasMode` union 확장, (2) 여기 한 줄 추가, (3)
 * stage/modes/<mode>/ 구현 — 세 군데만 만지면 끝나도록 의도.
 */
export interface CanvasModeMeta {
  id: CanvasMode;
  icon: LucideIcon;
  /** IconBar 툴팁용 라벨 i18n key. */
  labelKey: string;
  /** ActivityBar 헤더용 짧은 설명 i18n key. */
  descriptionKey: string;
  enabled: boolean;
}

export const CANVAS_MODES: readonly CanvasModeMeta[] = [
  {
    id: "flow-map",
    icon: Workflow,
    labelKey: "canvas.mode.flowMap.label",
    descriptionKey: "canvas.mode.flowMap.description",
    enabled: CANVAS_MODE_ENABLED["flow-map"],
  },
  {
    id: "scene-board",
    icon: Boxes,
    labelKey: "canvas.mode.sceneBoard.label",
    descriptionKey: "canvas.mode.sceneBoard.description",
    enabled: CANVAS_MODE_ENABLED["scene-board"],
  },
  {
    id: "timeline",
    icon: CalendarRange,
    labelKey: "canvas.mode.timeline.label",
    descriptionKey: "canvas.mode.timeline.description",
    enabled: CANVAS_MODE_ENABLED.timeline,
  },
  {
    id: "character-map",
    icon: Users,
    labelKey: "canvas.mode.characterMap.label",
    descriptionKey: "canvas.mode.characterMap.description",
    enabled: CANVAS_MODE_ENABLED["character-map"],
  },
  {
    id: "memory-map",
    icon: Network,
    labelKey: "canvas.mode.memoryMap.label",
    descriptionKey: "canvas.mode.memoryMap.description",
    enabled: CANVAS_MODE_ENABLED["memory-map"],
  },
];

/** Mode lookup. 컴포넌트가 직접 배열을 find하지 않게. */
export function getCanvasModeMeta(mode: CanvasMode): CanvasModeMeta {
  const meta = CANVAS_MODES.find((m) => m.id === mode);
  if (!meta) {
    throw new Error(`Unknown CanvasMode: ${mode}`);
  }
  return meta;
}

/** 사용 가능한 첫 번째 mode를 기본 active로 사용. */
export function getDefaultCanvasMode(): CanvasMode {
  const enabled = CANVAS_MODES.find((m) => m.enabled);
  return enabled ? enabled.id : "flow-map";
}

/**
 * View Preset 레지스트리. 셸 단계에서는 라벨만 노출하고 적용 로직은
 * canvasViewStore 액션에서 분기한다.
 */
export interface CanvasPresetMeta {
  id: CanvasViewPreset;
  labelKey: string;
}

export const CANVAS_PRESETS: readonly CanvasPresetMeta[] = [
  { id: "current-chapter", labelKey: "canvas.preset.currentChapter" },
  { id: "arc-view", labelKey: "canvas.preset.arcView" },
  { id: "conflict-view", labelKey: "canvas.preset.conflictView" },
  { id: "foreshadow-view", labelKey: "canvas.preset.foreshadowView" },
];

/** Layer 레지스트리. */
export interface CanvasLayerMeta {
  id: CanvasLayer;
  labelKey: string;
  icon?: LucideIcon;
}

export const CANVAS_LAYERS: readonly CanvasLayerMeta[] = [
  { id: "scene", labelKey: "canvas.layer.scene" },
  { id: "character", labelKey: "canvas.layer.character", icon: Users },
  { id: "event", labelKey: "canvas.layer.event", icon: CalendarRange },
  { id: "memo", labelKey: "canvas.layer.memo", icon: StickyNote },
  { id: "ai-hint", labelKey: "canvas.layer.aiHint", icon: Sparkles },
];

/** Focus 레지스트리. */
export interface CanvasFocusMeta {
  id: CanvasFocus;
  labelKey: string;
}

export const CANVAS_FOCUSES: readonly CanvasFocusMeta[] = [
  { id: "character", labelKey: "canvas.focus.character" },
  { id: "event", labelKey: "canvas.focus.event" },
  { id: "location", labelKey: "canvas.focus.location" },
  { id: "foreshadow", labelKey: "canvas.focus.foreshadow" },
  { id: "conflict", labelKey: "canvas.focus.conflict" },
];
