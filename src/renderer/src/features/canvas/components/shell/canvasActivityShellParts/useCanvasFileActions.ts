import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useDialog } from "@shared/ui/useDialog";
import { useToast } from "@shared/ui/ToastContext";
import type { WorldGraphCanvasFile } from "@shared/types";
import type { FileNode } from "../../../types/canvas.types";
import { useCanvasViewStore } from "../../../stores/canvasViewStore";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { createExplorerId, findNode } from "./explorerTree";

interface UseCanvasFileActionsParams {
  explorerData: FileNode[];
  selectedNodeId: string | null;
  canvasFiles: readonly WorldGraphCanvasFile[];
  setSelectedNodeId: (id: string | null) => void;
  setExpandedFolders: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

export function useCanvasFileActions({
  explorerData,
  selectedNodeId,
  canvasFiles,
  setSelectedNodeId,
  setExpandedFolders,
}: UseCanvasFileActionsParams) {
  const { t } = useTranslation();
  const dialog = useDialog();
  const { showToast } = useToast();

  const setFocuses = useCanvasViewStore((state) => state.setFocuses);
  const selectNode = useCanvasViewStore((state) => state.selectNode);
  const openEntityPreview = useCanvasViewStore((state) => state.openEntityPreview);
  const clearEntityPreview = useCanvasViewStore((state) => state.clearEntityPreview);
  const setMainView = useUIStore((state) => state.setMainView);
  const setActivePanel = useCanvasViewStore((state) => state.setActivePanel);
  const currentProject = useProjectStore((state) => state.currentProject);
  const loadGraph = useWorldBuildingStore((state) => state.loadGraph);
  const setGraphCanvasFiles = useWorldBuildingStore((state) => state.setGraphCanvasFiles);

  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  }, [setExpandedFolders]);

  const handleNodeClick = useCallback(
    (node: FileNode) => {
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
    },
    [
      clearEntityPreview,
      openEntityPreview,
      selectNode,
      setActivePanel,
      setFocuses,
      setMainView,
      setSelectedNodeId,
      showToast,
      t,
      toggleFolder,
    ],
  );

  const persistCanvasFiles = useCallback(
    async (update: (files: readonly WorldGraphCanvasFile[]) => WorldGraphCanvasFile[]) => {
      if (!useWorldBuildingStore.getState().graphData && currentProject?.id) {
        await loadGraph(currentProject.id);
      }
      const currentFiles =
        useWorldBuildingStore.getState().graphData?.canvasFiles ?? canvasFiles;
      await setGraphCanvasFiles(update(currentFiles));
    },
    [canvasFiles, currentProject?.id, loadGraph, setGraphCanvasFiles],
  );

  const createNode = useCallback(
    async (type: "canvas" | "folder") => {
      if (!currentProject?.id) return;
      const name = (
        await dialog.prompt({
          title: t(type === "canvas" ? "canvas.activity.newFile" : "canvas.activity.newFolder"),
          message: t("canvas.activity.namePrompt", "이름을 입력하세요."),
          defaultValue:
            type === "canvas"
              ? t("canvas.activity.untitledFile", "Untitled")
              : t("canvas.activity.untitledFolder", "New Folder"),
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
    },
    [
      currentProject?.id,
      dialog,
      explorerData,
      persistCanvasFiles,
      selectedNodeId,
      setExpandedFolders,
      setSelectedNodeId,
      t,
    ],
  );

  const handleToolbarAction = useCallback(
    (actionKey: "new-file" | "new-folder") => {
      if (actionKey === "new-file") {
        void createNode("canvas");
        return;
      }
      if (actionKey === "new-folder") {
        void createNode("folder");
        return;
      }
    },
    [createNode],
  );

  const handleRenameNode = useCallback(
    async (node: FileNode) => {
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
      setSelectedNodeId(node.id);
    },
    [dialog, persistCanvasFiles, setSelectedNodeId, t],
  );

  const handleDeleteNode = useCallback(
    async (node: FileNode) => {
      if (!node.canvasFileId) return;
      const confirmed = await dialog.confirm({
        title: t("sidebar.menu.delete"),
        message: t("sidebar.prompt.deleteConfirm", { name: node.name }),
      });
      if (!confirmed) return;
      await persistCanvasFiles((currentFiles) =>
        currentFiles.filter((file) => file.id !== node.canvasFileId),
      );
      setSelectedNodeId(null);
    },
    [dialog, persistCanvasFiles, setSelectedNodeId, t],
  );

  return {
    toggleFolder,
    handleNodeClick,
    handleToolbarAction,
    handleRenameNode,
    handleDeleteNode,
  };
}