import { useTranslation } from "react-i18next";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { useReactFlow } from "reactflow";
import { CANVAS_TOOLBAR_HEIGHT_PX } from "@shared/constants/layoutSizing";

export default function GraphToolbar() {
  const { t } = useTranslation();
  const { zoomIn, zoomOut, fitView, getViewport } = useReactFlow();

  const viewport = getViewport();

  return (
    <div
      className="flex shrink-0 items-center gap-1.5 border-b border-border/40 bg-sidebar px-2"
      style={{ height: CANVAS_TOOLBAR_HEIGHT_PX }}
      data-testid="graph-toolbar"
    >
      <div className="flex-1 px-2 text-sm font-medium text-fg">
        {t("canvas.activity.graph")}
      </div>

      <span className="text-[11px] text-muted tabular-nums">
        {Math.round(viewport.zoom * 100)}%
      </span>
      <button
        type="button"
        onClick={() => zoomOut()}
        title={t("canvas.toolbar.zoomOut")}
        className="flex h-7 w-7 items-center justify-center rounded text-subtle transition-colors hover:bg-surface hover:text-fg"
      >
        <ZoomOut className="icon-xs" />
      </button>
      <button
        type="button"
        onClick={() => zoomIn()}
        title={t("canvas.toolbar.zoomIn")}
        className="flex h-7 w-7 items-center justify-center rounded text-subtle transition-colors hover:bg-surface hover:text-fg"
      >
        <ZoomIn className="icon-xs" />
      </button>
      <button
        type="button"
        onClick={() => fitView()}
        title={t("canvas.toolbar.fitView")}
        className="flex h-7 w-7 items-center justify-center rounded text-subtle transition-colors hover:bg-surface hover:text-fg"
      >
        <Maximize2 className="icon-xs" />
      </button>
    </div>
  );
}
