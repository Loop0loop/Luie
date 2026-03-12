import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle, type GroupImperativeHandle } from "react-resizable-panels";
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
import { useFilteredGraph, useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { WorldSidebar } from "./WorldSidebar";
import { WorldGraphCanvas } from "./WorldGraphCanvas";
import { WorldInspector } from "./WorldInspector";
import { WorldGraphTopNav } from "./WorldGraphTopNav";
import { WorldTimelinePanel } from "./WorldTimelinePanel";
import { WorldMapPanel } from "./WorldMapPanel";
import { useFixedPixelPanelGroupLayout } from "@renderer/features/workspace/hooks/useFixedPixelPanelGroupLayout";

export function WorldGraphPanel() {
  const { t } = useTranslation();
  const currentProjectId = useProjectStore((state) => state.currentProject?.id);
  const sidebarWidths = useUIStore((state) => state.sidebarWidths);
  const setSidebarWidth = useUIStore((state) => state.setSidebarWidth);
  const loadGraph = useWorldBuildingStore((state) => state.loadGraph);
  const isLoading = useWorldBuildingStore((state) => state.isLoading);
  const error = useWorldBuildingStore((state) => state.error);
  const mainView = useWorldBuildingStore((state) => state.mainView);
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panelGroupRef = useRef<GroupImperativeHandle | null>(null);

  useFixedPixelPanelGroupLayout({
    containerRef,
    groupRef: panelGroupRef,
    fixedPanels: [
      {
        id: "world-graph-sidebar",
        widthPx: leftWidth,
        minPx: leftConfig.minPx,
        maxPx: leftConfig.maxPx,
      },
      {
        id: "world-graph-inspector",
        widthPx: rightWidth,
        minPx: rightConfig.minPx,
        maxPx: rightConfig.maxPx,
      },
    ],
    flexPanelId: "world-graph-canvas",
    flexPanelMinPercent: 28,
  });

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
    <div className="h-full w-full overflow-hidden bg-app flex flex-row">
      <div className="flex-1 overflow-hidden bg-app flex flex-col">
        {/* Main Panel Layout */}
        <div ref={containerRef} className="flex-1 min-h-0 flex overflow-hidden">
          <PanelGroup
            groupRef={panelGroupRef}
            orientation="horizontal"
            className="h-full! w-full!"
          >
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

            <Panel id="world-graph-canvas" minSize={toPercentSize(28)} className="min-h-0 relative">
                <div className="flex flex-col h-full w-full">
                  <WorldGraphTopNav />
                  <main className="relative flex-1 min-w-0 min-h-0 overflow-hidden">
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
                      <>
                        {mainView === "graph" && (
                          <WorldGraphCanvas
                            nodes={filteredGraph.nodes}
                            edges={filteredGraph.edges}
                          />
                        )}
                        {mainView === "timeline" && (
                          <WorldTimelinePanel
                            nodes={filteredGraph.nodes}
                            edges={filteredGraph.edges}
                          />
                        )}
                        {mainView === "map" && (
                          <WorldMapPanel
                            nodes={filteredGraph.nodes}
                            edges={filteredGraph.edges}
                          />
                        )}
                      </>
                    )}
                  </main>
                </div>
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
      </div>
    </div>
  );
}
