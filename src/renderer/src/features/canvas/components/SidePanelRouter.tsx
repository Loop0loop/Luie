/**
 * SidePanelRouter — 활성 canvas activity 패널을 라우팅합니다.
 *
 * SRP:
 *   - 패널 구성 데이터(PANEL_MAP)는 constants/index.ts에 위치합니다.
 *   - 이 컴포넌트는 라우팅 로직만 담당합니다.
 *
 * isActivityCollapsed 시 패널 영역 전체를 숨깁니다 (아이콘 레일은 유지).
 */
import { lazy, Suspense } from "react";
import type { CanvasActivityPanel } from "../types";
import { useCanvasView } from "../hooks/useCanvasView";

const ExplorerPanel      = lazy(() => import("./activity/ExplorerPanel"));
const CanvasControlPanel = lazy(() => import("./activity/CanvasControlPanel"));
const EntitiesPanel      = lazy(() => import("./activity/EntitiesPanel"));
const MemoryPanel        = lazy(() => import("./activity/MemoryPanel"));
const SearchPanel        = lazy(() => import("./activity/SearchPanel"));

// PANEL_MAP은 컴포넌트 외부에 정의해 매 렌더마다 재생성되지 않도록 합니다.
// 타입 안전성을 위해 Record를 사용합니다.
const PANEL_MAP: Record<
  CanvasActivityPanel,
  React.LazyExoticComponent<() => React.JSX.Element>
> = {
  explorer:  ExplorerPanel,
  canvas:    CanvasControlPanel,
  entities:  EntitiesPanel,
  memory:    MemoryPanel,
  search:    SearchPanel,
};

const panelFallback = (
  <div className="flex h-full items-center justify-center text-xs text-muted" />
);

export default function SidePanelRouter() {
  const { activePanel, isActivityCollapsed } = useCanvasView();

  if (isActivityCollapsed) {
    return null;
  }

  const ActivePanel = PANEL_MAP[activePanel];
  return (
    <div
      className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-sidebar"
      data-testid={`canvas-side-panel-${activePanel}`}
    >
      <Suspense fallback={panelFallback}>
        <ActivePanel />
      </Suspense>
    </div>
  );
}
