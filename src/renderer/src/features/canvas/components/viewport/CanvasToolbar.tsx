/**
 * CanvasToolbar — top chrome of the canvas viewport.
 *
 * P3 shell: lays out fixed-height bar with placeholder slots for the mode
 * dropdown, range picker, and zoom controls. Wiring to canvasViewStore arrives
 * in P5.
 */
import { useTranslation } from "react-i18next";
import { CANVAS_TOOLBAR_HEIGHT_PX } from "@shared/constants/layoutSizing";

export default function CanvasToolbar() {
  const { t } = useTranslation();
  return (
    <div
      className="flex shrink-0 items-center gap-2 border-b border-border/40 bg-surface px-3 text-xs text-muted"
      style={{ height: CANVAS_TOOLBAR_HEIGHT_PX }}
      data-testid="canvas-toolbar"
    >
      {/* Mode dropdown — wired in P5 */}
      <span className="opacity-60" aria-hidden>
        {t("canvas.panel.views")}
      </span>
      <span className="h-3 w-px bg-border/60" aria-hidden />
      {/* Range picker — wired in P5 */}
      <span className="opacity-60" aria-hidden>
        {t("canvas.panel.range")}
      </span>
      <div className="ml-auto flex items-center gap-1">
        {/* Zoom controls — wired in P5 */}
        <span className="opacity-60" aria-hidden>
          {t("canvas.toolbar.zoomOut")}
        </span>
        <span className="opacity-60" aria-hidden>
          {t("canvas.toolbar.zoomIn")}
        </span>
        <span className="opacity-60" aria-hidden>
          {t("canvas.toolbar.fitView")}
        </span>
      </div>
    </div>
  );
}
