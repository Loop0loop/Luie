/**
 * CanvasActivityShell — Obsidian 스타일의 파일 탐색기 트리 사이드바.
 * 
 * 기능:
 *   - Lucide 아이콘 및 폰트 구조 중심의 정밀한 파일 브라우저 제공.
 *   - 계층형 폴더/파일 토글(Open/Close) 및 하이라이트 인터랙션.
 *   - 활성화된 캔버스 항목에 shadcn/ui Badge ("CANVAS") 결합.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { 
  FilePlus, 
  FolderPlus, 
  ArrowUpDown, 
  ChevronDown, 
  ChevronRight, 
  Folder, 
  FolderOpen, 
  FileText, 
  Layout, 
  X
} from "lucide-react";
import { Button } from "@renderer/components/ui/button";
import { Badge } from "@renderer/components/ui/badge";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import { useToast } from "@shared/ui/ToastContext";

interface FileNode {
  id: string;
  name: string;
  type: "file" | "canvas" | "folder";
  children?: FileNode[];
}

export default function CanvasActivityShell() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    "folder-luie": true,
    "folder-feature": true,
  });
  const [selectedNodeId, setSelectedNodeId] = useState<string>("canvas-main");

  // Obsidian 트리 목업 데이터 구조
  const treeData: FileNode[] = [
    { id: "folder-interview", name: "면접", type: "folder", children: [] },
    { id: "folder-untitled", name: "무제", type: "folder", children: [] },
    { id: "folder-idea", name: "아이디어?", type: "folder", children: [] },
    { id: "folder-cs", name: "CS", type: "folder", children: [] },
    { id: "folder-dev", name: "Dev", type: "folder", children: [] },
    {
      id: "folder-luie",
      name: "Luie",
      type: "folder",
      children: [
        {
          id: "folder-feature",
          name: "feature",
          type: "folder",
          children: [
            { id: "canvas-vis", name: "시각화", type: "canvas" },
            { id: "file-anything", name: "아무거나 적자", type: "file" },
            { id: "file-err", name: "Err", type: "file" },
            { id: "canvas-luie", name: "Luie Canvas", type: "canvas" },
            { id: "canvas-flow", name: "Luie flow", type: "canvas" },
            { id: "file-rag", name: "RAG", type: "file" },
            { id: "file-todo", name: "TODO", type: "file" },
          ],
        },
        { id: "folder-luie-todo", name: "Luie TODO", type: "folder", children: [] },
        { id: "folder-memory", name: "Memory Engine", type: "folder", children: [] },
        { id: "folder-prd", name: "PRD", type: "folder", children: [] },
        { id: "folder-ui", name: "UI", type: "folder", children: [] },
      ],
    },
    { id: "file-24todo", name: "24 TODO", type: "file" },
    { id: "file-intro", name: "30초 자기소개", type: "file" },
    { id: "canvas-main", name: "캔버스", type: "canvas" },
  ];

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  const handleNodeClick = (node: FileNode) => {
    if (node.type === "folder") {
      toggleFolder(node.id);
    } else {
      setSelectedNodeId(node.id);
      showToast(
        t("canvas.status.demoNotImplemented", { actionName: node.name }),
        "info"
      );
    }
  };

  const handleHeaderAction = (actionKey: string) => {
    showToast(
      t("canvas.status.demoNotImplemented", { actionKey }),
      "info"
    );
  };

  const renderTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map((node) => {
      const isFolder = node.type === "folder";
      const isExpanded = expandedFolders[node.id];
      const isSelected = selectedNodeId === node.id;

      return (
        <div key={node.id} className="flex flex-col select-none">
          {/* Node Row */}
          <div
            onClick={() => handleNodeClick(node)}
            style={{ paddingLeft: `${depth * 12 + 10}px` }}
            className={`group flex h-7 items-center gap-1.5 rounded cursor-pointer text-xs transition-all duration-150 ${
              isSelected
                ? "bg-active text-foreground font-semibold"
                : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
            }`}
          >
            {/* Collapse Icon for folders */}
            {isFolder ? (
              <span className="shrink-0 text-muted-foreground/60">
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </span>
            ) : (
              <span className="w-3.5 h-3.5" />
            )}

            {/* Folder / File Icons */}
            <span className="shrink-0 text-muted-foreground/75 group-hover:text-foreground">
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

            {/* Node Label */}
            <span className="truncate flex-1">{node.name}</span>

            {/* Canvas Badge */}
            {node.type === "canvas" && (
              <Badge
                variant="outline"
                className="shrink-0 scale-75 origin-right border-border/80 bg-background/50 px-1 py-0 text-[9px] uppercase tracking-wider text-muted-foreground"
              >
                CANVAS
              </Badge>
            )}
          </div>

          {/* Children render */}
          {isFolder && isExpanded && node.children && node.children.length > 0 && (
            <div className="flex flex-col mt-0.5">
              {renderTree(node.children, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-foreground border-r border-border/30 overflow-hidden">
      {/* Obsidian Header Action Bar */}
      <div className="flex h-11 items-center justify-between border-b border-border/30 px-3 shrink-0">
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {t("canvas.activity.explorer")}
        </span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => handleHeaderAction("new-file")}
            title="새 파일"
          >
            <FilePlus className="h-3.5 w-3.5 text-muted-foreground/70 hover:text-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => handleHeaderAction("new-folder")}
            title="새 폴더"
          >
            <FolderPlus className="h-3.5 w-3.5 text-muted-foreground/70 hover:text-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => handleHeaderAction("sort")}
            title="정렬"
          >
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70 hover:text-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setExpandedFolders({})}
            title="모두 접기"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground/70 hover:text-foreground" />
          </Button>
        </div>
      </div>

      {/* Scrollable Obsidian Tree Body */}
      <ScrollArea className="flex-1 p-2">
        <div className="flex flex-col gap-0.5">
          {renderTree(treeData)}
        </div>
      </ScrollArea>
    </div>
  );
}
