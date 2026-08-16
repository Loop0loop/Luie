import { lazy, Suspense } from "react";
import { useCanvasViewStore } from "../../stores";
import { useCanvasDrawer } from "../../hooks/useCanvasDrawer";
import { useCanvasGraphData } from "../../hooks/useCanvasGraphData";
import { useStaticProjection } from "../../hooks/useStaticProjection";
import { FeatureErrorBoundary } from "@renderer/shared/error-boundaries/FeatureErrorBoundary";
import { BottomInteractiveToolbar } from "../viewport/BottomInteractiveToolbar";
import CanvasStatusBar from "../viewport/CanvasStatusBar";

const StaticCanvasViewport = lazy(
  () => import("../viewport/StaticCanvasViewport"),
);

const GraphWorkspace = lazy(
  () => import("../graph/GraphWorkspace"),
);

const CanvasEntityPreview = lazy(
  () => import("./CanvasEntityPreview"),
);

const loadingFallback = (
  <div className="flex h-full items-center justify-center text-xs text-muted" />
);

export default function CanvasPane() {
  useCanvasDrawer();

  useCanvasGraphData();

  const activePanel = useCanvasViewStore((state) => state.activePanel);
  const entityPreview = useCanvasViewStore((state) => state.entityPreview);
  const isGraphMode = activePanel === "graph";

  const projection = useStaticProjection();

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden rounded-3xl border border-l-0 border-border bg-app"
      data-testid="canvas-pane"
    >
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <FeatureErrorBoundary featureName="Canvas">
          <Suspense fallback={loadingFallback}>
            {isGraphMode ? (
              <GraphWorkspace />
            ) : entityPreview ? (
              <CanvasEntityPreview preview={entityPreview} />
            ) : (
              <StaticCanvasViewport projection={projection} />
            )}
          </Suspense>
        </FeatureErrorBoundary>
      </div>

      {!entityPreview && <BottomInteractiveToolbar />}

      {!entityPreview && (
        <CanvasStatusBar projection={isGraphMode ? null : projection} />
      )}
    </div>
  );
}
