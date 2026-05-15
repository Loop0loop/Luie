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
 * 캔버스 3분할 리사이즈 레이아웃: Sidebar | Main | Inspector(BinderBar).
 *
 * 톤은 워크스페이스 MainLayout/ScrivenerLayout과 동일하게 둔다:
 *   - 좌측 사이드바: `bg-sidebar` + 우측 border
 *   - 메인        : `bg-app`
 *   - 우측 인스펙터: `bg-panel` + 좌측 border
 *
 * Resize handle 스타일도 워크스페이스 레이아웃과 같은 1px bar.
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
        className="flex min-w-0 shrink-0 flex-col overflow-hidden border-r border-border bg-sidebar"
      >
        {sidebar}
      </Panel>

      <PanelResizeHandle
        data-separator-feature="canvas.sidebar"
        className="relative z-10 w-1 shrink-0 cursor-col-resize bg-border/40 transition-colors hover:bg-accent/50 active:bg-accent/80"
      >
        <div className="absolute inset-y-0 -left-1 -right-1" />
      </PanelResizeHandle>

      {/* Canvas Main */}
      <Panel
        id="canvas-main"
        minSize={30}
        className="min-w-0 flex-1 overflow-hidden bg-app"
      >
        {main}
      </Panel>

      <PanelResizeHandle
        data-separator-feature="canvas.binder"
        className="relative z-10 w-1 shrink-0 cursor-col-resize bg-border/40 transition-colors hover:bg-accent/50 active:bg-accent/80"
      >
        <div className="absolute inset-y-0 -left-1 -right-1" />
      </PanelResizeHandle>

      {/* Right Inspector */}
      <Panel
        id="canvas-binder"
        collapsible
        collapsedSize={0}
        defaultSize={toPanelPercentSize(CANVAS_LAYOUT.BINDER_DEFAULT_RATIO)}
        minSize={binderSize.minSize}
        maxSize={binderSize.maxSize}
        className="flex min-w-0 shrink-0 flex-col overflow-hidden border-l border-border bg-panel"
      >
        {binder}
      </Panel>
    </PanelGroup>
  );
}
