/**
 * CanvasPane — canvas 피처 뷰포트 셸.
 *
 *   상단 툴바를 제거하고 화면 중앙 하단 플로팅 툴바(BottomInteractiveToolbar)로 통제합니다.
 *   "graph" 패널일 경우 GraphWorkspace를, 그 외의 경우 StaticCanvasViewport를 렌더링합니다.
 */

import { lazy, Suspense } from "react";
import { useCanvasViewStore } from "../../stores";
import { useCanvasDrawer } from "../../hooks";
import { FeatureErrorBoundary } from "@renderer/shared/error-boundaries/FeatureErrorBoundary";
import { BottomInteractiveToolbar } from "../viewport/BottomInteractiveToolbar";
import CanvasStatusBar from "../viewport/CanvasStatusBar";

const StaticCanvasViewport = lazy(
  () => import("../viewport/StaticCanvasViewport"),
);

const GraphWorkspace = lazy(
  () => import("../graph/GraphWorkspace"),
);

const CanvasNodeInspector = lazy(
  () => import("../binder/CanvasNodeInspector"),
);

const loadingFallback = (
  <div className="flex h-full items-center justify-center text-xs text-muted" />
);

export default function CanvasPane() {
  const activePanel = useCanvasViewStore((state) => state.activePanel);
  const isGraphMode = activePanel === "graph";
  const { isOpen, selectedNodeId } = useCanvasDrawer();

  return (
    <div
      className="relative flex h-full w-full flex-row overflow-hidden bg-canvas"
      data-testid="canvas-pane"
    >
      {/* 메인 캔버스 뷰포트 영역 */}
      <div className="relative min-h-0 flex-1 overflow-hidden flex flex-col">
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <FeatureErrorBoundary featureName="Canvas">
            <Suspense fallback={loadingFallback}>
              {isGraphMode ? <GraphWorkspace /> : <StaticCanvasViewport />}
            </Suspense>
          </FeatureErrorBoundary>
        </div>

        {/* 화면 중앙 하단 공통 플로팅 툴바 */}
        <BottomInteractiveToolbar />

        {/* 정보 상태 바 */}
        <CanvasStatusBar projection={null} />
      </div>

      {/* Slide-out BinderBar (우측 서랍식 디테일 패널) */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className={`absolute top-0 right-0 z-40 h-full w-80 shrink-0 border-l border-border/30 bg-sidebar/95 backdrop-blur-md shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        data-testid="canvas-slide-drawer"
      >
        <div className="relative h-full w-full">
          <Suspense fallback={loadingFallback}>
            {selectedNodeId && <CanvasNodeInspector nodeId={selectedNodeId} />}
          </Suspense>
        </div>
      </div>
    </div>
  );
}

