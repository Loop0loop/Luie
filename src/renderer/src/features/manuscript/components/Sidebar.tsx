import { memo } from "react";
import { cn } from "@shared/types/utils";
import { DraggableItem } from "@shared/ui/DraggableItem";
import { Virtuoso } from "react-virtuoso";
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
} from "lucide-react";
import { SnapshotList } from "@renderer/features/snapshot/components/SnapshotList";
import { TrashList } from "@renderer/features/trash/components/TrashList";
import type { DragData } from "@shared/ui/GlobalDragContext";
import { useSidebarLogic } from "@renderer/features/manuscript/components/useSidebarLogic";

interface SidebarProps {
  currentProjectTitle?: string;
  currentProjectId?: string;
  onOpenSettings: () => void;
  onPrefetchSettings?: () => void;
  onSelectResearchItem: (type: "character" | "world" | "scrap" | "analysis") => void;
  onSplitView?: (type: "vertical" | "horizontal", contentId: string) => void;
}

function Sidebar({
  currentProjectTitle,
  currentProjectId,
  onOpenSettings,
  onPrefetchSettings,
  onSelectResearchItem,
  onSplitView,
}: SidebarProps) {
  const {
    t,
    sidebarItems,
    menuOpenId,
    menuPosition,
    menuRef,
    hoveredItemId,
    setHoveredItemId,
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
  } = useSidebarLogic({ currentProjectTitle, currentProjectId, onSplitView });

  return (
    <div className="h-full flex flex-col select-none" data-testid="sidebar">
      {menuOpenId && (
        <div
          className="fixed inset-0 z-modal bg-transparent"
          onPointerDown={closeMenu}
        />
      )}
      {/* Context Menu Popup */}
      {menuOpenId && (
        <div
          ref={menuRef}
          className="fixed z-modal bg-panel border border-border rounded-lg shadow-lg min-w-42.5 p-1.5 animate-in fade-in zoom-in-95 duration-100 flex flex-col"
          style={{ top: menuPosition.y, left: menuPosition.x }}
        >
          <div
            className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-fg cursor-pointer rounded-md transition-all hover:bg-active hover:text-fg"
            onClick={() => void handleAction("open_below", menuOpenId)}
          >
            <ArrowDownFromLine className="icon-sm" /> {t("sidebar.menu.openBelow")}
          </div>
          <div
            className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-fg cursor-pointer rounded-md transition-all hover:bg-active hover:text-fg"
            onClick={() => void handleAction("open_right", menuOpenId)}
          >
            <ArrowRightFromLine className="icon-sm" /> {t("sidebar.menu.openRight")}
          </div>
          <div className="h-px bg-border my-1" />
          <div
            className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-fg cursor-pointer rounded-md transition-all hover:bg-active hover:text-fg"
            onClick={() => void handleAction("rename", menuOpenId)}
          >
            <Edit2 className="icon-sm" /> {t("sidebar.menu.rename")}
          </div>
          <div
            className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-fg cursor-pointer rounded-md transition-all hover:bg-active hover:text-fg"
            onClick={() => void handleAction("duplicate", menuOpenId)}
          >
            <Copy className="icon-sm" /> {t("sidebar.menu.duplicate")}
          </div>
          <div
            className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-fg cursor-pointer rounded-md transition-all hover:bg-active hover:text-fg"
            onClick={() => void handleAction("delete", menuOpenId)}
            style={{ color: "#ef4444" }}
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
        <div className="text-[11px] text-muted uppercase tracking-wider">{t("sidebar.binderTitle")}</div>
      </div>

      <div className="flex-1 min-h-0 py-3 [content-visibility:auto]">
        <Virtuoso
          data={sidebarItems}
          style={{ height: "100%" }}
          computeItemKey={(index, item) => {
            if (item.type === "chapter") return item.chapter.id;
            if (item.type === "research-item") return `research-${item.id}`;
            if (item.type === "trash-list") return `trash-${item.projectId}-${item.refreshKey}`;
            return `${item.type}-${index}`;
          }}
          itemContent={(_index, item) => {
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
                  key={chapter.id}
                  id={`chapter-${chapter.id}`}
                  data={{ type: "chapter", id: chapter.id, title: chapter.title || "Untitled" }}
                >
                  <div
                    className={cn(
                      "flex items-center px-4 py-1.5 pl-9 cursor-pointer text-[13px] transition-all",
                      activeChapterId === chapter.id
                        ? "bg-active text-fg font-medium border-l-[3px] border-accent"
                        : "text-muted border-l-2 border-transparent hover:bg-surface-hover hover:text-fg",
                    )}
                    onClick={() => handleSelectChapter(chapter.id)}
                    onMouseEnter={() => setHoveredItemId(chapter.id)}
                    onMouseLeave={() => setHoveredItemId(null)}
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

                    {(hoveredItemId === chapter.id || menuOpenId === chapter.id) && (
                      <div
                        className="ml-auto p-0.5 rounded hover:bg-bg-active text-muted hover:text-fg"
                        onClick={(e) => handleMenuClick(e, chapter.id)}
                      >
                        <MoreVertical className="icon-sm" />
                      </div>
                    )}
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
              const dragType: DragData["type"] = item.id === "scrap" ? "memo" : item.id;
              const meta = {
                character: {
                  label: t("sidebar.item.characters"),
                  icon: <FolderOpen className="mr-2 text-muted icon-sm" />,
                  hoverId: "res-char",
                },
                world: {
                  label: t("sidebar.item.world"),
                  icon: <FolderOpen className="mr-2 text-muted icon-sm" />,
                  hoverId: "res-world",
                },
                scrap: {
                  label: t("sidebar.item.scrap"),
                  icon: <BookOpen className="mr-2 text-muted icon-sm" />,
                  hoverId: "res-scrap",
                },
                analysis: {
                  label: t("research.title.analysis"),
                  icon: <Sparkles className="mr-2 text-muted icon-sm" />,
                  hoverId: "res-analysis",
                },
              }[item.id];

              return (
                <DraggableItem
                  key={item.id}
                  id={`research-${item.id}`}
                  data={{
                    type: dragType,
                    id: item.id,
                    title: meta.label
                  }}
                  className="flex items-center px-4 py-1.5 pl-9 cursor-pointer text-[13px] text-muted border-l-2 border-transparent hover:bg-surface-hover hover:text-fg transition-all"
                >
                  <div
                    className="flex items-center w-full"
                    onClick={() => onSelectResearchItem(item.id)}
                    onMouseEnter={() => setHoveredItemId(meta.hoverId)}
                    onMouseLeave={() => setHoveredItemId(null)}
                  >
                    {meta.icon}
                    <span>{meta.label}</span>
                    {(hoveredItemId === meta.hoverId || menuOpenId === meta.hoverId) && (
                      <div
                        className="ml-auto p-0.5 rounded hover:bg-bg-active text-muted hover:text-fg"
                        onClick={(e) => handleMenuClick(e, meta.hoverId)}
                      >
                        <MoreVertical className="icon-sm" />
                      </div>
                    )}
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
                  <SnapshotList chapterId={item.chapterId} />
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
                  <TrashList projectId={item.projectId} refreshKey={item.refreshKey} />
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
          }}
        />
      </div>

      <div className="p-3">
        <button
          className="flex items-center gap-2 w-full p-2 bg-transparent border-none rounded-md text-muted text-[13px] cursor-pointer hover:bg-surface-hover hover:text-fg transition-colors"
          onClick={onOpenSettings}
          onPointerEnter={onPrefetchSettings}
        >
          <Settings className="icon-md" />
          <span>{t("sidebar.settingsLabel")}</span>
        </button>
      </div>
    </div>
  );
}

export default memo(Sidebar);
