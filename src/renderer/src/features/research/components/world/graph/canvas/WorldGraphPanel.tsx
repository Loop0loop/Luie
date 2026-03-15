import { useCallback, useMemo, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { Badge } from "@renderer/components/ui/badge";
import { Button } from "@renderer/components/ui/button";
import { useGraphPluginStore } from "@renderer/features/research/stores/graphPluginStore";
import { useMemoStore } from "@renderer/features/research/stores/memoStore";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { GRAPH_TAB_ITEMS } from "../constants";
import { useWorldGraphWorkspace } from "../hooks/useWorldGraphWorkspace";
import type { GraphSurfaceTab } from "../types";
import { GraphActiveSidebar } from "../components/GraphActiveSidebar";
import { GraphIconSidebar } from "../components/GraphIconSidebar";
import { CanvasView } from "../views/CanvasView";
import { TimelineView } from "../views/TimelineView";
import { NotesView } from "../views/NotesView";
import { EntityView } from "../views/EntityView";
import { LibraryView } from "../views/LibraryView";

const buildNodeName = (entityType: string) => {
  switch (entityType) {
    case "Character":
      return "새 인물";
    case "Event":
      return "새 사건";
    case "Place":
      return "새 장소";
    case "Concept":
      return "새 개념";
    default:
      return "새 엔티티";
  }
};

export function WorldGraphPanel() {
  const {
    projectId,
    graphNodes,
    graphEdges,
    timelineNodes,
    notes,
    notesLoading,
    notesSaving,
    graphLoading,
    graphError,
    currentProjectTitle,
    catalog,
    installed,
    templates,
    pluginsLoading,
    pluginError,
  } = useWorldGraphWorkspace();

  const createGraphNode = useWorldBuildingStore(
    (state) => state.createGraphNode,
  );
  const updateGraphNode = useWorldBuildingStore(
    (state) => state.updateGraphNode,
  );
  const updateGraphNodePosition = useWorldBuildingStore(
    (state) => state.updateGraphNodePosition,
  );
  const loadGraph = useWorldBuildingStore((state) => state.loadGraph);

  const addNote = useMemoStore((state) => state.addNote);
  const updateNote = useMemoStore((state) => state.updateNote);
  const deleteNote = useMemoStore((state) => state.deleteNote);
  const flushSave = useMemoStore((state) => state.flushSave);

  const installPlugin = useGraphPluginStore((state) => state.installPlugin);
  const uninstallPlugin = useGraphPluginStore((state) => state.uninstallPlugin);
  const applyTemplate = useGraphPluginStore((state) => state.applyTemplate);
  const loadPluginData = useGraphPluginStore((state) => state.loadData);
  const installingPluginId = useGraphPluginStore(
    (state) => state.installingPluginId,
  );
  const uninstallingPluginId = useGraphPluginStore(
    (state) => state.uninstallingPluginId,
  );
  const applyingTemplateKey = useGraphPluginStore(
    (state) => state.applyingTemplateKey,
  );

  const [activeTab, setActiveTab] = useState<GraphSurfaceTab>("canvas");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  const effectiveSelectedNodeId =
    selectedNodeId && graphNodes.some((node) => node.id === selectedNodeId)
      ? selectedNodeId
      : (graphNodes[0]?.id ?? null);

  const effectiveSelectedNoteId =
    selectedNoteId && notes.some((note) => note.id === selectedNoteId)
      ? selectedNoteId
      : (notes[0]?.id ?? null);

  const selectedNode = useMemo(
    () =>
      graphNodes.find((node) => node.id === effectiveSelectedNodeId) ?? null,
    [effectiveSelectedNodeId, graphNodes],
  );

  const activeNote = useMemo(
    () => notes.find((note) => note.id === effectiveSelectedNoteId) ?? null,
    [effectiveSelectedNoteId, notes],
  );

  const activeTabMeta = GRAPH_TAB_ITEMS.find((item) => item.id === activeTab);

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

  const handleCreatePreset = useCallback(
    async (
      entityType: Parameters<typeof createGraphNode>[0]["entityType"],
      subType?: Parameters<typeof createGraphNode>[0]["subType"],
    ) => {
      if (!projectId) {
        return;
      }

      const created = await createGraphNode({
        projectId,
        entityType,
        subType,
        name: buildNodeName(entityType),
        positionX: 140 + graphNodes.length * 32,
        positionY: 140 + graphNodes.length * 24,
      });

      if (!created) {
        return;
      }

      setSelectedNodeId(created.id);
      if (entityType === "Event") {
        setActiveTab("timeline");
        return;
      }
      setActiveTab("canvas");
    },
    [createGraphNode, graphNodes.length, projectId],
  );

  const handleCreateCanvasBlock = useCallback(() => {
    void handleCreatePreset("Concept", "Concept");
  }, [handleCreatePreset]);

  const handleCreateTimelineEvent = useCallback(() => {
    void handleCreatePreset("Event");
  }, [handleCreatePreset]);

  const handleSaveNode = useCallback(
    async (input: { name: string; description: string }) => {
      if (!selectedNode) {
        return;
      }

      await updateGraphNode({
        id: selectedNode.id,
        entityType: selectedNode.entityType,
        name: input.name.trim() || selectedNode.name,
        description: input.description,
        subType: selectedNode.subType,
      });
    },
    [selectedNode, updateGraphNode],
  );

  const handleCreateNote = useCallback(() => {
    if (!projectId) {
      return;
    }

    const created = addNote(projectId, {
      title: "새 스크랩",
      content: "",
      tags: [],
    });

    if (!created) {
      return;
    }

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

  const handleInstallPlugin = useCallback(
    async (pluginId: string) => {
      await installPlugin(pluginId);
    },
    [installPlugin],
  );

  const handleUninstallPlugin = useCallback(
    async (pluginId: string) => {
      await uninstallPlugin(pluginId);
    },
    [uninstallPlugin],
  );

  const handleApplyTemplate = useCallback(
    async (pluginId: string, templateId: string) => {
      if (!projectId) {
        return;
      }

      const result = await applyTemplate({ pluginId, templateId, projectId });
      if (!result.success) {
        return;
      }

      await loadGraph(projectId);
      await loadPluginData(true);
    },
    [applyTemplate, loadGraph, loadPluginData, projectId],
  );

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
              if (!projectId) {
                return;
              }
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
              <CanvasView
                nodes={graphNodes}
                edges={graphEdges}
                selectedNodeId={effectiveSelectedNodeId}
                onSelectNode={setSelectedNodeId}
                onCreateBlock={handleCreateCanvasBlock}
                onCreateTimelineEvent={handleCreateTimelineEvent}
                onCreateNote={handleCreateNote}
                onNodePositionCommit={({ id, x, y }) => {
                  void updateGraphNodePosition({
                    id,
                    positionX: x,
                    positionY: y,
                  });
                }}
              />
            ) : null}

            {activeTab === "timeline" ? (
              <TimelineView
                events={timelineNodes}
                selectedNodeId={effectiveSelectedNodeId}
                onSelectNode={setSelectedNodeId}
              />
            ) : null}

            {activeTab === "notes" ? (
              <NotesView
                currentProjectId={projectId}
                notesLoading={notesLoading}
                notesSaving={notesSaving}
                activeNote={activeNote}
                onCreateNote={handleCreateNote}
                onUpdateNote={updateNote}
                onDeleteNote={handleDeleteNote}
                onSaveNow={() => {
                  void flushSave();
                }}
              />
            ) : null}

            {activeTab === "entity" ? (
              <EntityView
                nodes={graphNodes}
                selectedNodeId={effectiveSelectedNodeId}
                onSelectNode={setSelectedNodeId}
              />
            ) : null}

            {activeTab === "library" ? (
              <LibraryView
                currentProjectId={projectId}
                catalog={catalog}
                installed={installed}
                templates={templates}
                isLoading={pluginsLoading}
                error={pluginError}
                installingPluginId={installingPluginId}
                uninstallingPluginId={uninstallingPluginId}
                applyingTemplateKey={applyingTemplateKey}
                onInstall={handleInstallPlugin}
                onUninstall={handleUninstallPlugin}
                onApplyTemplate={handleApplyTemplate}
              />
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
