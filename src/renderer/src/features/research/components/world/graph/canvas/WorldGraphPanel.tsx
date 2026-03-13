import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Panel,
  Group as PanelGroup,
  Separator as PanelResizeHandle,
  type GroupImperativeHandle,
} from "react-resizable-panels";
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
import {
  useFilteredGraph,
  useWorldBuildingStore,
} from "@renderer/features/research/stores/worldBuildingStore";
import { useGraphIdeStore } from "@renderer/features/research/stores/graphIdeStore";
import { WorldGraphCanvas } from "./WorldGraphCanvas";
import { ActivityBar } from "../components/ActivityBar";
import { PrimarySidebar } from "../components/PrimarySidebar";
import { EntityInspectorPanel } from "../sidebars/EntityInspectorPanel";
import { NoteMainView } from "@renderer/features/research/components/world/graph/views/NoteMainView";
import { EntityMainView } from "@renderer/features/research/components/world/graph/views/EntityMainView";
import { LibraryMainView } from "@renderer/features/research/components/world/graph/views/LibraryMainView";
import { TimelineMainView } from "@renderer/features/research/components/world/graph/views/TimelineMainView";
import { useFixedPixelPanelGroupLayout } from "@renderer/features/workspace/hooks/useFixedPixelPanelGroupLayout";
import { WorldGraphNavbar } from "../components/WorldGraphNavbar";

export function WorldGraphPanel() {
  const { t } = useTranslation();
  const currentProjectId = useProjectStore((state) => state.currentProject?.id);
  const sidebarWidths = useUIStore((state) => state.sidebarWidths);
  const setSidebarWidth = useUIStore((state) => state.setSidebarWidth);
  const loadGraph = useWorldBuildingStore((state) => state.loadGraph);
  const isLoading = useWorldBuildingStore((state) => state.isLoading);
  const error = useWorldBuildingStore((state) => state.error);
  const filteredGraph = useFilteredGraph();
  const selectedNodeId = useWorldBuildingStore((state) => state.selectedNodeId);
  const selectedEdgeId = useWorldBuildingStore((state) => state.selectedEdgeId);

  // IDE Store
  const activeTab = useGraphIdeStore((state) => state.activeTab);
  const isSidebarOpen = useGraphIdeStore((state) => state.isSidebarOpen);

  const feature = "worldGraphSidebar" as const;
  const config = getSidebarWidthConfig(feature);
  const width = clampSidebarWidth(
    feature,
    sidebarWidths[feature] || getSidebarDefaultWidth(feature),
  );

  const { onResize, resizeHandleProps } = useSidebarResizeCommit(
    feature,
    setSidebarWidth,
  );
  const requestedProjectIdRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panelGroupRef = useRef<GroupImperativeHandle | null>(null);

  useFixedPixelPanelGroupLayout({
    containerRef,
    groupRef: panelGroupRef,
    fixedPanels: isSidebarOpen
      ? [
          {
            id: "world-ide-sidebar",
            widthPx: width,
            minPx: config.minPx,
            maxPx: config.maxPx,
          },
        ]
      : [],
    flexPanelId: "world-ide-main",
    flexPanelMinPercent: 30,
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

  const renderMainViewContent = () => {
    if (isLoading) {
      return (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-sm text-muted bg-app/70">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent" />
          <p>{t("world.graph.loading")}</p>
        </div>
      );
    }
    if (error) {
      return (
        <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-destructive">
          <p>
            {t("world.graph.errorPrefix")}: {error}
          </p>
        </div>
      );
    }

    switch (activeTab) {
      case "graph":
        return (
          <WorldGraphCanvas
            nodes={filteredGraph.nodes}
            edges={filteredGraph.edges}
          />
        );
      case "timeline":
        return (
          <TimelineMainView
            nodes={filteredGraph.nodes}
            edges={filteredGraph.edges}
          />
        );
      case "note":
        return <NoteMainView />;
      case "entity":
        return <EntityMainView nodes={filteredGraph.nodes} />;
      case "library":
        return <LibraryMainView />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full w-full flex-row overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0)),var(--bg-app)]">
      <ActivityBar />

      <div ref={containerRef} className="flex min-h-0 flex-1 overflow-hidden">
        <PanelGroup
          groupRef={panelGroupRef}
          orientation="horizontal"
          className="h-full! w-full! bg-transparent"
        >
          {isSidebarOpen && (
            <>
              <Panel
                id="world-ide-sidebar"
                defaultSize={toPxSize(width)}
                minSize={toPxSize(config.minPx)}
                maxSize={toPxSize(config.maxPx)}
                onResize={onResize}
                collapsible
                className="min-h-0"
              >
                <PrimarySidebar />
              </Panel>

              <PanelResizeHandle
                {...resizeHandleProps}
                className="relative flex w-px shrink-0 cursor-col-resize items-center justify-center bg-border/20 hover:bg-accent/40 active:bg-accent transition-colors"
              />
            </>
          )}

          <Panel
            id="world-ide-main"
            minSize={toPercentSize(30)}
            className="min-h-0 relative"
          >
            <div className="flex h-full w-full flex-col">
              <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
                {renderMainViewContent()}
                <WorldGraphNavbar />
              </main>
            </div>
          </Panel>

          {(selectedNodeId || selectedEdgeId) && (
            <>
              <PanelResizeHandle
                className="relative flex w-px shrink-0 cursor-col-resize items-center justify-center bg-border/20 hover:bg-accent/40 active:bg-accent transition-colors"
              />
              <Panel
                id="world-ide-inspector"
                defaultSize={toPxSize(300)}
                minSize={toPxSize(250)}
                maxSize={toPxSize(500)}
                className="min-h-0 bg-panel border-l border-border/40"
              >
                <EntityInspectorPanel />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>
    </div>
  );
}
