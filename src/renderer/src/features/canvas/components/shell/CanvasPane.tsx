/**
 * CanvasPane — canvas 피처 뷰포트 셸.
 *
 * canvasType에 따라 두 가지 뷰포트를 렌더링합니다:
 *
 *   "dynamic" (동적) — 챕터 scope 기반 엔티티 표시
 *     ├── idle | error  → CanvasEmptyState variant="no-scope"
 *     ├── loading       → 로딩 스피너
 *     ├── nodes === 0   → CanvasEmptyState variant="no-nodes"
 *     └── ready         → CanvasViewport (projection prop)
 *
 *   "static" (정적) — 프로젝트 전체 엔티티, 자유 편집 캔버스
 *     └── StaticCanvasViewport (항상 렌더, 빈 상태는 내부 처리)
 *
 * Layout:
 *   ┌─────────────── CanvasToolbar ───────────────┐
 *   │                                             │
 *   │   Dynamic / Static Viewport                 │
 *   │                                             │
 *   └─────────────── CanvasStatusBar ─────────────┘
 */

import { lazy, Suspense } from "react";
import { useCanvasViewStore } from "../../stores";
import { FeatureErrorBoundary } from "@renderer/shared/error-boundaries/FeatureErrorBoundary";
import CanvasToolbar from "../viewport/CanvasToolbar";
import CanvasStatusBar from "../viewport/CanvasStatusBar";
import CanvasEmptyState from "../viewport/CanvasEmptyState";
import CanvasViewport from "../viewport/CanvasViewport";
import { useCanvasScope } from "../../hooks/useCanvasScope";
import { useCanvasProjection } from "../../hooks/useCanvasProjection";

const StaticCanvasViewport = lazy(
  () => import("../viewport/StaticCanvasViewport"),
);

const loadingFallback = (
  <div className="flex h-full items-center justify-center text-xs text-muted" />
);

// ─── Dynamic viewport content ─────────────────────────────────────────────────

function DynamicContent() {
  useCanvasScope();
  const { projection, status } = useCanvasProjection();

  if (status === "idle" || status === "error") {
    return <CanvasEmptyState variant="no-scope" />;
  }
  if (status === "loading") {
    return loadingFallback;
  }
  if (!projection || projection.nodes.length === 0) {
    return <CanvasEmptyState variant="no-nodes" />;
  }
  return <CanvasViewport projection={projection} />;
}

// ─── main component ───────────────────────────────────────────────────────────

export default function CanvasPane() {
  const canvasType = useCanvasViewStore((state) => state.canvasType);
  const { projection } = useCanvasProjection();

  const isStatic = canvasType === "static";

  return (
    <div
      className="flex h-full w-full flex-col bg-canvas"
      data-testid="canvas-pane"
    >
      <CanvasToolbar />

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <FeatureErrorBoundary featureName="Canvas">
          {isStatic ? (
            <Suspense fallback={loadingFallback}>
              <StaticCanvasViewport />
            </Suspense>
          ) : (
            <DynamicContent />
          )}
        </FeatureErrorBoundary>
      </div>

      <CanvasStatusBar projection={isStatic ? null : projection} />
    </div>
  );
}
