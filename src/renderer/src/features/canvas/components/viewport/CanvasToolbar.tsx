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
import { useCanvasViewStore } from "../../stores";
import { createViewportActions } from "../../utils/viewportActions";




// ─── main component ───────────────────────────────────────────────────────────

export default function CanvasToolbar() {
  const { t } = useTranslation();

  // viewport는 줌 표시용으로만 필요 — 별도 구독으로 분리
  const viewport = useCanvasViewStore(useShallow((s) => s.viewport));

  const setViewport = useCanvasViewStore((s) => s.setViewport);

  const actions = createViewportActions(viewport.zoom);
  const zoomIn  = () => setViewport(actions.zoomIn());
  const zoomOut = () => setViewport(actions.zoomOut());
  const fitView = () => setViewport(actions.fitView());

  return (
    <div
      className="flex shrink-0 items-center gap-1.5 border-b border-border/40 bg-sidebar px-control-x"
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
            className="flex h-control-y w-control-x items-center justify-center rounded-control text-subtle transition-colors hover:bg-surface hover:text-fg"
          >
            <ZoomOut className="icon-xs" />
          </button>
          <button
            type="button"
            onClick={zoomIn}
            title={t("canvas.toolbar.zoomIn")}
            className="flex h-control-y w-control-x items-center justify-center rounded-control text-subtle transition-colors hover:bg-surface hover:text-fg"
          >
            <ZoomIn className="icon-xs" />
          </button>
          <button
            type="button"
            onClick={fitView}
            title={t("canvas.toolbar.fitView")}
            className="flex h-control-y w-control-x items-center justify-center rounded-control text-subtle transition-colors hover:bg-surface hover:text-fg"
          >
            <Maximize2 className="icon-xs" />
          </button>
        </>
    </div>
  );
}
