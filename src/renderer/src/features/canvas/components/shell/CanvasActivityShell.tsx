/**
 * CanvasActivityShell — Redesigned minimal sidebar for canvas explorer.
 *
 * Design decisions:
 *   - Single compact header (no tab bar — search/bookmark were stubs)
 *   - Toolbar actions integrated into header row
 *   - Cleaner file tree with better visual hierarchy
 *   - Graph mode renders GraphFilterSidebar (Phase 4 redesign)
 */

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronsUpDown,
  FilePlus,
  FolderPlus,
  X,
} from "lucide-react";
import { Button } from "@renderer/components/ui/button";
import { ScrollArea } from "@renderer/components/ui/scroll-area";

import { useCanvasViewStore } from "../../stores/canvasViewStore";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useCharacterStore } from "@renderer/features/research/stores/characterStore";
import { useEventStore } from "@renderer/features/research/stores/eventStore";
import { useFactionStore } from "@renderer/features/research/stores/factionStore";
import { useMemoStore } from "@renderer/features/research/stores/memoStore";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import {
  GraphFilterSidebar,
  TreeNode,
  getAllFolderIds,
  CATEGORY_FOLDERS,
  useExplorerData,
  useCanvasFileActions,
} from "./canvasActivityShellParts";

interface CanvasActivityShellProps {
  onClose?: () => void;
}

export default function CanvasActivityShell({ onClose }: CanvasActivityShellProps) {
  const { t } = useTranslation();

  const activePanel = useCanvasViewStore((state) => state.activePanel);
  const isGraphMode = activePanel === "graph";
  const currentProject = useProjectStore((state) => state.currentProject);
  const characters = useCharacterStore((state) => state.items);
  const events = useEventStore((state) => state.items);
  const factions = useFactionStore((state) => state.items);
  const notes = useMemoStore((state) => state.notes);
  const graphData = useWorldBuildingStore((state) => state.graphData);
  const loadGraph = useWorldBuildingStore((state) => state.loadGraph);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    [CATEGORY_FOLDERS.characters]: true,
    [CATEGORY_FOLDERS.events]: true,
    [CATEGORY_FOLDERS.scraps]: true,
    [CATEGORY_FOLDERS.factions]: true,
  });

  const canvasFiles = graphData?.canvasFiles ?? [];

  useEffect(() => {
    const projectId = currentProject?.id;
    if (!projectId) return;
    void useCharacterStore.getState().loadCharacters(projectId);
    void useEventStore.getState().loadEvents(projectId);
    void useFactionStore.getState().loadFactions(projectId);
    void useMemoStore.getState().loadNotes(
      projectId,
      currentProject.projectPath ?? null,
    );
    void loadGraph(projectId);
  }, [currentProject?.id, currentProject?.projectPath, loadGraph]);

  const explorerData = useExplorerData({
    characters,
    events,
    factions,
    notes,
    canvasFiles,
  });

  const {
    toggleFolder,
    handleNodeClick,
    handleToolbarAction,
    handleRenameNode,
    handleDeleteNode,
  } = useCanvasFileActions({
    explorerData,
    selectedNodeId,
    canvasFiles,
    setSelectedNodeId,
    setExpandedFolders,
  });

  const toggleAllFolders = useCallback(() => {
    setExpandedFolders((prev) => {
      const hasExpanded = Object.values(prev).some(Boolean);
      if (hasExpanded) {
        return {};
      }

      const allIds = getAllFolderIds(explorerData);
      return allIds.reduce((acc, id) => ({ ...acc, [id]: true }), {});
    });
  }, [explorerData]);

  if (isGraphMode) {
    return <GraphFilterSidebar />;
  }

  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-fg border-r border-border/30 overflow-hidden">
      {/* Compact header: title + actions in one row */}
      <div className="flex h-11 items-center justify-between border-b border-border/10 px-3 shrink-0 select-none bg-transparent">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted truncate">
          {t("canvas.activity.explorer", "Explorer")}
        </span>

        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => handleToolbarAction("new-file")}
            title={t("canvas.activity.newFile")}
            aria-label={t("canvas.activity.newFile")}
            className="h-6 w-6 text-muted/75 hover:bg-surface-hover hover:text-fg [&_svg]:h-3.5 [&_svg]:w-3.5 rounded-control transition-colors"
          >
            <FilePlus />
          </Button>

          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => handleToolbarAction("new-folder")}
            title={t("canvas.activity.newFolder")}
            aria-label={t("canvas.activity.newFolder")}
            className="h-6 w-6 text-muted/75 hover:bg-surface-hover hover:text-fg [&_svg]:h-3.5 [&_svg]:w-3.5 rounded-control transition-colors"
          >
            <FolderPlus />
          </Button>

          <Button
            variant="ghost"
            size="icon-xs"
            onClick={toggleAllFolders}
            title={t("canvas.activity.toggleAll", "Toggle all")}
            aria-label={t("canvas.activity.toggleAll", "Toggle all")}
            className="h-6 w-6 text-muted/75 hover:bg-surface-hover hover:text-fg [&_svg]:h-3.5 [&_svg]:w-3.5 rounded-control transition-colors"
          >
            <ChevronsUpDown />
          </Button>

          <div className="w-px h-4 bg-border/20 mx-0.5" />

          <button
            type="button"
            onClick={() => onClose?.()}
            className="flex h-6 w-6 items-center justify-center rounded-control border-none bg-transparent text-muted hover:bg-surface-hover hover:text-fg cursor-pointer transition-colors duration-150"
            title={t("canvas.activity.closeCanvas")}
            aria-label={t("canvas.activity.closeCanvas")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1 py-1.5 px-1">
        <div className="flex flex-col gap-px">
          {explorerData.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              depth={0}
              expandedFolders={expandedFolders}
              selectedNodeId={selectedNodeId}
              toggleFolder={toggleFolder}
              handleNodeClick={handleNodeClick}
              onRenameNode={handleRenameNode}
              onDeleteNode={handleDeleteNode}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
