import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useWorldGraphUiStore } from "@renderer/features/research/stores/worldGraphUiStore";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { useMemoStore } from "@renderer/features/research/stores/memoStore";
import { useGraphPluginStore } from "@renderer/features/research/stores/graphPluginStore";
import { syncGraphEntitySelectionToWorkspace } from "@renderer/features/research/utils/graphEntitySync";
import { useCanvasWorkspace } from "./hooks/useCanvasWorkspace";
import { CanvasNavRail } from "./components/nav/CanvasNavRail";
import { CanvasView } from "./views/CanvasView";
import { TimelineView } from "./views/TimelineView";
import { NotesView } from "./views/NotesView";
import { EntityView } from "./views/EntityView";
import { PluginsView } from "./views/PluginsView";
import type { GraphIdeTab } from "@renderer/features/research/stores/worldGraphUiStore";
import type { WorldEntitySourceType } from "@shared/types";

export function WorldCanvasPanel() {
  const { t } = useTranslation();

  const {
    projectId,
    graphNodes,
    graphCanvasBlocks,
    graphCanvasEdges,
    timelineNodes,
    notes,
    graphLoading,
    graphError,
    catalog,
    installed,
    pluginsLoading,
    pluginError,
  } = useCanvasWorkspace();

  // UI store
  const activeTab       = useWorldGraphUiStore((s) => s.activeTab);
  const setActiveTab    = useWorldGraphUiStore((s) => s.setActiveTab);
  const selectedNodeId  = useWorldGraphUiStore((s) => s.selectedNodeId);
  const selectNode      = useWorldGraphUiStore((s) => s.selectNode);
  const noteSearchQuery = useWorldGraphUiStore((s) => s.noteSearchQuery);
  const setNoteSearch   = useWorldGraphUiStore((s) => s.setNoteSearchQuery);
  const selectedNoteId  = useWorldGraphUiStore((s) => s.selectedNoteId);
  const setSelectedNote = useWorldGraphUiStore((s) => s.setSelectedNoteId);

  // Store actions
  const loadGraph           = useWorldBuildingStore((s) => s.loadGraph);
  const createGraphNode     = useWorldBuildingStore((s) => s.createGraphNode);
  const updateNodePosition  = useWorldBuildingStore((s) => s.updateWorldEntityPosition);
  const setCanvasEdges      = useWorldBuildingStore((s) => s.setGraphCanvasEdges);
  const addNote             = useMemoStore((s) => s.addNote);
  const deleteNote          = useMemoStore((s) => s.deleteNote);
  const installPlugin       = useGraphPluginStore((s) => s.installPlugin);
  const uninstallPlugin     = useGraphPluginStore((s) => s.uninstallPlugin);
  const installingId        = useGraphPluginStore((s) => s.installingPluginId);
  const uninstallingId      = useGraphPluginStore((s) => s.uninstallingPluginId);

  const handleSelectTab = useCallback((tab: GraphIdeTab) => setActiveTab(tab), [setActiveTab]);

  const handleRefresh = useCallback(() => {
    if (projectId) void loadGraph(projectId);
  }, [loadGraph, projectId]);

  const handleSelectNode = useCallback(
    (id: string | null) => {
      selectNode(id);
      if (id) {
        const node = graphNodes.find((n) => n.id === id);
        if (node) void syncGraphEntitySelectionToWorkspace(node);
      }
    },
    [selectNode, graphNodes],
  );

  const handleCreateEntity = useCallback(
    async (entityType: WorldEntitySourceType) => {
      if (!projectId) return;
      await createGraphNode({
        projectId,
        entityType,
        name: t(`canvas.create.${entityType.toLowerCase()}DefaultName`),
      });
    },
    [createGraphNode, projectId, t],
  );

  const handleCreateMemo = useCallback(() => {
    if (!projectId) return;
    const created = addNote(projectId, { title: "", content: "", tags: [] });
    if (created) setSelectedNote(created.id);
    setActiveTab("notes");
  }, [addNote, projectId, setActiveTab, setSelectedNote]);

  const handleUpdateNodePosition = useCallback(
    (id: string, x: number, y: number) => {
      void updateNodePosition({ id, positionX: x, positionY: y });
    },
    [updateNodePosition],
  );

  if (graphError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <p className="text-[13px] text-muted">{graphError}</p>
        <button
          type="button"
          onClick={handleRefresh}
          className="rounded-lg border border-border/40 bg-element px-3 py-1.5 text-[11px] text-fg hover:bg-element-hover"
        >
          {t("canvas.action.refresh")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-app">
        <CanvasNavRail
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          onRefresh={handleRefresh}
          isRefreshing={graphLoading}
        />

        <div className="relative min-h-0 flex-1 overflow-hidden">
        {activeTab === "canvas" && (
          <CanvasView
            graphNodes={graphNodes}
            canvasBlocks={graphCanvasBlocks}
            canvasEdges={graphCanvasEdges}
            selectedNodeId={selectedNodeId}
            onSelectNode={handleSelectNode}
            onCreateEntity={handleCreateEntity}
            onCreateMemo={handleCreateMemo}
            onUpdateNodePosition={handleUpdateNodePosition}
            onUpdateEdges={setCanvasEdges}
          />
        )}
        {activeTab === "timeline" && (
          <TimelineView
            eventNodes={timelineNodes}
            selectedNodeId={selectedNodeId}
            onSelectNode={handleSelectNode}
          />
        )}
        {activeTab === "notes" && (
          <NotesView
            notes={notes}
            selectedNoteId={selectedNoteId}
            searchQuery={noteSearchQuery}
            onSelectNote={setSelectedNote}
            onSearchChange={setNoteSearch}
            onCreateNote={handleCreateMemo}
            onDeleteNote={deleteNote}
          />
        )}
        {activeTab === "entity" && (
          <EntityView
            nodes={graphNodes}
            selectedNodeId={selectedNodeId}
            onSelectNode={handleSelectNode}
          />
        )}
        {activeTab === "plugins" && (
          <PluginsView
            catalog={catalog}
            installed={installed}
            isLoading={pluginsLoading}
            error={pluginError}
            installingId={installingId}
            uninstallingId={uninstallingId}
            onInstall={(id) => void installPlugin(id)}
            onUninstall={(id) => void uninstallPlugin(id)}
          />
        )}
        </div>
    </div>
  );
}
