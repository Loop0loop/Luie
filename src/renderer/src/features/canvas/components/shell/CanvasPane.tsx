/**
 * CanvasPane — canvas 피처 뷰포트 셸.
 *
 *   "graph" 패널일 경우 GraphWorkspace를 렌더링하고,
 *   그 외의 경우 CanvasToolbar + StaticCanvasViewport를 렌더링합니다.
 *
 * Layout:
 *   ┌─────────────── CanvasToolbar ───────────────┐
 *   │                                             │
 *   │   Static Viewport                           │
 *   │                                             │
 *   └─────────────── CanvasStatusBar ─────────────┘
 */

import { lazy, Suspense } from "react";
import { useCanvasViewStore } from "../../stores";
import { FeatureErrorBoundary } from "@renderer/shared/error-boundaries/FeatureErrorBoundary";
import CanvasToolbar from "../viewport/CanvasToolbar";
import CanvasStatusBar from "../viewport/CanvasStatusBar";
import GraphWorkspace from "../graph/GraphWorkspace";

const StaticCanvasViewport = lazy(
  () => import("../viewport/StaticCanvasViewport"),
);

const loadingFallback = (
  <div className="flex h-full items-center justify-center text-xs text-muted" />
);

export default function CanvasPane() {
  const activePanel = useCanvasViewStore((state) => state.activePanel);

  if (activePanel === "graph") {
    return (
      <Suspense fallback={loadingFallback}>
        <GraphWorkspace />
      </Suspense>
    );
  }

  return (
    <div
      className="flex h-full w-full flex-col bg-canvas"
      data-testid="canvas-pane"
    >
      <CanvasToolbar />

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <FeatureErrorBoundary featureName="Canvas">
          <Suspense fallback={loadingFallback}>
            <StaticCanvasViewport />
          </Suspense>
        </FeatureErrorBoundary>
      </div>

      <CanvasStatusBar projection={null} />
    </div>
  );
}
