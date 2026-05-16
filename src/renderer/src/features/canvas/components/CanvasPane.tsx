/**
 * CanvasPane — viewport shell for the canvas feature.
 *
 * P5 layout:
 *   ┌─────────────── CanvasToolbar ───────────────┐
 *   │                                             │
 *   │   CanvasViewport (nodes/edges) or           │
 *   │   CanvasEmptyState (no scope/nodes)         │
 *   │                                             │
 *   └─────────────── CanvasStatusBar ─────────────┘
 *
 * Hooks:
 *   useCanvasScope     — auto-sets scope from active chapter
 *   useCanvasProjection — builds projection from worldBuildingStore
 */
import CanvasToolbar from "./viewport/CanvasToolbar";
import CanvasStatusBar from "./viewport/CanvasStatusBar";
import CanvasEmptyState from "./viewport/CanvasEmptyState";
import CanvasViewport from "./viewport/CanvasViewport";
import { useCanvasScope } from "../hooks/useCanvasScope";
import { useCanvasProjection } from "../hooks/useCanvasProjection";

export default function CanvasPane() {
  // Auto-resolve scope from active chapter.
  useCanvasScope();

  const { projection, status } = useCanvasProjection();

  return (
    <div
      className="flex h-full w-full flex-col bg-canvas"
      data-testid="canvas-pane"
    >
      <CanvasToolbar />

      <div className="relative flex-1 min-h-0 overflow-hidden">
        {status === "idle" || status === "error" || !projection ? (
          <CanvasEmptyState />
        ) : status === "loading" ? (
          <div className="flex h-full items-center justify-center text-xs text-muted">
            {/* loading state — projection is being built */}
          </div>
        ) : (
          <CanvasViewport projection={projection} />
        )}
      </div>

      <CanvasStatusBar projection={projection} />
    </div>
  );
}
