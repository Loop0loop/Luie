/**
 * CanvasToolbar — canvas 뷰포트 상단 크롬.
 *
 * SRP:
 *   - 상수(MODE_I18N, RANGE_I18N 등)는 constants/index.ts에 위치합니다.
 *   - 이 컴포넌트는 렌더링과 인터랙션만 담당합니다.
 */

import { useTranslation } from "react-i18next";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
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
  CANVAS_AVAILABLE_MODES,
  type CanvasMode,
  type CanvasRange,
  type CanvasScope,
} from "../../types";
import {
  CANVAS_MODE_I18N,
  CANVAS_ALL_RANGES,
  CANVAS_RANGE_I18N,
} from "../../constants";



// ─── main component ───────────────────────────────────────────────────────────

export default function CanvasToolbar() {
  const { t } = useTranslation();

  // 안정적인 상태 (mode, scope)
  const { mode, scope } = useCanvasView();

  // viewport는 줌 표시용으로만 필요 — 별도 구독으로 분리
  const viewport = useCanvasViewStore(useShallow((s) => s.viewport));

  // actions는 관련된 것끼리 묶어서 한 번에 가져옴
  const { setMode, setScope, setViewport } = useCanvasViewStore(
    useShallow((s) => ({
      setMode:       s.setMode,
      setScope:      s.setScope,
      setViewport:   s.setViewport,
    })),
  );



  const zoomIn  = () => setViewport({ zoom: Math.min(CANVAS_ZOOM_MAX, viewport.zoom + CANVAS_ZOOM_STEP) });
  const zoomOut = () => setViewport({ zoom: Math.max(CANVAS_ZOOM_MIN, viewport.zoom - CANVAS_ZOOM_STEP) });
  const fitView = () => setViewport({ zoom: 1, pan: { x: 0, y: 0 } });

  return (
    <div
      className="flex shrink-0 items-center gap-1.5 border-b border-border/40 bg-sidebar px-2"
      style={{ height: CANVAS_TOOLBAR_HEIGHT_PX }}
      data-testid="canvas-toolbar"
    >

      <div className="flex-1" />

      <>
          <span className="text-[11px] text-muted tabular-nums">
            {Math.round(viewport.zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={zoomOut}
            title={t("canvas.toolbar.zoomOut")}
            className="flex h-7 w-7 items-center justify-center rounded text-subtle transition-colors hover:bg-surface hover:text-fg"
          >
            <ZoomOut className="icon-xs" />
          </button>
          <button
            type="button"
            onClick={zoomIn}
            title={t("canvas.toolbar.zoomIn")}
            className="flex h-7 w-7 items-center justify-center rounded text-subtle transition-colors hover:bg-surface hover:text-fg"
          >
            <ZoomIn className="icon-xs" />
          </button>
          <button
            type="button"
            onClick={fitView}
            title={t("canvas.toolbar.fitView")}
            className="flex h-7 w-7 items-center justify-center rounded text-subtle transition-colors hover:bg-surface hover:text-fg"
          >
            <Maximize2 className="icon-xs" />
          </button>
        </>
    </div>
  );
}
