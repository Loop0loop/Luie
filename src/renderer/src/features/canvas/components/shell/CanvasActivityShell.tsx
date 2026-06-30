/**
 * CanvasActivityShell — Redesigned minimal sidebar for canvas explorer.
 *
 * Design decisions:
 *   - Single compact header (no tab bar — search/bookmark were stubs)
 *   - Toolbar actions integrated into header row
 *   - Cleaner file tree with better visual hierarchy
 *   - Graph mode renders GraphFilterSidebar (Phase 4 redesign)
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronsUpDown,
  FilePlus,
  FolderPlus,
  X,
} from "lucide-react";
import { Button } from "@renderer/components/ui/button";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import { useDialog } from "@shared/ui/useDialog";
import { useToast } from "@shared/ui/ToastContext";
import type { WorldGraphCanvasFile } from "@shared/types";

import type { FileNode } from "../../types/canvas.types";
import { useCanvasViewStore } from "../../stores/canvasViewStore";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useCharacterStore } from "@renderer/features/research/stores/characterStore";
import { useEventStore } from "@renderer/features/research/stores/eventStore";
import { useFactionStore } from "@renderer/features/research/stores/factionStore";
import { useMemoStore } from "@renderer/features/research/stores/memoStore";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import {
  GraphFilterSidebar,
  TreeNode,
  getAllFolderIds,
} from "./canvasActivityShellParts";

interface CanvasActivityShellProps {
  onClose?: () => void;
}

const createExplorerId = (type: FileNode["type"]) => `${type}-${crypto.randomUUID()}`;

const CATEGORY_FOLDERS = {
  characters: "canvas-folder-characters",
  events: "canvas-folder-events",
  scraps: "canvas-folder-scraps",
  factions: "canvas-folder-factions",
} as const;

const findNode = (nodes: readonly FileNode[], id: string | null): FileNode | null => {
  if (!id) return null;
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findNode(node.children ?? [], id);
    if (child) return child;
  }
  return null;
};

const sortNodes = (nodes: FileNode[]): FileNode[] =>
  [...nodes]
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    .map((node) => ({
      ...node,
      children: node.children ? sortNodes(node.children) : undefined,
    }));

const buildCanvasFileNodes = (
  files: readonly WorldGraphCanvasFile[],
  parentId: string | null,
  visited = new Set<string>(),
): FileNode[] =>
  sortNodes(
    files
      .filter((file) => (file.parentId ?? null) === parentId)
      .filter((file) => !visited.has(file.id))
      .map((file) => ({
        id: file.id,
        name: file.name,
        type: file.kind === "folder" ? "folder" : "canvas",
        canvasFileId: file.id,
        mainView: { type: "canvas" },
        children:
          file.kind === "folder"
            ? buildCanvasFileNodes(files, file.id, new Set([...visited, file.id]))
            : undefined,
      })),
  );

export default function CanvasActivityShell({ onClose }: CanvasActivityShellProps) {
  const { t } = useTranslation();
  const dialog = useDialog();
  const { showToast } = useToast();

  const activePanel = useCanvasViewStore((state) => state.activePanel);
  const setActivePanel = useCanvasViewStore((state) => state.setActivePanel);
  const setFocuses = useCanvasViewStore((state) => state.setFocuses);
  const selectNode = useCanvasViewStore((state) => state.selectNode);
  const openEntityPreview = useCanvasViewStore((state) => state.openEntityPreview);
  const clearEntityPreview = useCanvasViewStore((state) => state.clearEntityPreview);
  const isGraphMode = activePanel === "graph";
  const setMainView = useUIStore((state) => state.setMainView);
  const currentProject = useProjectStore((state) => state.currentProject);
  const characters = useCharacterStore((state) => state.items);
  const events = useEventStore((state) => state.items);
  const factions = useFactionStore((state) => state.items);
  const notes = useMemoStore((state) => state.notes);
  const graphData = useWorldBuildingStore((state) => state.graphData);
  const loadGraph = useWorldBuildingStore((state) => state.loadGraph);
  const setGraphCanvasFiles = useWorldBuildingStore((state) => state.setGraphCanvasFiles);

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

  const explorerData = useMemo<FileNode[]>(() => {
    const canvasFileNodes = buildCanvasFileNodes(canvasFiles, null);

    return sortNodes([
      {
        id: CATEGORY_FOLDERS.characters,
        name: t("research.title.characters", "Characters"),
        type: "folder",
        readOnly: true,
        mainView: { type: "canvas" },
        focusIds: characters.map((character) => character.id),
        children: characters.map((character) => ({
          id: character.id,
          name: character.name,
          type: "file",
          readOnly: true,
          mainView: { type: "character", id: character.id },
          focusIds: [character.id],
        })),
      },
      {
        id: CATEGORY_FOLDERS.events,
        name: t("research.title.events", "Events"),
        type: "folder",
        readOnly: true,
        mainView: { type: "canvas" },
        focusIds: events.map((event) => event.id),
        children: events.map((event) => ({
          id: event.id,
          name: event.name,
          type: "file",
          readOnly: true,
          mainView: { type: "event", id: event.id },
          focusIds: [event.id],
        })),
      },
      {
        id: CATEGORY_FOLDERS.scraps,
        name: t("research.title.scrap", "Scrap"),
        type: "folder",
        readOnly: true,
        mainView: { type: "canvas" },
        children: notes.map((note) => ({
          id: note.id,
          name: note.title,
          type: "file",
          readOnly: true,
          mainView: { type: "memo", id: note.id },
        })),
      },
      {
        id: CATEGORY_FOLDERS.factions,
        name: t("research.title.factions", "Factions"),
        type: "folder",
        readOnly: true,
        mainView: { type: "canvas" },
        focusIds: factions.map((faction) => faction.id),
        children: factions.map((faction) => ({
          id: faction.id,
          name: faction.name,
          type: "file",
          readOnly: true,
          mainView: { type: "faction", id: faction.id },
          focusIds: [faction.id],
        })),
      },
      ...canvasFileNodes,
    ]);
  }, [canvasFiles, characters, events, factions, notes, t]);

  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  }, []);

  const handleNodeClick = useCallback((node: FileNode) => {
    setSelectedNodeId(node.id);
    setFocuses(node.focusIds ?? []);
    if (
      node.mainView?.type === "character" ||
      node.mainView?.type === "event" ||
      node.mainView?.type === "faction" ||
      node.mainView?.type === "memo"
    ) {
      openEntityPreview({ kind: node.mainView.type, id: node.mainView.id ?? node.id });
      return;
    }
    selectNode(node.focusIds?.length === 1 ? node.focusIds[0] : null);
    if (node.mainView?.type === "canvas") {
      clearEntityPreview();
      setMainView(node.mainView);
      setActivePanel("canvas");
    }
    if (node.type === "folder") {
      toggleFolder(node.id);
      clearEntityPreview();
    } else if (!node.mainView) {
      showToast(t("canvas.graph.demoNotImplemented", { actionName: node.name }), "info");
    }
  }, [clearEntityPreview, openEntityPreview, selectNode, setActivePanel, setFocuses, setMainView, showToast, t, toggleFolder]);

  const persistCanvasFiles = useCallback(async (
    update: (files: readonly WorldGraphCanvasFile[]) => WorldGraphCanvasFile[],
  ) => {
    if (!useWorldBuildingStore.getState().graphData && currentProject?.id) {
      await loadGraph(currentProject.id);
    }
    const currentFiles =
      useWorldBuildingStore.getState().graphData?.canvasFiles ?? canvasFiles;
    await setGraphCanvasFiles(update(currentFiles));
  }, [canvasFiles, currentProject?.id, loadGraph, setGraphCanvasFiles]);

  const createNode = useCallback(async (type: "canvas" | "folder") => {
    if (!currentProject?.id) return;
    const name = (
      await dialog.prompt({
        title: t(type === "canvas" ? "canvas.activity.newFile" : "canvas.activity.newFolder"),
        message: t("canvas.activity.namePrompt", "이름을 입력하세요."),
        defaultValue: type === "canvas" ? t("canvas.activity.untitledFile", "Untitled") : t("canvas.activity.untitledFolder", "New Folder"),
      })
    )?.trim();
    if (!name) return;

    const selectedNode = findNode(explorerData, selectedNodeId);
    const parentId =
      selectedNode?.type === "folder" && selectedNode.canvasFileId
        ? selectedNode.canvasFileId
        : null;
    const nextFile: WorldGraphCanvasFile = {
      id: createExplorerId(type),
      kind: type === "folder" ? "folder" : "canvas",
      name,
      parentId,
      updatedAt: new Date().toISOString(),
    };
    await persistCanvasFiles((currentFiles) => [...currentFiles, nextFile]);
    setSelectedNodeId(nextFile.id);
    if (parentId) {
      setExpandedFolders((prev) => ({ ...prev, [parentId]: true }));
    }
  }, [currentProject?.id, dialog, explorerData, persistCanvasFiles, selectedNodeId, t]);

  const handleToolbarAction = useCallback((actionKey: "new-file" | "new-folder") => {
    if (actionKey === "new-file") {
      void createNode("canvas");
      return;
    }
    if (actionKey === "new-folder") {
      void createNode("folder");
      return;
    }
  }, [createNode]);

  const handleRenameNode = useCallback(async (node: FileNode) => {
    if (!node.canvasFileId) return;
    const name = (
      await dialog.prompt({
        title: t("sidebar.menu.rename"),
        message: t("sidebar.prompt.renameTitle"),
        defaultValue: node.name,
      })
    )?.trim();
    if (!name || name === node.name) return;
    await persistCanvasFiles((currentFiles) =>
      currentFiles.map((file) =>
        file.id === node.canvasFileId
          ? { ...file, name, updatedAt: new Date().toISOString() }
          : file,
      ),
    );
  }, [dialog, persistCanvasFiles, t]);

  const handleDeleteNode = useCallback(async (node: FileNode) => {
    if (!node.canvasFileId) return;
    const confirmed = await dialog.confirm({
      title: t("sidebar.menu.delete"),
      message: t("sidebar.prompt.deleteConfirm"),
      isDestructive: true,
    });
    if (!confirmed) return;
    await persistCanvasFiles((currentFiles) => {
      const idsToDelete = new Set([node.canvasFileId]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const file of currentFiles) {
          if (file.parentId && idsToDelete.has(file.parentId) && !idsToDelete.has(file.id)) {
            idsToDelete.add(file.id);
            changed = true;
          }
        }
      }
      return currentFiles.filter((file) => !idsToDelete.has(file.id));
    });
    setSelectedNodeId((prev) => (prev === node.id ? null : prev));
  }, [dialog, persistCanvasFiles, t]);

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
      <div className="flex h-10 items-center justify-between border-b border-border/20 px-3 shrink-0 select-none bg-element/30">
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
            className="h-6 w-6 text-muted/75 hover:bg-muted/40 hover:text-fg [&_svg]:h-3.5 [&_svg]:w-3.5"
          >
            <FilePlus />
          </Button>

          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => handleToolbarAction("new-folder")}
            title={t("canvas.activity.newFolder")}
            aria-label={t("canvas.activity.newFolder")}
            className="h-6 w-6 text-muted/75 hover:bg-muted/40 hover:text-fg [&_svg]:h-3.5 [&_svg]:w-3.5"
          >
            <FolderPlus />
          </Button>

          <Button
            variant="ghost"
            size="icon-xs"
            onClick={toggleAllFolders}
            title={t("canvas.activity.toggleAll", "Toggle all")}
            aria-label={t("canvas.activity.toggleAll", "Toggle all")}
            className="h-6 w-6 text-muted/75 hover:bg-muted/40 hover:text-fg [&_svg]:h-3.5 [&_svg]:w-3.5"
          >
            <ChevronsUpDown />
          </Button>

          <div className="w-px h-4 bg-border/50 mx-0.5" />

          <button
            onClick={() => onClose?.()}
            className="flex h-6 w-6 items-center justify-center rounded-control border-none bg-transparent text-muted hover:bg-active hover:text-fg cursor-pointer transition-colors duration-150"
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
