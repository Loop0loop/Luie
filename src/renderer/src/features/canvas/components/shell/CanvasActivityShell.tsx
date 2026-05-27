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

/* ─────────────────────────────────────────── GraphFilterSidebar Component (Graph 전용 사이드바 - 초호화 피그마 Aesthetics) */

const GraphFilterSidebar = memo(() => {
  const { t } = useTranslation();
  // Zustand Graph Store 구독 (하드코딩 컬러 완전 소멸 및 표준 테마 결합)
  const activeMode = useGraphStore((state) => state.activeMode);
  const setActiveMode = useGraphStore((state) => state.setActiveMode);
  const selectedChapterFilter = useGraphStore((state) => state.selectedChapterFilter);
  const setSelectedChapterFilter = useGraphStore((state) => state.setSelectedChapterFilter);
  const selectedFocusNode = useGraphStore((state) => state.selectedFocusNode);
  const setSelectedFocusNode = useGraphStore((state) => state.setSelectedFocusNode);

  // 사용자가 직접 에피소드 회차 범위를 조작할 수 있는 로컬 제어 상태 구현
  const [startChapter, setStartChapter] = useState(12);
  const [endChapter, setEndChapter] = useState(15);

  // 시작 챕터 변경 시 연계 로직 (시작 챕터가 종료 챕터 이하가 되도록 제어)
  const handleStartChapterChange = useCallback((val: number) => {
    const nextStart = Math.min(val, endChapter);
    setStartChapter(nextStart);
    
    // 기존 selectedChapterFilter 필터 연계 바인딩
    if (nextStart === 12 && endChapter === 13) {
      setSelectedChapterFilter("early");
    } else {
      setSelectedChapterFilter("all");
    }
  }, [endChapter, setSelectedChapterFilter]);

  // 종료 챕터 변경 시 연계 로직 (종료 챕터가 시작 챕터 이상이 되도록 제어)
  const handleEndChapterChange = useCallback((val: number) => {
    const nextEnd = Math.max(val, startChapter);
    setEndChapter(nextEnd);
    
    // 기존 selectedChapterFilter 필터 연계 바인딩
    if (startChapter === 12 && nextEnd === 13) {
      setSelectedChapterFilter("early");
    } else {
      setSelectedChapterFilter("all");
    }
  }, [startChapter, setSelectedChapterFilter]);

  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground border-r border-border/20 overflow-hidden select-none min-w-0">
      {/* 헤더 - Sidebar.tsx 통일성 */}
      <div className="flex h-13 items-center justify-between border-b border-border/20 px-4.5 shrink-0 bg-element/10 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <Workflow className="h-3.5 w-3.5 text-accent animate-pulse shrink-0" />
          <span className="text-[11px] font-black tracking-widest text-fg uppercase truncate">
            {t("canvas.graph.scenarioAnalysis", "관계 시나리오 분석")}
          </span>
        </div>
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] shrink-0" />
      </div>

      {/* 바디 스크롤 영역 */}
      <ScrollArea className="flex-1 p-4.5 bg-sidebar/20 min-w-0">
        <div className="flex flex-col gap-6 min-w-0">
          
          {/* 관점 전환 필터 (모드 선택 세그먼트) - 반응형 랩 적용 */}
          <div className="flex flex-col gap-2.5 min-w-0">
            <label className="text-[9.5px] uppercase font-black tracking-widest text-muted pl-0.5">
              {t("canvas.graph.analysisMode", "시나리오 분석 모드")}
            </label>
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-element border border-border/20 h-auto py-1 min-w-0 shadow-inner flex-wrap">
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  setActiveMode("character");
                  setSelectedFocusNode("all");
                }}
                className={cn(
                  "flex-1 shrink-0 min-w-[75px] flex items-center justify-center gap-1.5 rounded-lg text-[10px] font-extrabold h-8 cursor-pointer border-none transition-all duration-200",
                  activeMode === "character"
                    ? "bg-panel text-accent shadow-[0_2px_8px_rgba(0,0,0,0.15)] border border-border/20 hover:bg-panel"
                    : "text-muted hover:bg-element-hover/50 hover:text-fg bg-transparent"
                )}
              >
                <Users className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{t("canvas.graph.characterMap", "인물 관계도")}</span>
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  setActiveMode("event");
                  setSelectedFocusNode("all");
                }}
                className={cn(
                  "flex-1 shrink-0 min-w-[75px] flex items-center justify-center gap-1.5 rounded-lg text-[10px] font-extrabold h-8 cursor-pointer border-none transition-all duration-200",
                  activeMode === "event"
                    ? "bg-panel text-accent shadow-[0_2px_8px_rgba(0,0,0,0.15)] border border-border/20 hover:bg-panel"
                    : "text-muted hover:bg-element-hover/50 hover:text-fg bg-transparent"
                )}
              >
                <Workflow className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{t("canvas.graph.eventFlow", "사건 타임라인")}</span>
              </Button>
            </div>
          </div>

          {/* 에피소드/챕터 범위 필터 - 반응형 랩 적용 */}
          <div className="flex flex-col gap-2.5 min-w-0">
            <label className="text-[9.5px] uppercase font-black tracking-widest text-muted pl-0.5 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-muted/80" />
              {t("canvas.graph.chapterRange", "에피소드/챕터 범위")}
            </label>
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-element border border-border/20 h-auto py-1 min-w-0 shadow-inner flex-wrap">
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  setSelectedChapterFilter("all");
                  setStartChapter(12);
                  setEndChapter(15);
                }}
                className={cn(
                  "flex-1 shrink-0 min-w-[85px] flex items-center justify-center rounded-lg text-[9.5px] font-extrabold h-8 cursor-pointer border-none transition-all duration-200",
                  selectedChapterFilter === "all"
                    ? "bg-panel text-accent shadow-[0_2px_8px_rgba(0,0,0,0.15)] border border-border/20 hover:bg-panel"
                    : "text-muted hover:bg-element-hover/50 hover:text-fg bg-transparent"
                )}
              >
                <span className="truncate">{t("canvas.graph.allChapters", "전체 챕터 (12~15화)")}</span>
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  setSelectedChapterFilter("early");
                  setStartChapter(12);
                  setEndChapter(13);
                }}
                className={cn(
                  "flex-1 shrink-0 min-w-[85px] flex items-center justify-center rounded-lg text-[9.5px] font-extrabold h-8 cursor-pointer border-none transition-all duration-200",
                  selectedChapterFilter === "early"
                    ? "bg-panel text-accent shadow-[0_2px_8px_rgba(0,0,0,0.15)] border border-border/20 hover:bg-panel"
                    : "text-muted hover:bg-element-hover/50 hover:text-fg bg-transparent"
                )}
              >
                <span className="truncate">{t("canvas.graph.earlyChapters", "초반 시나리오")}</span>
              </Button>
            </div>
          </div>

          {/* 에피소드 집필 회차 직접 미세 조작기 (Figma 스타일) */}
          <div className="flex flex-col gap-2.5 min-w-0">
            <label className="text-[9.5px] uppercase font-black tracking-widest text-muted pl-0.5 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-muted/80" />
              {t("canvas.graph.rangeControlLabel", "집필 회차 미세 조정")}
            </label>
            <div className="grid grid-cols-2 gap-2 min-w-0">
              {/* 시작 챕터 */}
              <div className="relative min-w-0">
                <select
                  value={startChapter}
                  onChange={(e) => handleStartChapterChange(Number(e.target.value))}
                  className="w-full rounded-xl border border-border/20 pl-3 pr-7 py-2.5 text-[11px] font-extrabold cursor-pointer outline-none bg-element text-fg hover:bg-element-hover/80 transition-all appearance-none shadow-sm min-w-0"
                >
                  <option value={12}>12{t("canvas.graph.chapterUnit", "화")}</option>
                  <option value={13}>13{t("canvas.graph.chapterUnit", "화")}</option>
                  <option value={14}>14{t("canvas.graph.chapterUnit", "화")}</option>
                  <option value={15}>15{t("canvas.graph.chapterUnit", "화")}</option>
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                  <ChevronDown className="h-3 w-3" />
                </div>
              </div>

              {/* 종료 챕터 */}
              <div className="relative min-w-0">
                <select
                  value={endChapter}
                  onChange={(e) => handleEndChapterChange(Number(e.target.value))}
                  className="w-full rounded-xl border border-border/20 pl-3 pr-7 py-2.5 text-[11px] font-extrabold cursor-pointer outline-none bg-element text-fg hover:bg-element-hover/80 transition-all appearance-none shadow-sm min-w-0"
                >
                  <option value={12}>12{t("canvas.graph.chapterUnit", "화")}</option>
                  <option value={13}>13{t("canvas.graph.chapterUnit", "화")}</option>
                  <option value={14}>14{t("canvas.graph.chapterUnit", "화")}</option>
                  <option value={15}>15{t("canvas.graph.chapterUnit", "화")}</option>
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                  <ChevronDown className="h-3 w-3" />
                </div>
              </div>
            </div>
          </div>

          {/* 대상 노드 집중 포커싱 필터 */}
          <div className="flex flex-col gap-2.5 min-w-0">
            <label className="text-[9.5px] uppercase font-black tracking-widest text-muted pl-0.5">
              {activeMode === "character" ? t("canvas.graph.characterFocus", "인물 집중 추적") : t("canvas.graph.eventFocus", "특정 사건 추적")}
            </label>
            <div className="relative min-w-0">
              <select
                value={selectedFocusNode}
                onChange={(e) => setSelectedFocusNode(e.target.value)}
                className="w-full rounded-xl border border-border/20 px-3.5 py-2.5 text-[11.5px] font-extrabold cursor-pointer outline-none bg-element text-fg hover:bg-element-hover/80 transition-all appearance-none pr-8.5 shadow-sm min-w-0"
              >
                <option value="all">{t("canvas.graph.viewAllNetwork", "전체 연결망 보기")}</option>
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
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                <ChevronDown className="h-3.5 w-3.5" />
              </div>
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
