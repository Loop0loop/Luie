import { useRef, type ReactNode } from "react";
import {
  Panel,
  Group as PanelGroup,
  Separator as PanelResizeHandle,
} from "react-resizable-panels";
import { CANVAS_LAYOUT } from "../shared/constants";
import { useElementWidth } from "@renderer/features/workspace/hooks/useElementWidth";

interface CanvasLayoutProps {
  sidebar: ReactNode;
  main: ReactNode;
  binder: ReactNode;
}

/**
 * 캔버스 3분할 리사이즈 레이아웃: Sidebar | Main | BinderBar.
 *
 * 기존 workspace 레이아웃(ScrivenerLayout, GoogleDocsLayout)과 동일한
 * react-resizable-panels 패턴을 따른다:
 *   - PanelGroup: id + elementRef
 *   - Panel: id + collapsible + collapsedSize + minSize/maxSize
 *   - PanelResizeHandle: data-separator-feature + 히트 영역 확장 div
 *
 * 사이즈 계산은 컨테이너 너비 기반 퍼센트로 변환.
 */
export function CanvasLayout({ sidebar, main, binder }: CanvasLayoutProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const containerWidth = useElementWidth(containerRef);

  // 컨테이너 너비 기반 퍼센트 계산 (fallback: 1440px 기준)
  const baseWidth = containerWidth > 0 ? containerWidth : 1440;
  const sidebarPercent = Math.round(
    (CANVAS_LAYOUT.SIDEBAR_WIDTH / baseWidth) * 100,
  );
  const binderPercent = Math.round(
    (CANVAS_LAYOUT.BINDER_WIDTH / baseWidth) * 100,
  );
  const sidebarMinPercent = Math.round(
    (CANVAS_LAYOUT.SIDEBAR_MIN_WIDTH / baseWidth) * 100,
  );
  const binderMinPercent = Math.round(
    (CANVAS_LAYOUT.BINDER_MIN_WIDTH / baseWidth) * 100,
  );

  return (
    <div ref={containerRef} className="flex h-full w-full overflow-hidden">
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
          defaultSize={sidebarPercent}
          minSize={sidebarMinPercent}
          maxSize={28}
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
          defaultSize={binderPercent}
          minSize={binderMinPercent}
          maxSize={35}
          className="flex min-w-0 shrink-0 flex-col overflow-hidden bg-background"
        >
          {binder}
        </Panel>
      </PanelGroup>
    </div>
  );
}
