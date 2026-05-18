/**
 * CanvasToolbar — canvas 뷰포트 상단 크롬.
 *
 * SRP:
 *   - 상수(MODE_I18N, RANGE_I18N 등)는 constants/index.ts에 위치합니다.
 *   - 이 컴포넌트는 렌더링과 인터랙션만 담당합니다.
 */

import { useTranslation } from "react-i18next";
import { ZoomIn, ZoomOut, Maximize2, ChevronDown } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { CANVAS_TOOLBAR_HEIGHT_PX } from "@shared/constants/layoutSizing";
import {
  CANVAS_ZOOM_MIN,
  CANVAS_ZOOM_MAX,
  CANVAS_ZOOM_STEP,
} from "@shared/constants/canvasSizing";
import { cn } from "@shared/types/utils";
import { useCanvasViewStore } from "../../stores";
import { useCanvasView } from "../../hooks/useCanvasView";
import {
  CANVAS_AVAILABLE_MODES,
  type CanvasMode,
  type CanvasRange,
  type CanvasScope,
  type CanvasType,
} from "../../types";
import {
  CANVAS_MODE_I18N,
  CANVAS_ALL_RANGES,
  CANVAS_RANGE_I18N,
} from "../../constants";

// ─── 순수 헬퍼 ───────────────────────────────────────────────────────────────

/**
 * scope에서 현재 챕터 ID를 추출합니다.
 * handleRangeChange에서 중복 추출 로직을 제거하기 위해 분리합니다.
 */
function getCurrentChapterId(scope: CanvasScope | null): string | null {
  if (!scope) return null;
  if (scope.kind === "single-chapter") return scope.chapterId;
  if (scope.kind === "three-chapters") return scope.centerChapterId;
  return null;
}

// ─── 상수 ────────────────────────────────────────────────────────────────────

const CANVAS_TYPE_OPTIONS: ReadonlyArray<{ value: CanvasType; i18nKey: string }> = [
  { value: "dynamic", i18nKey: "canvas.type.dynamic" },
  { value: "static",  i18nKey: "canvas.type.static"  },
] as const;

// ─── CanvasTypeToggle ─────────────────────────────────────────────────────────

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
              isActive ? "bg-panel text-fg shadow-sm" : "text-muted hover:text-fg",
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

  // 안정적인 상태 (canvasType, mode, scope)
  const { canvasType, mode, scope } = useCanvasView();

  // viewport는 줌 표시용으로만 필요 — 별도 구독으로 분리
  const viewport = useCanvasViewStore(useShallow((s) => s.viewport));

  // actions는 관련된 것끼리 묶어서 한 번에 가져옴
  const { setCanvasType, setMode, setScope, setViewport } = useCanvasViewStore(
    useShallow((s) => ({
      setCanvasType: s.setCanvasType,
      setMode:       s.setMode,
      setScope:      s.setScope,
      setViewport:   s.setViewport,
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
      const chapterId = getCurrentChapterId(scope);
      setScope(chapterId ? { kind: "single-chapter", chapterId } : null);
    } else if (range === "three-chapters") {
      const chapterId = getCurrentChapterId(scope);
      setScope(chapterId ? { kind: "three-chapters", centerChapterId: chapterId } : null);
    } else {
      setScope(null);
    }
  };

  const zoomIn  = () => setViewport({ zoom: Math.min(CANVAS_ZOOM_MAX, viewport.zoom + CANVAS_ZOOM_STEP) });
  const zoomOut = () => setViewport({ zoom: Math.max(CANVAS_ZOOM_MIN, viewport.zoom - CANVAS_ZOOM_STEP) });
  const fitView = () => setViewport({ zoom: 1, pan: { x: 0, y: 0 } });

  return (
    <div
      className="flex shrink-0 items-center gap-1.5 border-b border-border/40 bg-surface px-2"
      style={{ height: CANVAS_TOOLBAR_HEIGHT_PX }}
      data-testid="canvas-toolbar"
    >
      <CanvasTypeToggle value={canvasType} onChange={setCanvasType} />

      {isDynamic && (
        <>
          <span className="h-3 w-px bg-border/60" aria-hidden />

          <div className="relative">
            <select
              value={mode}
              onChange={(e) => {
                const next = e.target.value as CanvasMode;
                if ((CANVAS_AVAILABLE_MODES as readonly string[]).includes(next)) {
                  setMode(next);
                }
              }}
              className={cn(
                "appearance-none rounded border border-border/60 bg-element px-2 py-0.5 pr-5",
                "cursor-pointer text-[11px] text-fg focus:border-accent focus:outline-none",
              )}
              aria-label={t("canvas.panel.views")}
            >
              {(Object.keys(CANVAS_MODE_I18N) as CanvasMode[]).map((m) => {
                const available = (CANVAS_AVAILABLE_MODES as readonly string[]).includes(m);
                return (
                  <option key={m} value={m} disabled={!available}>
                    {t(CANVAS_MODE_I18N[m])}
                    {!available ? ` (${t("canvas.mode.comingSoon")})` : ""}
                  </option>
                );
              })}
            </select>
            <ChevronDown className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 icon-xs text-muted" />
          </div>

          <span className="h-3 w-px bg-border/60" aria-hidden />

          <div className="relative">
            <select
              value={currentRange}
              onChange={(e) => handleRangeChange(e.target.value as CanvasRange)}
              className={cn(
                "appearance-none rounded border border-border/60 bg-element px-2 py-0.5 pr-5",
                "cursor-pointer text-[11px] text-fg focus:border-accent focus:outline-none",
              )}
              aria-label={t("canvas.panel.range")}
            >
              {CANVAS_ALL_RANGES.map((r) => (
                <option key={r} value={r}>
                  {t(CANVAS_RANGE_I18N[r])}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 icon-xs text-muted" />
          </div>
        </>
      )}

      <div className="flex-1" />

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
