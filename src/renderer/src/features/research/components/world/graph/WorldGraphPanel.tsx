import { useCallback, useState } from "react";
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

export function WorldGraphPanel() {
  const {
    projectId,
    graphNodes,
    graphEdges,
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
    (entityType: string, _newNodeId: string) => {
      if (entityType === "Event") {
        setActiveTab("timeline");
      } else {
        setActiveTab("canvas");
      }
    },
    [],
  );

  const { selectedNode, handleCreatePreset, handleSaveNode } =
    useCanvasTabSidebar({
      projectId,
      graphNodes,
      selectedNodeId,
      onSelectNode: setSelectedNodeId,
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
        <GraphActiveSidebar
          activeTab={activeTab}
          currentProjectTitle={currentProjectTitle}
          nodes={graphNodes}
          timelineNodes={timelineNodes}
          notes={notes}
          selectedNode={selectedNode}
          selectedNoteId={effectiveSelectedNoteId}
          onCreatePreset={handleCreatePreset}
          onSelectNode={setSelectedNodeId}
          onSaveNode={handleSaveNode}
          onSelectNote={setSelectedNoteId}
          onCreateNote={handleCreateNote}
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
                selectedNodeId={selectedNodeId}
                onSelectNode={setSelectedNodeId}
                onCreateNote={handleCreateNote}
                onCreatedEntity={handleCreatedEntity}
              />
            ) : null}

            {activeTab === "timeline" ? (
              <TimelineTab
                selectedNodeId={selectedNodeId}
                onSelectNode={setSelectedNodeId}
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
                selectedNodeId={selectedNodeId}
                onSelectNode={setSelectedNodeId}
              />
            ) : null}

            {activeTab === "library" ? <LibraryTab /> : null}
          </div>
        )}
      </section>
    </div>
  );
}
