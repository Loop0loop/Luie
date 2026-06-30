import { memo } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  Layout,
  Pencil,
  Trash2,
} from "lucide-react";
import { Badge } from "@renderer/components/ui/badge";
import { cn } from "@shared/types/utils";

import type { FileNode } from "../../../types/canvas.types";

interface TreeNodeProps {
  node: FileNode;
  depth: number;
  expandedFolders: Record<string, boolean>;
  selectedNodeId: string | null;
  toggleFolder: (id: string) => void;
  handleNodeClick: (node: FileNode) => void;
  onRenameNode: (node: FileNode) => void;
  onDeleteNode: (node: FileNode) => void;
}

export const TreeNode = memo(({
  node,
  depth,
  expandedFolders,
  selectedNodeId,
  toggleFolder,
  handleNodeClick,
  onRenameNode,
  onDeleteNode,
}: TreeNodeProps) => {
  const { t } = useTranslation();
  const isFolder = node.type === "folder";
  const isExpanded = expandedFolders[node.id];
  const isSelected = selectedNodeId === node.id;

  return (
    <div className="flex flex-col select-none">
      <div
        onClick={() => handleNodeClick(node)}
        style={{ paddingLeft: `${depth * 12 + 10}px` }}
        className={cn(
          "group flex h-7 items-center gap-1.5 rounded cursor-pointer text-xs transition-colors duration-150",
          isSelected
            ? "bg-active text-fg font-semibold"
            : "text-muted hover:bg-muted/40 hover:text-fg",
        )}
      >
        {isFolder ? (
          <span className="shrink-0 text-muted/60">
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </span>
        ) : (
          <span className="w-3.5 h-3.5" />
        )}

        <span className="shrink-0 text-muted/75 group-hover:text-fg">
          {node.type === "folder" ? (
            isExpanded ? (
              <FolderOpen className="h-3.5 w-3.5" />
            ) : (
              <Folder className="h-3.5 w-3.5" />
            )
          ) : node.type === "canvas" ? (
            <Layout className="h-3.5 w-3.5 text-accent" />
          ) : (
            <FileText className="h-3.5 w-3.5" />
          )}
        </span>

        <span className="truncate flex-1">{node.name}</span>

        {node.type === "canvas" && (
          <Badge
            variant="outline"
            className="shrink-0 scale-75 origin-right border-border/80 bg-app/50 px-1 py-0 text-[9px] uppercase tracking-wider text-muted"
          >
            {t("canvas.activity.canvas")}
          </Badge>
        )}

        {!node.readOnly && (
          <div className="ml-auto hidden shrink-0 items-center gap-0.5 pr-1 group-hover:flex">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onRenameNode(node);
              }}
              className="flex h-5 w-5 items-center justify-center rounded-control text-muted hover:bg-muted/50 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              title={t("sidebar.menu.rename")}
              aria-label={t("sidebar.menu.rename")}
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDeleteNode(node);
              }}
              className="flex h-5 w-5 items-center justify-center rounded-control text-muted hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              title={t("sidebar.menu.delete")}
              aria-label={t("sidebar.menu.delete")}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {isFolder && isExpanded && node.children && node.children.length > 0 && (
        <div className="flex flex-col mt-0.5">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedFolders={expandedFolders}
              selectedNodeId={selectedNodeId}
              toggleFolder={toggleFolder}
              handleNodeClick={handleNodeClick}
              onRenameNode={onRenameNode}
              onDeleteNode={onDeleteNode}
            />
          ))}
        </div>
      )}
    </div>
  );
});

TreeNode.displayName = "TreeNode";
