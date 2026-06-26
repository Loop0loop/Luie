/**
 * CanvasPane — canvas 피처 뷰포트 셸.
 *
 *   상단 툴바를 제거하고 화면 중앙 하단 플로팅 툴바(BottomInteractiveToolbar)로 통제합니다.
 *   "graph" 패널일 경우 GraphWorkspace를, 그 외의 경우 StaticCanvasViewport를 렌더링합니다.
 *
 *   main 연결: useCanvasGraphData()가 진입 시 worldBuildingStore.loadGraph를
 *   트리거해 graphData(전 research 엔티티 집계 + canvas replica)를 채운다.
 *   useStaticProjection()은 그 graphData를 뷰포트/상태바 공용 projection으로 변환한다.
 */

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

const loadingFallback = (
  <div className="flex h-full items-center justify-center text-xs text-muted" />
);

export default function CanvasPane() {
  // 우측 Inspector & Binder 서랍 개폐 및 탭 포커스 사이드 이펙트 일원화 제어
  useCanvasDrawer();

  // canvas 진입 시 main(worldGraph.get + worldStorage replica) 데이터 로딩 보장
  useCanvasGraphData();

  const activePanel = useCanvasViewStore((state) => state.activePanel);
  const isGraphMode = activePanel === "graph";

  // graphData → projection(노드/엣지 카운트 + 뷰포트 데이터). graph 모드는 별도 파이프라인.
  const projection = useStaticProjection();

  return (
    <div
      className="relative flex h-full w-full flex-col bg-app"
      data-testid="canvas-pane"
    >
      {/* 메인 뷰포트 영역 (Static / Graph 교체식) */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <FeatureErrorBoundary featureName="Canvas">
          <Suspense fallback={loadingFallback}>
            {isGraphMode ? (
              <GraphWorkspace />
            ) : (
              <StaticCanvasViewport projection={projection} />
            )}
          </Suspense>
        </FeatureErrorBoundary>
      </div>

      {/* 화면 중앙 하단 공통 플로팅 툴바 */}
      <BottomInteractiveToolbar />

      {/* 정보 상태 바 — graph 모드에서는 자체 파이프라인이라 카운트를 숨긴다 */}
      <CanvasStatusBar projection={isGraphMode ? null : projection} />
    </div>
  );
}
