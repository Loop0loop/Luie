import { useEffect, useRef } from "react";
import {
  Panel,
  Group as PanelGroup,
  Separator as PanelResizeHandle,
  type GroupImperativeHandle,
} from "react-resizable-panels";
import { useTranslation } from "react-i18next";
import { ChevronLeft } from "lucide-react";
import { useCanvasPanelGroupLayout } from "../hooks/useCanvasPanelGroupLayout";
import { cn } from "../lib/utils";
import {
  CANVAS_FLEX_MIN_PERCENT,
  getCanvasSurfaceConfig,
  toPxSize,
} from "../shared/canvasSizing";
import { CANVAS_SURFACE } from "../stores/canvasLayoutStore";
import { useCanvasLayout } from "../hooks/useCanvasLayout";
import { useCanvasSurfaceResizeCommit } from "../hooks/useCanvasSurfaceResizeCommit";
import { useCanvasLayoutStore } from "../stores/canvasLayoutStore";
import { IconBar } from "./sidebar/IconBar";
import { ActivityBar } from "./sidebar/ActivityBar";
import { CanvasStage } from "./stage/CanvasStage";
import { CanvasBinder } from "./binder/CanvasBinder";

/**
 * 캔버스 3-pane 워크스페이스 셸. PRD §3.1.
 *
 *   ┌─────┬─────────────┬───────────────────────┬──────────────┐
 *   │Icon │ ActivityBar │ Stage                 │ Binder       │
 *   │Bar  │             │                       │              │
 *   └─────┴─────────────┴───────────────────────┴──────────────┘
 *
 * IconBar(고정 44px)는 PanelGroup 바깥 — VS Code Activity Bar 모델.
 * 어떤 collapse 상태에서도 Mode 전환은 항상 가능해야 한다.
 *
 * 가변 폭은 ActivityBar / Binder. 둘 다 collapse 가능하며, Binder가 닫혀
 * 있을 때는 stage 우측 가장자리에 floating 펼치기 버튼이 뜬다(외부
 * ScrivenerLayout 패턴 인용 — 캔버스 안에서만 동작).
 */
export function CanvasWorkspace() {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panelGroupRef = useRef<GroupImperativeHandle | null>(null);

  const {
    activityWidth,
    binderWidth,
    isActivityCollapsed,
    isBinderCollapsed,
    setActivityWidth,
    setBinderWidth,
    setBinderCollapsed,
  } = useCanvasLayout();
  const hasHydrated = useCanvasLayoutStore((s) => s.hasHydrated);

  const activityConfig = getCanvasSurfaceConfig(CANVAS_SURFACE.activity);
  const binderConfig = getCanvasSurfaceConfig(CANVAS_SURFACE.binder);

  const activityResize = useCanvasSurfaceResizeCommit(
    CANVAS_SURFACE.activity,
    (_surface, width) => setActivityWidth(width),
    { initialWidth: activityWidth },
  );
  const binderResize = useCanvasSurfaceResizeCommit(
    CANVAS_SURFACE.binder,
    (_surface, width) => setBinderWidth(width),
    { initialWidth: binderWidth },
  );

  // px 기반 panel layout — fixed activity + binder, flex stage.
  // IconBar는 PanelGroup 밖이라 spec에 포함되지 않는다.
  const { isLayoutReady } = useCanvasPanelGroupLayout({
    containerRef,
    groupRef: panelGroupRef,
    fixedPanels: [
      {
        id: "canvas-activity",
        widthPx: activityWidth,
        minPx: activityConfig.minPx,
        maxPx: activityConfig.maxPx,
        collapsed: isActivityCollapsed,
      },
      {
        id: "canvas-binder",
        widthPx: binderWidth,
        minPx: binderConfig.minPx,
        maxPx: binderConfig.maxPx,
        collapsed: isBinderCollapsed,
      },
    ],
    flexPanelId: "canvas-stage",
    flexPanelMinPercent: CANVAS_FLEX_MIN_PERCENT,
  });

  const shouldHide = !hasHydrated || !isLayoutReady;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.setAttribute("role", "region");
    el.setAttribute("aria-label", t("canvas.workspace.title"));
  }, [t]);

  return (
    <div
      className="flex h-full w-full overflow-hidden bg-app text-fg"
      style={{ visibility: shouldHide ? "hidden" : undefined }}
    >
      {/* IconBar — 항상 고정 폭으로 노출. PanelGroup 바깥. */}
      <IconBar />

      {/* PanelGroup — ActivityBar / Stage / Binder 세 개. */}
      <div ref={containerRef} className="relative flex h-full min-w-0 flex-1">
        <PanelGroup
          groupRef={panelGroupRef}
          orientation="horizontal"
          id="canvas-workspace-group"
          className="flex h-full w-full flex-1 overflow-hidden"
        >
          {/* ActivityBar */}
          <Panel
            id="canvas-activity"
            collapsible
            collapsedSize={toPxSize(0)}
            defaultSize={toPxSize(activityWidth)}
            minSize={toPxSize(activityConfig.minPx)}
            maxSize={toPxSize(activityConfig.maxPx)}
            onResize={activityResize.onResize}
            className="flex min-w-0 shrink-0 flex-col overflow-hidden border-r border-border bg-sidebar"
          >
            <ActivityBar />
          </Panel>

          <PanelResizeHandle
            {...activityResize.resizeHandleProps}
            data-separator-feature="canvas.activity"
            className={cn(
              "relative z-10 w-1 shrink-0 cursor-col-resize bg-border/40",
              "transition-colors hover:bg-accent/50 active:bg-accent/80",
              isActivityCollapsed && "pointer-events-none opacity-0",
            )}
          >
            <div className="absolute inset-y-0 -left-1 -right-1" />
          </PanelResizeHandle>

          {/* Stage */}
          <Panel
            id="canvas-stage"
            minSize={CANVAS_FLEX_MIN_PERCENT}
            className="min-w-0 flex-1 overflow-hidden bg-app"
          >
            <CanvasStage />
          </Panel>

          <PanelResizeHandle
            {...binderResize.resizeHandleProps}
            data-separator-feature="canvas.binder"
            className={cn(
              "relative z-10 w-1 shrink-0 cursor-col-resize bg-border/40",
              "transition-colors hover:bg-accent/50 active:bg-accent/80",
              isBinderCollapsed && "pointer-events-none opacity-0",
            )}
          >
            <div className="absolute inset-y-0 -left-1 -right-1" />
          </PanelResizeHandle>

          {/* Binder */}
          <Panel
            id="canvas-binder"
            collapsible
            collapsedSize={toPxSize(0)}
            defaultSize={toPxSize(binderWidth)}
            minSize={toPxSize(binderConfig.minPx)}
            maxSize={toPxSize(binderConfig.maxPx)}
            onResize={binderResize.onResize}
            className="flex min-w-0 shrink-0 flex-col overflow-hidden border-l border-border bg-panel"
          >
            <CanvasBinder />
          </Panel>
        </PanelGroup>

        {/* Binder가 닫혔을 때 stage 우측에 띄우는 펼치기 버튼.
            ScrivenerLayout과 같은 결: 닫힘 상태에서는 floating affordance가
            반드시 보여야 사용자가 다시 열 수 있다. */}
        {isBinderCollapsed ? (
          <button
            type="button"
            onClick={() => setBinderCollapsed(false)}
            aria-label={t("canvas.binder.expand")}
            title={t("canvas.binder.expand")}
            className={cn(
              "absolute right-2 top-2 z-20 inline-flex h-7 w-7 items-center justify-center",
              "rounded-md border border-border bg-panel/85 text-muted shadow-sm backdrop-blur-sm",
              "transition-colors hover:bg-surface-hover hover:text-fg",
            )}
          >
            <ChevronLeft className="size-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
