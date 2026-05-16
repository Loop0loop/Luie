/**
 * CanvasStatusBar — bottom chrome of the canvas viewport.
 *
 * P3 shell: fixed-height bar with placeholder slots for active mode label,
 * chapter title, and node/edge count. Wiring to canvasViewStore arrives in P5.
 */
import { CANVAS_STATUS_BAR_HEIGHT_PX } from "@shared/constants/layoutSizing";

export default function CanvasStatusBar() {
  return (
    <div
      className="flex shrink-0 items-center gap-3 border-t border-border/40 bg-surface px-3 text-[11px] text-muted"
      style={{ height: CANVAS_STATUS_BAR_HEIGHT_PX }}
      data-testid="canvas-status-bar"
    >
      {/* Mode label — wired in P5 */}
      <span className="opacity-60" aria-hidden />
      {/* Chapter title — wired in P5 */}
      <span className="ml-2 opacity-60" aria-hidden />
      {/* Node / edge counts — wired in P5 */}
      <span className="ml-auto opacity-60" aria-hidden />
    </div>
  );
}
