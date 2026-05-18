/**
 * CanvasToolbar — canvas 뷰포트 상단 크롬.
 *
 * 좌측: [동적 | 정적] 세그먼트 토글
 *   - 동적 모드: 모드 드롭다운 + 범위 드롭다운 표시
 *   - 정적 모드: 드롭다운 숨김
 * 우측: 줌 퍼센트 + 줌 컨트롤 (동적 모드에서만 — 정적 모드는 우측 툴바가 담당)
 */

import { useTranslation } from "react-i18next";
import { ZoomIn, ZoomOut, Maximize2, ChevronDown } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { CANVAS_TOOLBAR_HEIGHT_PX } from "@shared/constants/layoutSizing";
import { cn } from "@shared/types/utils";
import { useCanvasViewStore } from "../../stores";
import {
  CANVAS_AVAILABLE_MODES,
  type CanvasMode,
  type CanvasRange,
  type CanvasType,
} from "../../types";

// ─── constants ────────────────────────────────────────────────────────────────

const MODE_I18N: Record<CanvasMode, string> = {
  "flow-map": "canvas.mode.flowMap.label",
  "scene-board": "canvas.mode.sceneBoard.label",
  "timeline": "canvas.mode.timeline.label",
  "character-map": "canvas.mode.characterMap.label",
  "memory-map": "canvas.mode.memoryMap.label",
};

const RANGE_I18N: Record<CanvasRange, string> = {
  "current-chapter": "canvas.range.currentChapter",
  "three-chapters": "canvas.range.threeChapters",
  "current-part": "canvas.range.currentPart",
  "whole-project": "canvas.range.wholeProject",
};

const ALL_RANGES: CanvasRange[] = [
  "current-chapter",
  "three-chapters",
  "current-part",
  "whole-project",
];

const ZOOM_STEP = 0.15;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 3;

const CANVAS_TYPE_OPTIONS: { value: CanvasType; i18nKey: string }[] = [
  { value: "dynamic", i18nKey: "canvas.type.dynamic" },
  { value: "static", i18nKey: "canvas.type.static" },
];

// ─── sub-components ───────────────────────────────────────────────────────────

function CanvasTypeToggle({
  value,
  onChange,
}: {
  value: CanvasType;
  onChange: (type: CanvasType) => void;
}) {
  const { t } = useTranslation();

  return (
    <div
      className="flex h-5 items-center rounded border border-border/60 bg-element p-px"
      role="group"
      aria-label={t("canvas.type.label")}
    >
      {CANVAS_TYPE_OPTIONS.map(({ value: optValue, i18nKey }) => {
        const isActive = value === optValue;
        return (
          <button
            key={optValue}
            type="button"
            onClick={() => onChange(optValue)}
            aria-pressed={isActive}
            className={cn(
              "h-full rounded-sm px-2 text-[10px] font-medium leading-none transition-colors",
              isActive
                ? "bg-panel text-fg shadow-sm"
                : "text-muted hover:text-fg",
            )}
          >
            {t(i18nKey)}
          </button>
        );
      })}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function CanvasToolbar() {
  const { t } = useTranslation();

  const {
    canvasType,
    mode,
    scope,
    viewport,
    setCanvasType,
    setMode,
    setScope,
    setViewport,
  } = useCanvasViewStore(
    useShallow((state) => ({
      canvasType: state.canvasType,
      mode: state.mode,
      scope: state.scope,
      viewport: state.viewport,
      setCanvasType: state.setCanvasType,
      setMode: state.setMode,
      setScope: state.setScope,
      setViewport: state.setViewport,
    })),
  );

  const isDynamic = canvasType === "dynamic";

  const currentRange: CanvasRange = (() => {
    if (!scope) return "current-chapter";
    if (scope.kind === "single-chapter") return "current-chapter";
    if (scope.kind === "three-chapters") return "three-chapters";
    if (scope.kind === "current-part") return "current-part";
    return "whole-project";
  })();

  const handleRangeChange = (range: CanvasRange) => {
    if (range === "current-chapter") {
      const chapterId =
        scope?.kind === "single-chapter"
          ? scope.chapterId
          : scope?.kind === "three-chapters"
            ? scope.centerChapterId
            : null;
      setScope(chapterId ? { kind: "single-chapter", chapterId } : null);
    } else if (range === "three-chapters") {
      const chapterId =
        scope?.kind === "single-chapter"
          ? scope.chapterId
          : scope?.kind === "three-chapters"
            ? scope.centerChapterId
            : null;
      setScope(
        chapterId
          ? { kind: "three-chapters", centerChapterId: chapterId }
          : null,
      );
    } else {
      setScope(null);
    }
  };

  const zoomIn = () =>
    setViewport({ zoom: Math.min(ZOOM_MAX, viewport.zoom + ZOOM_STEP) });
  const zoomOut = () =>
    setViewport({ zoom: Math.max(ZOOM_MIN, viewport.zoom - ZOOM_STEP) });
  const fitView = () => setViewport({ zoom: 1, pan: { x: 0, y: 0 } });

  return (
    <div
      className="flex shrink-0 items-center gap-1.5 border-b border-border/40 bg-surface px-2"
      style={{ height: CANVAS_TOOLBAR_HEIGHT_PX }}
      data-testid="canvas-toolbar"
    >
      {/* ── 동적 / 정적 토글 ── */}
      <CanvasTypeToggle value={canvasType} onChange={setCanvasType} />

      {/* ── 동적 모드 전용 컨트롤 ── */}
      {isDynamic && (
        <>
          <span className="h-3 w-px bg-border/60" aria-hidden />

          {/* Mode selector */}
          <div className="relative">
            <select
              value={mode}
              onChange={(e) => {
                const next = e.target.value as CanvasMode;
                if (
                  (CANVAS_AVAILABLE_MODES as readonly string[]).includes(next)
                ) {
                  setMode(next);
                }
              }}
              className={cn(
                "appearance-none rounded border border-border/60 bg-element px-2 py-0.5 pr-5",
                "cursor-pointer text-[11px] text-fg",
                "focus:border-accent focus:outline-none",
              )}
              aria-label={t("canvas.panel.views")}
            >
              {(Object.keys(MODE_I18N) as CanvasMode[]).map((m) => {
                const available = (
                  CANVAS_AVAILABLE_MODES as readonly string[]
                ).includes(m);
                return (
                  <option key={m} value={m} disabled={!available}>
                    {t(MODE_I18N[m])}
                    {!available ? ` (${t("canvas.mode.comingSoon")})` : ""}
                  </option>
                );
              })}
            </select>
            <ChevronDown className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 icon-xs text-muted" />
          </div>

          <span className="h-3 w-px bg-border/60" aria-hidden />

          {/* Range selector */}
          <div className="relative">
            <select
              value={currentRange}
              onChange={(e) =>
                handleRangeChange(e.target.value as CanvasRange)
              }
              className={cn(
                "appearance-none rounded border border-border/60 bg-element px-2 py-0.5 pr-5",
                "cursor-pointer text-[11px] text-fg",
                "focus:border-accent focus:outline-none",
              )}
              aria-label={t("canvas.panel.range")}
            >
              {ALL_RANGES.map((r) => (
                <option key={r} value={r}>
                  {t(RANGE_I18N[r])}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 icon-xs text-muted" />
          </div>
        </>
      )}

      {/* ── Spacer ── */}
      <div className="flex-1" />

      {/* ── 동적 모드 줌 컨트롤 (정적 모드는 우측 툴바가 담당) ── */}
      {isDynamic && (
        <>
          <span className="text-[11px] text-muted tabular-nums">
            {Math.round(viewport.zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={zoomOut}
            title={t("canvas.toolbar.zoomOut")}
            className="flex h-6 w-6 items-center justify-center rounded text-muted transition-colors hover:bg-surface-hover hover:text-fg"
          >
            <ZoomOut className="icon-xs" />
          </button>
          <button
            type="button"
            onClick={zoomIn}
            title={t("canvas.toolbar.zoomIn")}
            className="flex h-6 w-6 items-center justify-center rounded text-muted transition-colors hover:bg-surface-hover hover:text-fg"
          >
            <ZoomIn className="icon-xs" />
          </button>
          <button
            type="button"
            onClick={fitView}
            title={t("canvas.toolbar.fitView")}
            className="flex h-6 w-6 items-center justify-center rounded text-muted transition-colors hover:bg-surface-hover hover:text-fg"
          >
            <Maximize2 className="icon-xs" />
          </button>
        </>
      )}
    </div>
  );
}
