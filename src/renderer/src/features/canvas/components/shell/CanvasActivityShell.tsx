/**
 * CanvasActivityShell — Obsidian 스타일 파일 탐색기 shell과 graph mode sidebar 분기.
 */

import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowUpDown,
  Bookmark,
  ChevronsUpDown,
  FilePlus,
  Files,
  FolderPlus,
  Search,
  X,
} from "lucide-react";
import { Button } from "@renderer/components/ui/button";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import { useToast } from "@shared/ui/ToastContext";

import { mockExplorerData } from "../../__fixtures__/mockExplorerData";
import type { FileNode } from "../../types/canvas.types";
import { useCanvasViewStore } from "../../stores/canvasViewStore";
import {
  GraphFilterSidebar,
  TAB_I18N_KEYS,
  TOOLBAR_ACTION_KEYS,
  TreeNode,
  getAllFolderIds,
} from "./canvasActivityShellParts";

interface CanvasActivityShellProps {
  onClose?: () => void;
}

export default function CanvasActivityShell({ onClose }: CanvasActivityShellProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const activePanel = useCanvasViewStore((state) => state.activePanel);
  const isGraphMode = activePanel === "graph";

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    "folder-luie": true,
    "folder-feature": true,
  });

  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  }, []);

  const handleNodeClick = useCallback((node: FileNode) => {
    if (node.type === "folder") {
      toggleFolder(node.id);
    } else {
      setSelectedNodeId(node.id);
      showToast(
        t("canvas.graph.demoNotImplemented", { actionName: node.name }),
        "info",
      );
    }
  }, [toggleFolder, t, showToast]);

  const handleTabChange = useCallback((tabKey: "explorer" | "search" | "bookmark") => {
    showToast(
      t("canvas.graph.demoNotImplemented", {
        actionName: t(TAB_I18N_KEYS[tabKey]),
      }),
      "info",
    );
  }, [showToast, t]);

  const handleToolbarAction = useCallback((actionKey: "new-file" | "new-folder" | "sort") => {
    showToast(
      t("canvas.graph.demoNotImplemented", {
        actionName: t(TOOLBAR_ACTION_KEYS[actionKey]),
      }),
      "info",
    );
  }, [t, showToast]);

  const toggleAllFolders = useCallback(() => {
    setExpandedFolders((prev) => {
      const hasExpanded = Object.values(prev).some(Boolean);
      if (hasExpanded) {
        return {};
      }

      const allIds = getAllFolderIds(mockExplorerData);
      return allIds.reduce((acc, id) => ({ ...acc, [id]: true }), {});
    });
  }, []);

  if (isGraphMode) {
    return <GraphFilterSidebar />;
  }

  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-fg border-r border-border/30 overflow-hidden">
      <div className="flex h-12 items-center justify-between border-b border-border/20 px-3 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleTabChange("explorer")}
            className="flex items-center justify-center p-1.5 rounded-control bg-active text-fg transition-all duration-150 relative border-none cursor-pointer"
            title={t("canvas.activity.explorer")}
          >
            <Files className="h-[18px] w-[18px] text-accent" />
            <span className="absolute -bottom-[9px] left-1/2 -translate-x-1/2 w-8 h-[2px] bg-accent" />
          </button>

          <button
            onClick={() => handleTabChange("search")}
            className="flex items-center justify-center p-1.5 rounded-control text-muted hover:bg-muted/40 hover:text-fg transition-all duration-150 border-none cursor-pointer bg-transparent"
            title={t("canvas.activity.search")}
          >
            <Search className="h-[18px] w-[18px]" />
          </button>

          <button
            onClick={() => handleTabChange("bookmark")}
            className="flex items-center justify-center p-1.5 rounded-control text-muted hover:bg-muted/40 hover:text-fg transition-all duration-150 border-none cursor-pointer bg-transparent"
            title={t("canvas.activity.bookmark")}
          >
            <Bookmark className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onClose?.()}
            className="flex h-9 w-9 items-center justify-center rounded-control border-none bg-transparent p-2 text-muted hover:bg-active hover:text-fg cursor-pointer transition-colors duration-150"
            title={t("canvas.activity.closeCanvas")}
          >
            <X className="icon-xl" />
          </button>
        </div>
      </div>

      <div className="flex h-9 items-center justify-between border-b border-border/20 px-3 bg-muted/10 shrink-0 select-none">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => handleToolbarAction("new-file")}
            title={t("canvas.activity.newFile")}
            className="h-6 w-6 text-muted/75 hover:bg-muted/40 hover:text-fg [&_svg]:h-3.5 [&_svg]:w-3.5"
          >
            <FilePlus />
          </Button>

          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => handleToolbarAction("new-folder")}
            title={t("canvas.activity.newFolder")}
            className="h-6 w-6 text-muted/75 hover:bg-muted/40 hover:text-fg [&_svg]:h-3.5 [&_svg]:w-3.5"
          >
            <FolderPlus />
          </Button>

          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => handleToolbarAction("sort")}
            title={t("canvas.activity.sort")}
            className="h-6 w-6 text-muted/75 hover:bg-muted/40 hover:text-fg [&_svg]:h-3.5 [&_svg]:w-3.5"
          >
            <ArrowUpDown />
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon-xs"
          onClick={toggleAllFolders}
          title="모두 펼치기 / 접기"
          className="h-6 w-6 text-muted/75 hover:bg-muted/40 hover:text-fg [&_svg]:h-3.5 [&_svg]:w-3.5"
        >
          <ChevronsUpDown />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-2">
        <div className="flex flex-col gap-0.5">
          {mockExplorerData.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              depth={0}
              expandedFolders={expandedFolders}
              selectedNodeId={selectedNodeId}
              toggleFolder={toggleFolder}
              handleNodeClick={handleNodeClick}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
