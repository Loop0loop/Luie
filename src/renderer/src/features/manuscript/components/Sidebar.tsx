import { lazy, memo, Suspense, type CSSProperties, type ReactNode } from "react";
import { cn } from "@shared/types/utils";
import { DraggableItem } from "@shared/ui/DraggableItem";
import {
  Settings,
  Plus,
  ChevronDown,
  ChevronRight,
  FileText,
  BookOpen,
  Trash2,
  FolderOpen,
  MoreVertical,
  Edit2,
  ArrowRightFromLine,
  ArrowDownFromLine,
  Copy,
  RotateCcw,
  History,
  Sparkles,
  GitBranch,
  Workflow,
} from "lucide-react";
import type { DragData } from "@shared/ui/GlobalDragContext";
import {
  useSidebarLogic,
  type SidebarItem,
} from "@renderer/features/manuscript/components/useSidebarLogic";
import { EDITOR_WINDOW_BAR_HEIGHT_PX } from "@renderer/shared/constants/editorLayout";
import { ensureChapterContent } from "@renderer/features/manuscript/stores/chapterContentStore";
import { prefetchResearchPanel } from "@renderer/features/workspace/services/chunkPrefetch";
import type { ResearchTab } from "@renderer/features/workspace/stores/uiStore";

const SnapshotList = lazy(() =>
  import("@renderer/features/snapshot/components/SnapshotList").then(
    (module) => ({
      default: module.SnapshotList,
    }),
  ),
);
const TrashList = lazy(() =>
  import("@renderer/features/trash/components/TrashList").then((module) => ({
    default: module.TrashList,
  })),
);

const isMacOS = navigator.userAgent.toLowerCase().includes("mac");

// NOTE: research-item의 아이콘/hoverId/label 키는 정적이다. 렌더 본문에서 매번 8키 객체와
// 아이콘 JSX를 새로 만들면 사이드바 리렌더마다 낭비가 생기므로 모듈 상수로 올린다. label만
// i18n `t`에 의존하므로 labelKey/labelFallback로 보관하고 렌더 시점에 번역한다.
const RESEARCH_ITEM_META: Record<
  string,
  {
    Icon: typeof FolderOpen;
    hoverId: string;
    labelKey: string;
    labelFallback?: string;
  }
> = {
  character: { Icon: FolderOpen, hoverId: "res-char", labelKey: "sidebar.item.characters" },
  event: { Icon: FolderOpen, hoverId: "res-event", labelKey: "research.title.events" },
  faction: { Icon: FolderOpen, hoverId: "res-faction", labelKey: "research.title.factions" },
  world: { Icon: FolderOpen, hoverId: "res-world", labelKey: "sidebar.item.world" },
  scrap: { Icon: BookOpen, hoverId: "res-scrap", labelKey: "sidebar.item.scrap" },
  plotboard: {
    Icon: GitBranch,
    hoverId: "res-plotboard",
    labelKey: "research.title.plotBoard",
    labelFallback: "플롯 보드",
  },
  untitled: {
    Icon: Workflow,
    hoverId: "res-untitled",
    labelKey: "research.title.untitled",
    labelFallback: "스토리 라인",
  },
  analysis: { Icon: Sparkles, hoverId: "res-analysis", labelKey: "research.title.analysis" },
};

interface SidebarProps {
  onOpenSettings: () => void;
  onPrefetchSettings?: () => void;
  onSelectResearchItem: (
    type: ResearchTab,
  ) => void;
  onSplitView?: (type: "vertical" | "horizontal", contentId: string) => void;
  /** canvas mode에서도 같은 sidebar shell을 재사용하도록 내부 content만 교체한다. */
  canvasContent?: ReactNode;
}

function Sidebar({
  onOpenSettings,
  onPrefetchSettings,
  onSelectResearchItem,
  onSplitView,
  canvasContent,
}: SidebarProps) {
  const {
    t,
    sidebarItems,
    menuOpenId,
    menuPosition,
    menuRef,
    isManuscriptOpen,
    setManuscriptOpen,
    isResearchOpen,
    setResearchOpen,
    isSnapshotOpen,
    setSnapshotOpen,
    isTrashOpen,
    setTrashOpen,
    setTrashRefreshKey,
    handleMenuClick,
    handleRenameProject,
    handleAction,
    closeMenu,
    activeChapterId,
    handleSelectChapter,
    handleAddChapter,
    currentProjectTitle,
    currentProjectId,
  } = useSidebarLogic({ onSplitView });

  const getItemKey = (index: number, item: SidebarItem): string => {
    if (item.type === "chapter") return item.chapter.id;
    if (item.type === "research-item") return `research-${item.id}`;
    if (item.type === "trash-list")
      return `trash-${item.projectId}-${item.refreshKey}`;
    return `${item.type}-${index}`;
  };

  const renderItem = (item: SidebarItem) => {
    if (item.type === "manuscript-header") {
      return (
        <div
          className="flex items-center px-4 py-1.5 text-[11px] font-semibold text-muted uppercase tracking-wider cursor-pointer hover:text-fg transition-colors"
          onClick={() => setManuscriptOpen(!isManuscriptOpen)}
        >
          {isManuscriptOpen ? (
            <ChevronDown className="mr-1.5 opacity-70 icon-xs" />
          ) : (
            <ChevronRight className="mr-1.5 opacity-70 icon-xs" />
          )}
          <span>{t("sidebar.section.manuscript")}</span>
        </div>
      );
    }

    if (item.type === "chapter") {
      const { chapter } = item;
      return (
        <DraggableItem
          id={`chapter-${chapter.id}`}
          data={{
            type: "chapter",
            id: chapter.id,
            title: chapter.title || "Untitled",
          }}
        >
          <div
            className={cn(
              "group flex items-center px-4 py-1.5 pl-9 cursor-pointer text-[13px] transition-all",
              activeChapterId === chapter.id
                ? "bg-active text-fg font-medium border-l-[3px] border-accent"
                : "text-muted border-l-2 border-transparent hover:bg-surface-hover hover:text-fg",
            )}
            // NOTE: click보다 먼저 발화하는 pointerdown에서 본문을 미리 받아 전환 시
            // 로딩 게이트가 드러나지 않게 한다(SidebarChapterList와 같은 정책).
            onPointerDown={() => {
              void ensureChapterContent(chapter.id);
            }}
            onClick={() => handleSelectChapter(chapter.id)}
          >
            <FileText
              className={cn(
                "mr-2 icon-sm",
                activeChapterId === chapter.id ? "text-fg" : "text-muted",
              )}
            />
            <span className="whitespace-nowrap overflow-hidden text-ellipsis">
              {chapter.order}. {chapter.title}
            </span>

            {/* NOTE: hover 표시는 JS state 대신 CSS group-hover로 처리한다. hoveredItemId
                state는 마우스가 항목을 지날 때마다 사이드바 목록 전체를 리렌더시켰다. */}
            <div
              className={cn(
                "ml-auto p-0.5 rounded hover:bg-bg-active text-muted hover:text-fg opacity-0 group-hover:opacity-100 focus-within:opacity-100",
                menuOpenId === chapter.id && "opacity-100",
              )}
              onClick={(e) => handleMenuClick(e, chapter.id)}
            >
              <MoreVertical className="icon-sm" />
            </div>
          </div>
        </DraggableItem>
      );
    }

    if (item.type === "add-chapter") {
      return (
        <div
          className="flex items-center px-4 py-1.5 pl-9 cursor-pointer text-[13px] text-muted border-l-2 border-transparent hover:bg-surface-hover hover:text-fg transition-all"
          onClick={() => void handleAddChapter()}
          style={{ color: "var(--text-tertiary)" }}
        >
          <Plus className="mr-2 text-muted icon-sm" />
          <span>{t("sidebar.addChapter")}</span>
        </div>
      );
    }

    if (item.type === "research-header") {
      return (
        <div
          className="flex items-center px-4 py-1.5 text-[11px] font-semibold text-muted uppercase tracking-wider cursor-pointer hover:text-fg transition-colors"
          onClick={() => setResearchOpen(!isResearchOpen)}
        >
          {isResearchOpen ? (
            <ChevronDown className="mr-1.5 opacity-70 icon-xs" />
          ) : (
            <ChevronRight className="mr-1.5 opacity-70 icon-xs" />
          )}
          <span>{t("sidebar.section.research")}</span>
        </div>
      );
    }

    if (item.type === "research-item") {
      const dragType: DragData["type"] =
        item.id === "scrap"
          ? "memo"
          : item.id === "plotboard" || item.id === "untitled"
            ? "world"
            : item.id;
      const entry = RESEARCH_ITEM_META[item.id];
      const meta = {
        label: entry.labelFallback
          ? t(entry.labelKey, entry.labelFallback)
          : t(entry.labelKey),
        Icon: entry.Icon,
        hoverId: entry.hoverId,
      };

      return (
        <DraggableItem
          id={`research-${item.id}`}
          data={{
            type: dragType,
            id: item.id,
            title: meta.label,
          }}
          disabled
          className="group flex items-center px-4 py-1.5 pl-9 cursor-pointer text-[13px] text-muted border-l-2 border-transparent hover:bg-surface-hover hover:text-fg transition-all"
        >
          <div
            className="flex items-center w-full"
            onClick={() => onSelectResearchItem(item.id)}
            // NOTE: research 패널은 lazy 청크다. hover/pointerdown에서 미리 깐다.
            onPointerDown={prefetchResearchPanel}
            onMouseEnter={prefetchResearchPanel}
          >
            <meta.Icon className="mr-2 text-muted icon-sm" />
            <span>{meta.label}</span>
            {/* NOTE: hover 표시는 CSS group-hover로 처리한다 — JS hover state 제거. */}
            <div
              className={cn(
                "ml-auto p-0.5 rounded hover:bg-bg-active text-muted hover:text-fg opacity-0 group-hover:opacity-100 focus-within:opacity-100",
                menuOpenId === meta.hoverId && "opacity-100",
              )}
              onClick={(e) => handleMenuClick(e, meta.hoverId)}
            >
              <MoreVertical className="icon-sm" />
            </div>
          </div>
        </DraggableItem>
      );
    }

    if (item.type === "snapshot-header") {
      return (
        <div
          className="flex items-center px-4 py-1.5 text-[11px] font-semibold text-muted uppercase tracking-wider cursor-pointer hover:text-fg transition-colors"
          onClick={() => setSnapshotOpen(!isSnapshotOpen)}
        >
          {isSnapshotOpen ? (
            <ChevronDown className="mr-1.5 opacity-70 icon-xs" />
          ) : (
            <ChevronRight className="mr-1.5 opacity-70 icon-xs" />
          )}
          <History className="mr-2 text-muted icon-sm" />
          <span>{t("sidebar.section.snapshot")}</span>
        </div>
      );
    }

    if (item.type === "snapshot-list") {
      return (
        <div className="h-60 border-b border-border">
          <Suspense
            fallback={
              <div className="p-3 text-xs text-muted">{t("loading")}</div>
            }
          >
            <SnapshotList chapterId={item.chapterId} />
          </Suspense>
        </div>
      );
    }

    if (item.type === "snapshot-empty-msg") {
      return (
        <div className="px-4 py-2 text-xs text-muted italic">
          {t("sidebar.snapshotEmpty")}
        </div>
      );
    }

    if (item.type === "trash-header") {
      return (
        <div className="flex items-center px-4 py-1.5 text-[11px] font-semibold text-muted uppercase tracking-wider">
          <button
            type="button"
            className="flex items-center cursor-pointer hover:text-fg transition-colors"
            onClick={() => setTrashOpen(!isTrashOpen)}
          >
            {isTrashOpen ? (
              <ChevronDown className="mr-1.5 opacity-70 icon-xs" />
            ) : (
              <ChevronRight className="mr-1.5 opacity-70 icon-xs" />
            )}
            <span>{t("sidebar.section.trash")}</span>
          </button>
          {isTrashOpen && (
            <button
              type="button"
              className="ml-auto p-1 rounded hover:bg-active text-muted hover:text-fg"
              onClick={() => setTrashRefreshKey((prev) => prev + 1)}
              title={t("sidebar.tooltip.refresh")}
            >
              <RotateCcw className="icon-xs" />
            </button>
          )}
        </div>
      );
    }

    if (item.type === "trash-list") {
      return (
        <div className="h-60 border-b border-border">
          <Suspense
            fallback={
              <div className="p-3 text-xs text-muted">{t("loading")}</div>
            }
          >
            <TrashList
              projectId={item.projectId}
              refreshKey={item.refreshKey}
            />
          </Suspense>
        </div>
      );
    }

    return (
      <div
        className="flex items-center px-4 py-1.5 pl-9 cursor-pointer text-[13px] text-muted border-l-2 border-transparent hover:bg-surface-hover hover:text-fg transition-all"
        style={{ fontStyle: "italic", color: "var(--text-tertiary)" }}
      >
        <Trash2 className="mr-2 text-muted icon-sm" />
        <span>{t("sidebar.trashEmpty")}</span>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col select-none" data-testid="sidebar">
      {isMacOS && (
        <div
          aria-hidden="true"
          className="shrink-0"
          style={{
            height: EDITOR_WINDOW_BAR_HEIGHT_PX,
            WebkitAppRegion: "drag",
          } as CSSProperties}
        />
      )}
      {canvasContent ? (
        canvasContent
      ) : (
        <>
          {menuOpenId && (
            <div
              className="fixed inset-0 z-dropdown bg-transparent"
              onPointerDown={closeMenu}
            />
          )}
          {menuOpenId && (
            <div
              ref={menuRef}
              className="fixed z-dropdown bg-panel border border-border rounded-panel shadow-lg min-w-42.5 p-1.5 animate-in fade-in zoom-in-95 duration-100 flex flex-col"
              style={{ top: menuPosition.y, left: menuPosition.x }}
            >
              <div
                className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-fg cursor-pointer rounded-control transition-all hover:bg-active hover:text-fg"
                onClick={() => void handleAction("open_below", menuOpenId)}
              >
                <ArrowDownFromLine className="icon-sm" />{" "}
                {t("sidebar.menu.openBelow")}
              </div>
              <div
                className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-fg cursor-pointer rounded-control transition-all hover:bg-active hover:text-fg"
                onClick={() => void handleAction("open_right", menuOpenId)}
              >
                <ArrowRightFromLine className="icon-sm" />{" "}
                {t("sidebar.menu.openRight")}
              </div>
              <div className="h-px bg-border my-1" />
              <div
                className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-fg cursor-pointer rounded-control transition-all hover:bg-active hover:text-fg"
                onClick={() => void handleAction("rename", menuOpenId)}
              >
                <Edit2 className="icon-sm" /> {t("sidebar.menu.rename")}
              </div>
              <div
                className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-fg cursor-pointer rounded-control transition-all hover:bg-active hover:text-fg"
                onClick={() => void handleAction("duplicate", menuOpenId)}
              >
                <Copy className="icon-sm" /> {t("sidebar.menu.duplicate")}
              </div>
              <div
                className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-fg cursor-pointer rounded-control transition-all hover:bg-active hover:text-fg"
                onClick={() => void handleAction("delete", menuOpenId)}
                style={{ color: "hsl(var(--destructive))" }}
              >
                <Trash2 className="icon-sm" /> {t("sidebar.menu.delete")}
              </div>
            </div>
          )}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-sm font-bold text-fg">
                {currentProjectTitle || t("sidebar.defaultProjectTitle")}
              </h2>
              <button
                type="button"
                className="p-1 rounded hover:bg-active text-muted hover:text-fg"
                onClick={handleRenameProject}
                title={t("sidebar.tooltip.renameProject")}
                disabled={!currentProjectId}
              >
                <Edit2 className="icon-xs" />
              </button>
            </div>
            <div className="text-[11px] text-muted uppercase tracking-wider">
              {t("sidebar.binderTitle")}
            </div>
          </div>

          <div className="flex-1 min-h-0 py-3 [content-visibility:auto] overflow-y-auto">
            {sidebarItems.map((item, index) => (
              <div key={getItemKey(index, item)}>{renderItem(item)}</div>
            ))}
          </div>

          <div className="p-3">
            <button
              className="flex items-center gap-2 w-full p-2 bg-transparent border-none rounded-control text-muted text-[13px] cursor-pointer hover:bg-surface-hover hover:text-fg transition-colors"
              onClick={onOpenSettings}
              onPointerEnter={onPrefetchSettings}
            >
              <Settings className="icon-md" />
              <span>{t("sidebar.settingsLabel")}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default memo(Sidebar);
