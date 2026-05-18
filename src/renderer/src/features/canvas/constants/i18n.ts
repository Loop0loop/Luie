/**
 * i18n.ts — canvas 피처 i18n 키 맵 및 목록.
 *
 * CanvasToolbar, CanvasStatusBar, CanvasControlPanel에서 공유합니다.
 * 실제 번역 문자열은 src/renderer/src/i18n/locales/ 에 있습니다.
 */

import type { CanvasLayer, CanvasMode, CanvasRange } from "../types/canvas.types";

// ─── Mode ─────────────────────────────────────────────────────────────────────

export const CANVAS_MODE_I18N: Record<CanvasMode, string> = {
  "flow-map":      "canvas.mode.flowMap.label",
  "scene-board":   "canvas.mode.sceneBoard.label",
  "timeline":      "canvas.mode.timeline.label",
  "character-map": "canvas.mode.characterMap.label",
  "memory-map":    "canvas.mode.memoryMap.label",
} as const;

// ─── Range ────────────────────────────────────────────────────────────────────

export const CANVAS_ALL_RANGES: ReadonlyArray<CanvasRange> = [
  "current-chapter",
  "three-chapters",
  "current-part",
  "whole-project",
] as const;

export const CANVAS_RANGE_I18N: Record<CanvasRange, string> = {
  "current-chapter": "canvas.range.currentChapter",
  "three-chapters":  "canvas.range.threeChapters",
  "current-part":    "canvas.range.currentPart",
  "whole-project":   "canvas.range.wholeProject",
} as const;

// ─── Layer ────────────────────────────────────────────────────────────────────

export const CANVAS_ALL_LAYERS: ReadonlyArray<CanvasLayer> = [
  "scene",
  "character",
  "event",
  "memo",
  "ai-hint",
] as const;

export const CANVAS_LAYER_I18N: Record<CanvasLayer, string> = {
  "scene":     "canvas.layer.scene",
  "character": "canvas.layer.character",
  "event":     "canvas.layer.event",
  "memo":      "canvas.layer.memo",
  "ai-hint":   "canvas.layer.aiHint",
} as const;
