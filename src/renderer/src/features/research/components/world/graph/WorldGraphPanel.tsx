import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";
import { Clock, Globe } from "lucide-react";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { useSidebarResizeCommit } from "@renderer/features/workspace/hooks/useSidebarResizeCommit";
import {
  clampSidebarWidth,
  getSidebarDefaultWidth,
  getSidebarWidthConfig,
  toPercentSize,
  toPxSize,
} from "@shared/constants/sidebarSizing";
import { cn } from "@shared/types/utils";
import { useFilteredGraph, useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { WorldGraphCanvas } from "./WorldGraphCanvas";
import { WorldSidebar } from "./WorldSidebar";
import { WorldInspector } from "./WorldInspector";
import { WorldTimelinePanel } from "./WorldTimelinePanel";
import { WorldMapPanel } from "./WorldMapPanel";

// ─── Constants ────────────────────────────────────────────────────────────────

const TIMELINE_PANEL_HEIGHT_PX = 220;

// ─── Component ────────────────────────────────────────────────────────────────

export function WorldGraphPanel() {
  const { t } = useTranslation();
  const currentProjectId = useProjectStore((state) => state.currentProject?.id);
  const sidebarWidths = useUIStore((state) => state.sidebarWidths);
  const setSidebarWidth = useUIStore((state) => state.setSidebarWidth);
  const loadGraph = useWorldBuildingStore((state) => state.loadGraph);
  const isLoading = useWorldBuildingStore((state) => state.isLoading);
  const error = useWorldBuildingStore((state) => state.error);
  const viewMode = useWorldBuildingStore((state) => state.viewMode);
  const isTimelineOpen = useWorldBuildingStore((state) => state.isTimelineOpen);
  const isMapOpen = useWorldBuildingStore((state) => state.isMapOpen);
  const toggleTimeline = useWorldBuildingStore((state) => state.toggleTimeline);
  const toggleMap = useWorldBuildingStore((state) => state.toggleMap);
  const filteredGraph = useFilteredGraph();

  const leftFeature = "worldGraphSidebar" as const;
  const rightFeature = "worldGraphInspector" as const;
  const leftConfig = getSidebarWidthConfig(leftFeature);
  const rightConfig = getSidebarWidthConfig(rightFeature);
  const leftWidth = clampSidebarWidth(
    leftFeature,
    sidebarWidths[leftFeature] || getSidebarDefaultWidth(leftFeature),
  );
  const rightWidth = clampSidebarWidth(
    rightFeature,
    sidebarWidths[rightFeature] || getSidebarDefaultWidth(rightFeature),
  );

  const onResizeLeft = useSidebarResizeCommit(leftFeature, setSidebarWidth);
  const onResizeRight = useSidebarResizeCommit(rightFeature, setSidebarWidth);
  const requestedProjectIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!currentProjectId) {
      requestedProjectIdRef.current = null;
      return;
    }
    if (requestedProjectIdRef.current === currentProjectId) {
      return;
    }
    requestedProjectIdRef.current = currentProjectId;
    void loadGraph(currentProjectId).catch(() => {
      if (requestedProjectIdRef.current === currentProjectId) {
        requestedProjectIdRef.current = null;
      }
    });
  }, [currentProjectId, loadGraph]);

  return (
    <div className="h-full overflow-hidden bg-app flex flex-col">
      {/* Main Panel Layout */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <PanelGroup orientation="horizontal" className="h-full! w-full!">
          <Panel
            id="world-graph-sidebar"
            defaultSize={toPxSize(leftWidth)}
            minSize={toPxSize(leftConfig.minPx)}
            maxSize={toPxSize(leftConfig.maxPx)}
            onResize={onResizeLeft}
            className="min-h-0"
          >
            <WorldSidebar />
          </Panel>

          <PanelResizeHandle className="group relative w-3 shrink-0 cursor-col-resize bg-transparent select-none touch-none">
            <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border/40 group-hover:bg-accent group-data-[dragging]:bg-accent transition-colors" />
          </PanelResizeHandle>

          <Panel id="world-graph-canvas" minSize={toPercentSize(28)} className="min-h-0">
            <main className="relative h-full min-w-0 overflow-hidden">
              {isLoading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-sm text-muted bg-app/70">
                  <span className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent" />
                  <p>{t("world.graph.loading")}</p>
                </div>
              )}
              {error && !isLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-destructive">
                  <p>
                    {t("world.graph.errorPrefix")}: {error}
                  </p>
                </div>
              )}
              {!isLoading && !error && (
                <WorldGraphCanvas
                  nodes={filteredGraph.nodes}
                  edges={filteredGraph.edges}
                  viewMode={viewMode}
                />
              )}

              {/* Map Panel — right slide-in overlay on the canvas */}
              <div
                className={cn(
                  "absolute top-0 right-0 h-full w-[280px] z-20 transform transition-transform duration-300 ease-in-out",
                  isMapOpen ? "translate-x-0" : "translate-x-full",
                )}
              >
                <WorldMapPanel nodes={filteredGraph.nodes} edges={filteredGraph.edges} />
              </div>

              {/* Floating toggle buttons — bottom-right corner of canvas */}
              <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={toggleMap}
                  title={t("world.map.title", { defaultValue: "지도 뷰" })}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] font-semibold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5",
                    isMapOpen
                      ? "bg-accent text-white border-accent"
                      : "bg-panel/95 text-muted border-border/50 hover:text-fg hover:border-border",
                  )}
                >
                  <Globe size={13} />
                  {t("world.map.toggle", { defaultValue: "지도" })}
                </button>

                <button
                  type="button"
                  onClick={toggleTimeline}
                  title={t("world.timeline.title", { defaultValue: "시간선" })}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] font-semibold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5",
                    isTimelineOpen
                      ? "bg-accent text-white border-accent"
                      : "bg-panel/95 text-muted border-border/50 hover:text-fg hover:border-border",
                  )}
                >
                  <Clock size={13} />
                  {t("world.timeline.toggle", { defaultValue: "시간선" })}
                </button>
              </div>
            </main>
          </Panel>

          <PanelResizeHandle className="group relative w-3 shrink-0 cursor-col-resize bg-transparent select-none touch-none">
            <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border/40 group-hover:bg-accent group-data-[dragging]:bg-accent transition-colors" />
          </PanelResizeHandle>

          <Panel
            id="world-graph-inspector"
            defaultSize={toPxSize(rightWidth)}
            minSize={toPxSize(rightConfig.minPx)}
            maxSize={toPxSize(rightConfig.maxPx)}
            onResize={onResizeRight}
            className="min-h-0"
          >
            <WorldInspector />
          </Panel>
        </PanelGroup>
      </div>

      {/* Timeline Panel — Slide-up from bottom */}
      <div
        className={cn(
          "shrink-0 border-t border-border/40 bg-panel/95 overflow-hidden transition-all duration-300 ease-in-out",
          isTimelineOpen
            ? "opacity-100"
            : "opacity-0 pointer-events-none",
        )}
        style={{ height: isTimelineOpen ? TIMELINE_PANEL_HEIGHT_PX : 0 }}
      >
        <WorldTimelinePanel nodes={filteredGraph.nodes} edges={filteredGraph.edges} />
      </div>
    </div>
  );
}
