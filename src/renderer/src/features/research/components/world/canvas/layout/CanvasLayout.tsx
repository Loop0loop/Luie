import { useRef, type ReactNode } from "react";
import {
  Panel,
  Group as PanelGroup,
  Separator as PanelResizeHandle,
} from "react-resizable-panels";
import {
  getResponsivePanelSize,
  toPanelPercentSize,
} from "@shared/constants/layoutSizing";
import { useElementWidth } from "@renderer/features/workspace/hooks/useElementWidth";
import { CANVAS_LAYOUT } from "../shared/constants";

interface CanvasLayoutProps {
  sidebar: ReactNode;
  main: ReactNode;
  binder: ReactNode;
}

/**
 * 캔버스 3분할 리사이즈 레이아웃: Sidebar | Main | BinderBar.
 *
 * 기존 workspace 레이아웃(ScrivenerLayout, GoogleDocsLayout) 패턴 그대로:
 *   - PanelGroup: id + elementRef
 *   - Panel: defaultSize는 비율(%), minSize/maxSize는 컨테이너 너비 기반 % 변환
 *   - PanelResizeHandle: data-separator-feature + 히트 영역 확장 div
 *
 * defaultSize는 첫 렌더에 사용. 측정 전에도 안정된 비율이 보이도록 상수 사용.
 * minSize/maxSize는 measure 후 px 기반으로 계산되어 너무 작아지지 않게 보호한다.
 */
export function CanvasLayout({ sidebar, main, binder }: CanvasLayoutProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const containerWidth = useElementWidth(containerRef);

  const sidebarSize = getResponsivePanelSize(containerWidth, {
    minPx: CANVAS_LAYOUT.SIDEBAR_MIN_PX,
    maxPx: CANVAS_LAYOUT.SIDEBAR_MAX_PX,
  });
  const binderSize = getResponsivePanelSize(containerWidth, {
    minPx: CANVAS_LAYOUT.BINDER_MIN_PX,
    maxPx: CANVAS_LAYOUT.BINDER_MAX_PX,
  });

  return (
    <PanelGroup
      orientation="horizontal"
      className="flex h-full w-full flex-1 overflow-hidden relative"
      id="canvas-layout-group"
      elementRef={containerRef}
    >
      {/* Left Sidebar */}
      <Panel
        id="canvas-sidebar"
        collapsible
        collapsedSize={0}
        defaultSize={toPanelPercentSize(CANVAS_LAYOUT.SIDEBAR_DEFAULT_RATIO)}
        minSize={sidebarSize.minSize}
        maxSize={sidebarSize.maxSize}
        className="flex min-w-0 shrink-0 flex-col overflow-hidden bg-background"
      >
        {sidebar}
      </Panel>

      <PanelResizeHandle
        data-separator-feature="canvas.sidebar"
        className="relative z-10 w-1 shrink-0 cursor-col-resize bg-border/40 transition-colors hover:bg-accent/60 focus-visible:bg-accent/60"
      >
        <div className="absolute inset-y-0 -left-1 -right-1" />
      </PanelResizeHandle>

      {/* Canvas Main */}
      <Panel
        id="canvas-main"
        minSize={30}
        className="min-w-0 flex-1 overflow-hidden bg-background"
      >
        {main}
      </Panel>

      <PanelResizeHandle
        data-separator-feature="canvas.binder"
        className="relative z-10 w-1 shrink-0 cursor-col-resize bg-border/40 transition-colors hover:bg-accent/60 focus-visible:bg-accent/60"
      >
        <div className="absolute inset-y-0 -left-1 -right-1" />
      </PanelResizeHandle>

      {/* Right BinderBar */}
      <Panel
        id="canvas-binder"
        collapsible
        collapsedSize={0}
        defaultSize={toPanelPercentSize(CANVAS_LAYOUT.BINDER_DEFAULT_RATIO)}
        minSize={binderSize.minSize}
        maxSize={binderSize.maxSize}
        className="flex min-w-0 shrink-0 flex-col overflow-hidden bg-background"
      >
        {binder}
      </Panel>
    </PanelGroup>
  );
}
