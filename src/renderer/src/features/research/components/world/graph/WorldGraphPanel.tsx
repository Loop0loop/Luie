import { useCallback, useEffect, useRef } from "react";
import { RefreshCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@renderer/components/ui/badge";
import { Button } from "@renderer/components/ui/button";
import { useGraphPluginStore } from "@renderer/features/research/stores/graphPluginStore";
import { useMemoStore } from "@renderer/features/research/stores/memoStore";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { useWorldGraphUiStore } from "@renderer/features/research/stores/worldGraphUiStore";
import { GRAPH_TAB_ITEMS } from "./constants";
import { useWorldGraphWorkspace } from "./hooks/useWorldGraphWorkspace";
import type { GraphSurfaceTab } from "./types";
import { GraphActiveSidebar } from "./components/GraphActiveSidebar";
import { GraphIconSidebar } from "./components/GraphIconSidebar";
import { CanvasTab } from "./tabs/CanvasTab";
import { useCanvasTabSidebar } from "./tabs/useCanvasTabSidebar";
import { NotesTab } from "./tabs/NotesTab";
import { LibraryTab } from "./tabs/LibraryTab";
import { TimelineTab } from "./tabs/TimelineTab";
import { EntityTab } from "./tabs/EntityTab";
import { syncGraphEntitySelectionToWorkspace } from "@renderer/features/research/utils/graphEntitySync";

export function WorldGraphPanel() {
  const { t } = useTranslation();

  const {
    projectId,
    graphNodes,
    graphEdges,
    graphCanvasBlocks,
    graphCanvasEdges,
    hasLuieAttachment,
    timelines,
    timelineNodes,
    notes,
    graphLoading,
    graphError,
    currentProjectTitle,
    catalog,
    installed,
    templates,
    pluginsLoading,
    pluginError,
  } = useWorldGraphWorkspace();

  const loadGraph = useWorldBuildingStore((state) => state.loadGraph);
  const addNote = useMemoStore((state) => state.addNote);
  const deleteNote = useMemoStore((state) => state.deleteNote);
  const loadPluginData = useGraphPluginStore((state) => state.loadData);
  const setTimelines = useWorldBuildingStore((state) => state.setTimelines);
  const updateGraphNode = useWorldBuildingStore(
    (state) => state.updateGraphNode,
  );

  const activeTab = useWorldGraphUiStore((state) => state.activeTab);
  const setActiveTab = useWorldGraphUiStore((state) => state.setActiveTab);
  const isSidebarOpen = useWorldGraphUiStore((state) => state.isSidebarOpen);
  const setSidebarOpen = useWorldGraphUiStore((state) => state.setSidebarOpen);
  const selectedNodeId = useWorldGraphUiStore((state) => state.selectedNodeId);
  const selectNode = useWorldGraphUiStore((state) => state.selectNode);
  const selectedTimelineId = useWorldGraphUiStore(
    (state) => state.selectedTimelineId,
  );
  const setSelectedTimelineId = useWorldGraphUiStore(
    (state) => state.setSelectedTimelineId,
  );
  const selectedNoteId = useWorldGraphUiStore((state) => state.selectedNoteId);
  const setSelectedNoteId = useWorldGraphUiStore(
    (state) => state.setSelectedNoteId,
  );
  const autoLayoutTrigger = useWorldGraphUiStore(
    (state) => state.autoLayoutTrigger,
  );

  const SIDEBAR_MIN_WIDTH = 220;
  const SIDEBAR_MAX_WIDTH = 520;
  const SIDEBAR_DEFAULT_WIDTH = 320;
  const sidebarWidth = useWorldGraphUiStore((state) => state.sidebarWidth);
  const setSidebarWidth = useWorldGraphUiStore(
    (state) => state.setSidebarWidth,
  );
  const isResizingRef = useRef(false);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(SIDEBAR_DEFAULT_WIDTH);

  const handleResizeMouseDown = useCallback(
    (event: React.MouseEvent, initialWidth?: number) => {
      event.preventDefault();

      const startWidth = initialWidth ?? sidebarWidth;

      isResizingRef.current = true;
      resizeStartXRef.current = event.clientX;
      resizeStartWidthRef.current = startWidth;

      const onMouseUp = () => {
        isResizingRef.current = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!isResizingRef.current) return;
        const delta = moveEvent.clientX - resizeStartXRef.current;
        const rawWidth = resizeStartWidthRef.current + delta;

        if (rawWidth < 120) {
          setSidebarOpen(false);
          setSidebarWidth(SIDEBAR_DEFAULT_WIDTH);
          onMouseUp();
          return;
        }

        const nextWidth = Math.min(
          SIDEBAR_MAX_WIDTH,
          Math.max(SIDEBAR_MIN_WIDTH, rawWidth),
        );
        setSidebarWidth(nextWidth);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [setSidebarOpen, setSidebarWidth, sidebarWidth],
  );

  const handleUpdateEvent = useCallback(
    (id: string, attributes: Record<string, unknown>) => {
      const node = graphNodes.find((n) => n.id === id);
      if (!node) return;
      void updateGraphNode({
        id,
        entityType: node.entityType,
        attributes: {
          ...(node.attributes as Record<string, unknown>),
          ...attributes,
        },
      });
    },
    [graphNodes, updateGraphNode],
  );

  const effectiveSelectedNoteId =
    selectedNoteId && notes.some((note) => note.id === selectedNoteId)
      ? selectedNoteId
      : (notes[0]?.id ?? null);

  const effectiveSelectedTimelineId =
    selectedTimelineId && timelines.some((t) => t.id === selectedTimelineId)
      ? selectedTimelineId
      : (timelines[0]?.id ?? null);

  const handleSelectTab = useCallback(
    (nextTab: GraphSurfaceTab) => {
      if (activeTab === nextTab) {
        setSidebarOpen(!isSidebarOpen);
        return;
      }

      setSidebarOpen(true);
      setActiveTab(nextTab);
    },
    [activeTab, isSidebarOpen, setActiveTab, setSidebarOpen],
  );

  const handleCreateNote = useCallback(() => {
    if (!projectId) return;

    const created = addNote(projectId, {
      title: t("research.graph.notes.defaultTitle"),
      content: "",
      tags: [],
    });

    if (!created) return;

    setSelectedNoteId(created.id);
    setActiveTab("notes");
  }, [addNote, projectId, setActiveTab, setSelectedNoteId, t]);

  const handleDeleteNote = useCallback(
    (noteId: string) => {
      deleteNote(noteId);
      if (selectedNoteId === noteId) {
        setSelectedNoteId(null);
      }
    },
    [deleteNote, selectedNoteId, setSelectedNoteId],
  );

  const handleCreatedEntity = useCallback(
    (_entityType: string, _newNodeId: string) => {
      // Stay on current tab or default to canvas
      if (!activeTab) {
        setActiveTab("canvas");
      }
    },
    [activeTab, setActiveTab],
  );

  const handleSelectNode = useCallback(
    (nodeId: string | null) => {
      selectNode(nodeId);
      if (!nodeId) return;

      const node = graphNodes.find((item) => item.id === nodeId);
      if (!node) return;

      void syncGraphEntitySelectionToWorkspace({
        id: node.id,
        entityType: node.entityType,
        name: node.name,
      });
    },
    [graphNodes, selectNode],
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1024px)");
    const handleViewportChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setSidebarOpen(false);
      }
    };

    if (mediaQuery.matches) {
      setSidebarOpen(false);
    }

    mediaQuery.addEventListener("change", handleViewportChange);
    return () => {
      mediaQuery.removeEventListener("change", handleViewportChange);
    };
  }, [setSidebarOpen]);

  useEffect(() => {
    if (!selectedNodeId) return;
    const node = graphNodes.find((item) => item.id === selectedNodeId);
    if (!node) return;

    void syncGraphEntitySelectionToWorkspace({
      id: node.id,
      entityType: node.entityType,
      name: node.name,
    });
  }, [graphNodes, selectedNodeId]);

  const { selectedNode, handleCreatePreset } = useCanvasTabSidebar({
    projectId,
    graphNodes,
    selectedNodeId,
    onSelectNode: handleSelectNode,
    onCreatedEntity: handleCreatedEntity,
  });

  const activeTabMeta = GRAPH_TAB_ITEMS.find((item) => item.id === activeTab);

  return (
    <div className="flex h-full min-h-0 bg-canvas text-fg">
      <div className="relative flex h-full shrink-0">
        <GraphIconSidebar
          activeTab={activeTab}
          isSidebarOpen={isSidebarOpen}
          onSelectTab={handleSelectTab}
          onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
        />
        {!isSidebarOpen && (
          <div
            className="absolute right-[calc(-5px/2)] top-0 z-10 h-full w-[5px] cursor-col-resize hover:bg-white/20 active:bg-white/30"
            onMouseDown={(e) => {
              setSidebarOpen(true);
              setSidebarWidth(SIDEBAR_MIN_WIDTH);
              handleResizeMouseDown(e, SIDEBAR_MIN_WIDTH);
            }}
          />
        )}
      </div>

      {isSidebarOpen ? (
        <div
          className="relative flex h-full shrink-0 flex-col"
          style={{ width: `min(${sidebarWidth}px, calc(100vw - 72px))` }}
        >
          <GraphActiveSidebar
            activeTab={activeTab}
            currentProjectTitle={currentProjectTitle}
            nodes={graphNodes}
            timelines={timelines}
            notes={notes}
            selectedNode={selectedNode}
            selectedTimelineId={effectiveSelectedTimelineId}
            selectedNoteId={effectiveSelectedNoteId}
            onCreatePreset={handleCreatePreset}
            onSelectNode={handleSelectNode}
            onSelectNote={setSelectedNoteId}
            onCreateNote={handleCreateNote}
            onSelectTimeline={setSelectedTimelineId}
            onUpdateTimelines={setTimelines}
            pluginSummary={{
              catalogCount: catalog.length,
              installedCount: installed.length,
              templateCount: templates.length,
              isLoading: pluginsLoading,
              error: pluginError,
              onReload: () => {
                void loadPluginData(true);
              },
            }}
          />
          <div
            className="absolute right-0 top-0 z-10 h-full w-1 cursor-col-resize hover:bg-white/20 active:bg-white/30"
            onMouseDown={handleResizeMouseDown}
          />
        </div>
      ) : null}

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-border/60 bg-panel px-5 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-fg/45">
              {t("research.graph.header.kicker")}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="text-lg font-semibold text-fg">
                {currentProjectTitle}
              </h1>
              <Badge variant="outline">
                {activeTabMeta ? t(activeTabMeta.labelKey) : ""}
              </Badge>
              <Badge variant="secondary">
                {t("research.graph.header.nodesCount", {
                  count: graphNodes.length,
                })}
              </Badge>
              {!hasLuieAttachment ? (
                <Badge
                  variant="outline"
                  className="border-border/70 text-muted-foreground"
                >
                  {t("research.graph.header.replicaOnly")}
                </Badge>
              ) : null}
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              if (!projectId) return;
              void loadGraph(projectId);
            }}
          >
            <RefreshCcw className="h-4 w-4" />
            {t("research.graph.header.refresh")}
          </Button>
        </header>

        {graphError ? (
          <div className="border-b border-destructive/30 bg-destructive/10 px-5 py-3 text-sm text-destructive/90">
            {graphError}
          </div>
        ) : null}

        {!hasLuieAttachment ? (
          <div className="border-b border-muted/50 bg-muted/25 px-5 py-3 text-sm text-muted-foreground">
            {t("research.graph.header.replicaNotice")}
          </div>
        ) : null}

        {graphLoading && activeTab !== "notes" && activeTab !== "library" ? (
          <div className="flex flex-1 items-center justify-center text-sm text-fg/65">
            {t("research.graph.header.loading")}
          </div>
        ) : (
          <div className="min-h-0 flex-1">
            {activeTab === "canvas" ? (
              <CanvasTab
                projectId={projectId}
                graphNodes={graphNodes}
                graphEdges={graphEdges}
                graphCanvasBlocks={graphCanvasBlocks}
                graphCanvasEdges={graphCanvasEdges}
                selectedNodeId={selectedNodeId}
                onSelectNode={handleSelectNode}
                onCreatedEntity={handleCreatedEntity}
                autoLayoutTrigger={autoLayoutTrigger}
              />
            ) : null}

            {activeTab === "timeline" ? (
              <TimelineTab
                timelines={timelines}
                timelineNodes={timelineNodes}
                selectedNodeId={selectedNodeId}
                selectedTimelineId={effectiveSelectedTimelineId}
                onSelectNode={handleSelectNode}
                onUpdateTimelines={setTimelines}
                onUpdateEvent={handleUpdateEvent}
              />
            ) : null}

            {activeTab === "notes" ? (
              <NotesTab
                selectedNoteId={selectedNoteId}
                onDeleteNote={handleDeleteNote}
                onCreateNote={handleCreateNote}
              />
            ) : null}

            {activeTab === "entity" ? (
              <EntityTab
                graphNodes={graphNodes}
                selectedNodeId={selectedNodeId}
                onSelectNode={handleSelectNode}
              />
            ) : null}

            {activeTab === "library" ? <LibraryTab /> : null}
          </div>
        )}
      </section>
    </div>
  );
}
