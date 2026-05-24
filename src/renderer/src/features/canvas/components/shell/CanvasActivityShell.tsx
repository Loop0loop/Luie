/**
 * CanvasActivityShell — Obsidian 스타일의 파일 탐색기 트리 사이드바.
 * 
 * 기능:
 *   - Lucide 아이콘 및 폰트 구조 중심의 정밀한 파일 브라우저 제공.
 *   - 계층형 폴더/파일 토글(Open/Close) 및 하이라이트 인터랙션.
 *   - 활성화된 캔버스 항목에 i18n 결합된 Badge ("CANVAS") 매핑.
 */

import { useState, useCallback, memo } from "react";
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
  Search,
  Bookmark,
  Files,
  ChevronsUpDown,
  X
} from "lucide-react";
import { Button } from "@renderer/components/ui/button";
import { Badge } from "@renderer/components/ui/badge";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import { useToast } from "@shared/ui/ToastContext";
import { cn } from "@shared/types/utils";
import { mockExplorerData } from "../../__fixtures__/mockExplorerData";
import type { FileNode } from "../../types/canvas.types";

/* ─────────────────────────────────────────── TAB_I18N_KEYS */

const TAB_I18N_KEYS = {
  explorer: "canvas.activity.explorer",
  search: "canvas.activity.search",
  bookmark: "canvas.activity.bookmark",
} as const;

/* ─────────────────────────────────────────── TreeNode Component (Subcomponent) */

interface TreeNodeProps {
  node: FileNode;
  depth: number;
  expandedFolders: Record<string, boolean>;
  selectedNodeId: string | null;
  toggleFolder: (id: string) => void;
  handleNodeClick: (node: FileNode) => void;
}

const TreeNode = memo(({
  node,
  depth,
  expandedFolders,
  selectedNodeId,
  toggleFolder,
  handleNodeClick,
}: TreeNodeProps) => {
  // prop 드릴링 제거: useTranslation() 직접 사용으로 타입 시스템과 성능 최적화
  const { t } = useTranslation();
  const isFolder = node.type === "folder";
  const isExpanded = expandedFolders[node.id];
  const isSelected = selectedNodeId === node.id;

  return (
    <div className="flex flex-col select-none">
      {/* Node Row */}
      <div
        onClick={() => handleNodeClick(node)}
        style={{ paddingLeft: `${depth * 12 + 10}px` }}
        className={cn(
          "group flex h-7 items-center gap-1.5 rounded cursor-pointer text-xs transition-all duration-150",
          isSelected
            ? "bg-active text-foreground font-semibold"
            : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
        )}
      >
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
            {t("canvas.activity.canvas")}
          </Badge>
        )}
      </div>

      {/* Children render */}
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
            />
          ))}
        </div>
      )}
    </div>
  );
});

TreeNode.displayName = "TreeNode";

/* ─────────────────────────────────────────── Main Component */

interface CanvasActivityShellProps {
  onClose?: () => void;
}

export default function CanvasActivityShell({ onClose }: CanvasActivityShellProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();

  // 크로스 도메인 상태 오염(버그) 제거: 파일 탐색기 선택 상태는 local selectedNodeId로 안전하게 관리
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
        "info"
      );
    }
  }, [toggleFolder, t, showToast]);

  // TAB_I18N_KEYS 매핑 객체 활용 방식으로 as never 제거
  const handleTabChange = useCallback((tabKey: "explorer" | "search" | "bookmark") => {
    showToast(
      t("canvas.graph.demoNotImplemented", {
        actionName: t(TAB_I18N_KEYS[tabKey])
      }),
      "info"
    );
  }, [showToast, t]);

  // 툴바 액션 핸들러 분리
  const handleToolbarAction = useCallback((actionKey: "new-file" | "new-folder" | "sort") => {
    const actionNames: Record<string, string> = {
      "new-file": t("canvas.activity.newFile"),
      "new-folder": t("canvas.activity.newFolder"),
      sort: t("canvas.activity.sort"),
    };
    showToast(
      t("canvas.graph.demoNotImplemented", {
        actionName: actionNames[actionKey]
      }),
      "info"
    );
  }, [t, showToast]);

  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-foreground border-r border-border/30 overflow-hidden">
      {/* 1층: 탐색기/검색/북마크 탭 및 전역 제어 토글 */}
      <div className="flex h-12 items-center justify-between border-b border-border/20 px-3 shrink-0 select-none">
        <div className="flex items-center gap-2">
          {/* 파일 탐색기 탭 */}
          <button
            onClick={() => handleTabChange("explorer")}
            className="flex items-center justify-center p-1.5 rounded-md bg-active text-foreground transition-all duration-150 relative border-none cursor-pointer"
            title={t("canvas.activity.explorer")}
          >
            <Files className="h-[18px] w-[18px] text-accent" />
            <span className="absolute -bottom-[9px] left-1/2 -translate-x-1/2 w-8 h-[2px] bg-accent" />
          </button>

          {/* 검색 탭 */}
          <button
            onClick={() => handleTabChange("search")}
            className="flex items-center justify-center p-1.5 rounded-md text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-all duration-150 border-none cursor-pointer bg-transparent"
            title={t("canvas.activity.search")}
          >
            <Search className="h-[18px] w-[18px]" />
          </button>

          {/* 북마크 탭 */}
          <button
            onClick={() => handleTabChange("bookmark")}
            className="flex items-center justify-center p-1.5 rounded-md text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-all duration-150 border-none cursor-pointer bg-transparent"
            title={t("canvas.activity.bookmark")}
          >
            <Bookmark className="h-[18px] w-[18px]" />
          </button>
        </div>

        {/* 오른쪽 제어 버튼 세트 */}
        <div className="flex items-center gap-1">
          {/* 단방향 데이터 흐름을 준수하는 onClose 위임 호출 */}
          <button
            onClick={() => onClose?.()}
            className="flex h-9 w-9 items-center justify-center rounded-md border-none bg-transparent p-2 text-muted-foreground hover:bg-active hover:text-foreground cursor-pointer transition-colors duration-150"
            title={t("canvas.activity.closeCanvas")}
          >
            <X className="icon-xl" />
          </button>
        </div>
      </div>

      {/* 2층: 툴바 영역 */}
      <div className="flex h-9 items-center justify-between border-b border-border/20 px-3 bg-muted/10 shrink-0 select-none">
        <div className="flex items-center gap-1">
          {/* 새 파일 생성 */}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => handleToolbarAction("new-file")}
            title={t("canvas.activity.newFile")}
            className="h-6 w-6 text-muted-foreground/75 hover:bg-muted/40 hover:text-foreground [&_svg]:h-3.5 [&_svg]:w-3.5"
          >
            <FilePlus />
          </Button>

          {/* 새 폴더 생성 */}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => handleToolbarAction("new-folder")}
            title={t("canvas.activity.newFolder")}
            className="h-6 w-6 text-muted-foreground/75 hover:bg-muted/40 hover:text-foreground [&_svg]:h-3.5 [&_svg]:w-3.5"
          >
            <FolderPlus />
          </Button>

          {/* 정렬 방식 변경 */}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => handleToolbarAction("sort")}
            title={t("canvas.activity.sort")}
            className="h-6 w-6 text-muted-foreground/75 hover:bg-muted/40 hover:text-foreground [&_svg]:h-3.5 [&_svg]:w-3.5"
          >
            <ArrowUpDown />
          </Button>
        </div>

        {/* 모두 펼치기 / 접기 토글 */}
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setExpandedFolders((prev) => {
            const hasExpanded = Object.values(prev).some(Boolean);
            if (hasExpanded) {
              return {} as Record<string, boolean>;
            } else {
              return {
                "folder-luie": true,
                "folder-feature": true,
              } as Record<string, boolean>;
            }
          })}
          title="모두 펼치기 / 접기"
          className="h-6 w-6 text-muted-foreground/75 hover:bg-muted/40 hover:text-foreground [&_svg]:h-3.5 [&_svg]:w-3.5"
        >
          <ChevronsUpDown />
        </Button>
      </div>

      {/* Scrollable Obsidian Tree Body */}
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
