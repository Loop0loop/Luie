/**
 * CanvasPane — viewport shell for the canvas feature.
 *
 * Layout:
 *   ┌─────────────── CanvasToolbar ───────────────┐
 *   │                                             │
 *   │   CanvasViewport (React-Flow)  or           │
 *   │   CanvasEmptyState (no scope / no nodes)    │
 *   │                                             │
 *   └─────────────── CanvasStatusBar ─────────────┘
 *
 * Hooks:
 *   useCanvasScope      — auto-sets scope from active chapter
 *   useCanvasProjection — derives status from worldBuildingStore
 */

import { Suspense } from "react";
import CanvasToolbar from "./viewport/CanvasToolbar";
import CanvasStatusBar from "./viewport/CanvasStatusBar";
import CanvasEmptyState from "./viewport/CanvasEmptyState";
import CanvasViewport from "./viewport/CanvasViewport";
import { useCanvasScope } from "../hooks/useCanvasScope";
import { useCanvasProjection } from "../hooks/useCanvasProjection";

const loadingFallback = (
  <div className="flex h-full items-center justify-center text-xs text-muted" />
);

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

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {status === "idle" || status === "error" ? (
          <CanvasEmptyState />
        ) : status === "loading" ? (
          loadingFallback
        ) : (
          <Suspense fallback={loadingFallback}>
            <CanvasViewport />
          </Suspense>
        )}
      </div>

      <CanvasStatusBar projection={projection} />
    </div>
  );
}
