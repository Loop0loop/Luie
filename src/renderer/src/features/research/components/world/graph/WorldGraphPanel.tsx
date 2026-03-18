import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { Badge } from "@renderer/components/ui/badge";
import { Button } from "@renderer/components/ui/button";
import { useGraphPluginStore } from "@renderer/features/research/stores/graphPluginStore";
import { useMemoStore } from "@renderer/features/research/stores/memoStore";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { GRAPH_TAB_ITEMS } from "./constants";
import { useWorldGraphWorkspace } from "./hooks/useWorldGraphWorkspace";
import type { GraphSurfaceTab } from "./types";
import { GraphActiveSidebar } from "./components/GraphActiveSidebar";
import { GraphIconSidebar } from "./components/GraphIconSidebar";
import { useCanvasTabSidebar, CanvasTab } from "./tabs/CanvasTab";
import { NotesTab } from "./tabs/NotesTab";
import { LibraryTab } from "./tabs/LibraryTab";
import { TimelineTab } from "./tabs/TimelineTab";
import { EntityTab } from "./tabs/EntityTab";
import { syncGraphEntitySelectionToWorkspace } from "@renderer/features/research/utils/graphEntitySync";

export function WorldGraphPanel() {
  const {
    projectId,
    graphNodes,
    graphEdges,
    graphCanvasBlocks,
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

  const [activeTab, setActiveTab] = useState<GraphSurfaceTab>("canvas");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [autoLayoutTrigger, setAutoLayoutTrigger] = useState(0);

  const SIDEBAR_MIN_WIDTH = 220;
  const SIDEBAR_MAX_WIDTH = 520;
  const SIDEBAR_DEFAULT_WIDTH = 320;
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const isResizingRef = useRef(false);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(SIDEBAR_DEFAULT_WIDTH);

  const handleResizeMouseDown = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      isResizingRef.current = true;
      resizeStartXRef.current = event.clientX;
      resizeStartWidthRef.current = sidebarWidth;

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!isResizingRef.current) return;
        const delta = moveEvent.clientX - resizeStartXRef.current;
        const nextWidth = Math.min(
          SIDEBAR_MAX_WIDTH,
          Math.max(SIDEBAR_MIN_WIDTH, resizeStartWidthRef.current + delta),
        );
        setSidebarWidth(nextWidth);
      };

      const onMouseUp = () => {
        isResizingRef.current = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [sidebarWidth],
  );

  const effectiveSelectedNoteId =
    selectedNoteId && notes.some((note) => note.id === selectedNoteId)
      ? selectedNoteId
      : (notes[0]?.id ?? null);

  const handleSelectTab = useCallback((nextTab: GraphSurfaceTab) => {
    setActiveTab((current) => {
      if (current === nextTab) {
        setIsSidebarOpen((open) => !open);
        return current;
      }
      setIsSidebarOpen(true);
      return nextTab;
    });
  }, []);

  const handleCreateNote = useCallback(() => {
    if (!projectId) return;

    const created = addNote(projectId, {
      title: "새 스크랩",
      content: "",
      tags: [],
    });

    if (!created) return;

    setSelectedNoteId(created.id);
    setActiveTab("notes");
  }, [addNote, projectId]);

  const handleDeleteNote = useCallback(
    (noteId: string) => {
      deleteNote(noteId);
      setSelectedNoteId((current) => (current === noteId ? null : current));
    },
    [deleteNote],
  );

  const handleCreatedEntity = useCallback(
    (_entityType: string, _newNodeId: string) => {
      // Stay on current tab or default to canvas
      setActiveTab((current) => current || "canvas");
    },
    [],
  );

  const handleSelectNode = useCallback(
    (nodeId: string | null) => {
      setSelectedNodeId(nodeId);
      if (!nodeId) return;

      const node = graphNodes.find((item) => item.id === nodeId);
      if (!node) return;

      void syncGraphEntitySelectionToWorkspace({
        id: node.id,
        entityType: node.entityType,
        name: node.name,
      });
    },
    [graphNodes],
  );

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

  const { selectedNode, handleCreatePreset, handleSaveNode, handleDeleteNode } =
    useCanvasTabSidebar({
      projectId,
      graphNodes,
      selectedNodeId,
      onSelectNode: handleSelectNode,
      onCreatedEntity: handleCreatedEntity,
    });

  const activeTabMeta = GRAPH_TAB_ITEMS.find((item) => item.id === activeTab);

  return (
    <div className="flex h-full min-h-0 bg-[#0b0e13] text-fg">
      <GraphIconSidebar
        activeTab={activeTab}
        isSidebarOpen={isSidebarOpen}
        onSelectTab={handleSelectTab}
        onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
      />

      {isSidebarOpen ? (
        <div
          className="relative flex h-full shrink-0 flex-col"
          style={{ width: sidebarWidth }}
        >
          <GraphActiveSidebar
            activeTab={activeTab}
            currentProjectTitle={currentProjectTitle}
            nodes={graphNodes}
            edges={graphEdges}
            timelineNodes={timelineNodes}
            notes={notes}
            selectedNode={selectedNode}
            selectedNoteId={effectiveSelectedNoteId}
            onClose={() => setIsSidebarOpen(false)}
            onCreatePreset={handleCreatePreset}
            onSelectNode={handleSelectNode}
            onSaveNode={handleSaveNode}
            onDeleteNode={handleDeleteNode}
            onSelectNote={setSelectedNoteId}
            onCreateNote={handleCreateNote}
            onAutoLayout={() => setAutoLayoutTrigger((n) => n + 1)}
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
        <header className="flex shrink-0 items-center justify-between border-b border-border/60 bg-[#11151c] px-5 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-fg/45">
              World Graph
            </p>
            <div className="mt-1 flex items-center gap-3">
              <h1 className="text-lg font-semibold text-fg">
                {currentProjectTitle}
              </h1>
              <Badge variant="outline">{activeTabMeta?.label}</Badge>
              <Badge variant="secondary">{graphNodes.length} nodes</Badge>
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
            새로고침
          </Button>
        </header>

        {graphError ? (
          <div className="border-b border-red-400/20 bg-red-500/10 px-5 py-3 text-sm text-red-200">
            {graphError}
          </div>
        ) : null}

        {graphLoading && activeTab !== "notes" && activeTab !== "library" ? (
          <div className="flex flex-1 items-center justify-center text-sm text-fg/65">
            그래프 데이터를 불러오는 중입니다...
          </div>
        ) : (
          <div className="min-h-0 flex-1">
            {activeTab === "canvas" ? (
              <CanvasTab
                projectId={projectId}
                graphNodes={graphNodes}
                graphEdges={graphEdges}
                graphCanvasBlocks={graphCanvasBlocks}
                selectedNodeId={selectedNodeId}
                onSelectNode={handleSelectNode}
                onCreateNote={handleCreateNote}
                onCreatedEntity={handleCreatedEntity}
                autoLayoutTrigger={autoLayoutTrigger}
              />
            ) : null}

            {activeTab === "timeline" ? (
              <TimelineTab
                timelineNodes={timelineNodes}
                selectedNodeId={selectedNodeId}
                onSelectNode={handleSelectNode}
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
