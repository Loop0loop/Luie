/**
 * CanvasActivityShell — Obsidian 스타일의 파일 탐색기 트리 사이드바 & 관계 시나리오 분석기 사이드바.
 * 
 * 기능:
 *   - Canvas Mode: Obsidian 스타일의 파일 탐색기 트리 사이드바 렌더링.
 *   - Graph Mode: 관계 시나리오 필터 분석기 사이드바(GraphFilterSidebar) 렌더링.
 *   - 테마 일관성을 위해 shadcn/ui 표준 토큰 및 tailwind 변수만을 사용합니다.
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
  X,
  Users,
  Workflow,
  HelpCircle,
  Calendar
} from "lucide-react";
import { Button } from "@renderer/components/ui/button";
import { Badge } from "@renderer/components/ui/badge";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import { useToast } from "@shared/ui/ToastContext";
import { cn } from "@shared/types/utils";
import { mockExplorerData } from "../../__fixtures__/mockExplorerData";
import type { FileNode } from "../../types/canvas.types";
import { useCanvasViewStore } from "../../stores/canvasViewStore";
import { useGraphStore } from "../../stores/graph/graphStore";

/* ─────────────────────────────────────────── TAB_I18N_KEYS */

const TAB_I18N_KEYS = {
  explorer: "canvas.activity.explorer",
  search: "canvas.activity.search",
  bookmark: "canvas.activity.bookmark",
} as const;

const TOOLBAR_ACTION_KEYS = {
  "new-file": "canvas.activity.newFile",
  "new-folder": "canvas.activity.newFolder",
  sort: "canvas.activity.sort",
} as const;

const getAllFolderIds = (nodes: FileNode[]): string[] => {
  const ids: string[] = [];
  const traverse = (list: FileNode[]) => {
    for (const node of list) {
      if (node.type === "folder") {
        ids.push(node.id);
        if (node.children) {
          traverse(node.children);
        }
      }
    }
  };
  traverse(nodes);
  return ids;
};

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

/* ─────────────────────────────────────────── GraphFilterSidebar Component (Graph 전용 사이드바) */

const GraphFilterSidebar = memo(() => {
  const { t } = useTranslation();
  // Zustand Graph Store 구독 (하드코딩 컬러 완전 소멸 및 표준 테마 결합)
  const activeMode = useGraphStore((state) => state.activeMode);
  const setActiveMode = useGraphStore((state) => state.setActiveMode);
  const selectedChapterFilter = useGraphStore((state) => state.selectedChapterFilter);
  const setSelectedChapterFilter = useGraphStore((state) => state.setSelectedChapterFilter);
  const selectedFocusNode = useGraphStore((state) => state.selectedFocusNode);
  const setSelectedFocusNode = useGraphStore((state) => state.setSelectedFocusNode);

  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground border-r border-border/30 overflow-hidden select-none">
      {/* 헤더 */}
      <div className="flex h-12 items-center justify-between border-b border-border/20 px-4 shrink-0 bg-sidebar/55">
        <div className="flex items-center gap-2">
          <Workflow className="h-4 w-4 text-accent animate-pulse" />
          <span className="text-xs font-black tracking-tight uppercase">
            {t("canvas.graph.scenarioAnalysis", "시나리오 맥락 분석기")}
          </span>
        </div>
        <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
      </div>

      {/* 바디 스크롤 영역 */}
      <ScrollArea className="flex-1 p-4 bg-sidebar/35">
        <div className="flex flex-col gap-5.5">
          
          {/* 모드 선택 세그먼트 (캐릭터 vs 사건/복선) */}
          <div className="flex flex-col gap-2">
            <label className="text-[9.5px] uppercase font-bold tracking-widest text-muted-foreground/80 pl-0.5">
              {t("canvas.graph.analysisMode", "관점 전환 필터")}
            </label>
            <div className="flex items-center gap-1 p-1 rounded-full bg-muted border border-border/50 h-9 shrink-0 shadow-inner">
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  setActiveMode("character");
                  setSelectedFocusNode("all");
                }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 rounded-full text-[10px] font-bold h-7 cursor-pointer border-none transition-all duration-200",
                  activeMode === "character"
                    ? "bg-background text-foreground shadow-sm hover:bg-background"
                    : "text-muted-foreground hover:bg-background/45 hover:text-foreground bg-transparent"
                )}
              >
                <Users className="h-3.5 w-3.5" />
                <span>{t("canvas.graph.characterMap", "인물 관계망")}</span>
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  setActiveMode("event");
                  setSelectedFocusNode("all");
                }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 rounded-full text-[10px] font-bold h-7 cursor-pointer border-none transition-all duration-200",
                  activeMode === "event"
                    ? "bg-background text-foreground shadow-sm hover:bg-background"
                    : "text-muted-foreground hover:bg-background/45 hover:text-foreground bg-transparent"
                )}
              >
                <Workflow className="h-3.5 w-3.5" />
                <span>{t("canvas.graph.eventFlow", "사건 타임라인")}</span>
              </Button>
            </div>
          </div>

          {/* 에피소드/챕터 다중 필터 */}
          <div className="flex flex-col gap-2">
            <label className="text-[9.5px] uppercase font-bold tracking-widest text-muted-foreground/80 pl-0.5 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
              {t("canvas.graph.chapterRange", "에피소드 집필 범위")}
            </label>
            <div className="flex items-center gap-1 p-1 rounded-full bg-muted border border-border/50 h-9 shrink-0 shadow-inner">
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setSelectedChapterFilter("all")}
                className={cn(
                  "flex-1 flex items-center justify-center rounded-full text-[9px] font-bold h-7 cursor-pointer border-none transition-all duration-200",
                  selectedChapterFilter === "all"
                    ? "bg-background text-foreground shadow-sm hover:bg-background"
                    : "text-muted-foreground hover:bg-background/45 hover:text-foreground bg-transparent"
                )}
              >
                {t("canvas.graph.allChapters", "전체 회차 조회")}
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setSelectedChapterFilter("early")}
                className={cn(
                  "flex-1 flex items-center justify-center rounded-full text-[9px] font-bold h-7 cursor-pointer border-none transition-all duration-200",
                  selectedChapterFilter === "early"
                    ? "bg-background text-foreground shadow-sm hover:bg-background"
                    : "text-muted-foreground hover:bg-background/45 hover:text-foreground bg-transparent"
                )}
              >
                {t("canvas.graph.earlyChapters", "초반 시나리오")}
              </Button>
            </div>
          </div>

          {/* 대상 노드 집중 포커싱 필터 */}
          <div className="flex flex-col gap-2">
            <label className="text-[9.5px] uppercase font-bold tracking-widest text-muted-foreground/80 pl-0.5">
              {activeMode === "character" ? t("canvas.graph.characterFocus", "인물 집중 추적") : t("canvas.graph.eventFocus", "특정 사건 추적")}
            </label>
            <div className="relative">
              <select
                value={selectedFocusNode}
                onChange={(e) => setSelectedFocusNode(e.target.value)}
                className="w-full rounded-lg border border-border/80 px-3.5 py-2 text-[11px] font-bold cursor-pointer outline-none bg-background text-foreground hover:bg-muted/40 transition-all appearance-none pr-8 shadow-sm"
              >
                <option value="all">{t("canvas.graph.viewAllNetwork", "전체 관계도 탐색")}</option>
                {activeMode === "character" ? (
                  <>
                    <option value="jinseo">{t("canvas.graph.nodes.jinseo", "진서 (주인공)")}</option>
                    <option value="serin">{t("canvas.graph.nodes.serin", "세린 (첩보원)")}</option>
                  </>
                ) : (
                  <>
                    <option value="ambush">{t("canvas.graph.nodes.ambush", "마차 습격 사건")}</option>
                    <option value="rebels">{t("canvas.graph.nodes.rebels", "반란군 세력")}</option>
                  </>
                )}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/70">
                <ChevronDown className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>

          {/* 작가 시나리오 분석 팁 */}
          <div className="rounded-xl p-3.5 bg-accent/5 dark:bg-accent/10 border border-accent/15 flex gap-2.5 shrink-0 shadow-sm">
            <HelpCircle className="h-4.5 w-4.5 text-accent shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-foreground">{t("canvas.graph.authorGuide", "작가 집필 내비게이션 팁")}</span>
              <p className="text-[9.5px] leading-relaxed text-muted-foreground font-medium break-keep">
                {activeMode === "character"
                  ? t("canvas.graph.characterGuideTip", "별자리 주위를 맴도는 위성들은 특정 인물과의 얽힌 친밀도를 나타냅니다. 노드를 클릭하면 큼직한 설정 단서 분석 메모가 바인더 패널에 활성화됩니다.")
                  : t("canvas.graph.eventGuideTip", "붉은 실선은 원인과 결과의 긴박한 흐름을 의미합니다. 화살표는 사건의 선후 관계를 나타내며, 포커싱 시 해당 루트가 맥동합니다.")}
              </p>
            </div>
          </div>

        </div>
      </ScrollArea>
    </div>
  );
});

GraphFilterSidebar.displayName = "GraphFilterSidebar";

/* ─────────────────────────────────────────── Main Component */

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
        "info"
      );
    }
  }, [toggleFolder, t, showToast]);

  const handleTabChange = useCallback((tabKey: "explorer" | "search" | "bookmark") => {
    showToast(
      t("canvas.graph.demoNotImplemented", {
        actionName: t(TAB_I18N_KEYS[tabKey])
      }),
      "info"
    );
  }, [showToast, t]);

  const handleToolbarAction = useCallback((actionKey: "new-file" | "new-folder" | "sort") => {
    showToast(
      t("canvas.graph.demoNotImplemented", {
        actionName: t(TOOLBAR_ACTION_KEYS[actionKey])
      }),
      "info"
    );
  }, [t, showToast]);

  // 분기 처리: 그래프 모드일 때는 관계 시나리오 필터 사이드바 노출
  if (isGraphMode) {
    return <GraphFilterSidebar />;
  }

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
              return {};
            } else {
              const allIds = getAllFolderIds(mockExplorerData);
              return allIds.reduce((acc, id) => ({ ...acc, [id]: true }), {});
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
