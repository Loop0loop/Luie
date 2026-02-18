import { useState, useEffect, useMemo, memo } from "react";
import { cn } from "../../../../shared/types/utils";
import { DraggableItem } from "../common/DraggableItem";
import { api } from "../../services/api";
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
import { SnapshotList } from "../snapshot/SnapshotList";
import { TrashList } from "../trash/TrashList";
import { useProjectStore } from "../../stores/projectStore";
import { useTranslation } from "react-i18next";
import { useShortcutCommand } from "../../hooks/useShortcutCommand";
import { useUIStore } from "../../stores/uiStore";
import { useFloatingMenu } from "../../hooks/useFloatingMenu";
import { useDialog } from "../common/DialogProvider";
import type { DragData } from "../common/GlobalDragContext";

interface Chapter {
  id: string;
  title: string;
  order: number;
}

interface SidebarProps {
  chapters: Chapter[];
  activeChapterId?: string;
  currentProjectTitle?: string;
  currentProjectId?: string;
  onSelectChapter: (id: string) => void;
  onAddChapter: () => void;
  onRenameChapter?: (id: string, title: string) => void;
  onDuplicateChapter?: (id: string) => void;
  onDeleteChapter?: (id: string) => void;
  onOpenSettings: () => void;
  onPrefetchSettings?: () => void;
  onSelectResearchItem: (type: "character" | "world" | "scrap" | "analysis") => void;
  onSplitView?: (type: "vertical" | "horizontal", contentId: string) => void;
}

type SidebarItem =
  | { type: "manuscript-header" }
  | { type: "chapter"; chapter: Chapter }
  | { type: "add-chapter" }
  | { type: "research-header" }
  | { type: "research-item"; id: "character" | "world" | "scrap" | "analysis" }
  | { type: "snapshot-header" }
  | { type: "snapshot-list"; chapterId: string }
  | { type: "snapshot-empty-msg" }
  | { type: "trash-header" }
  | { type: "trash-list"; projectId: string; refreshKey: number }
  | { type: "trash-empty" };

function Sidebar({
  chapters,
  activeChapterId,
  currentProjectTitle,
  currentProjectId,
  onSelectChapter,
  onAddChapter,
  onRenameChapter,
  onDuplicateChapter,
  onDeleteChapter,
  onOpenSettings,
  onPrefetchSettings,
  onSelectResearchItem,
  onSplitView,
}: SidebarProps) {
  const { t } = useTranslation();
  const dialog = useDialog();
  const { updateProject } = useProjectStore();
  const { setSidebarOpen, setManuscriptMenuOpen } = useUIStore();
  // Section collapse states
  const [isManuscriptOpen, setManuscriptOpen] = useState(true);
  const [isResearchOpen, setResearchOpen] = useState(true);
  const [isSnapshotOpen, setSnapshotOpen] = useState(false);
  const [isTrashOpen, setTrashOpen] = useState(false);
  const [trashRefreshKey, setTrashRefreshKey] = useState(0);

  // Context Menu State
  const { menuOpenId, menuPosition, menuRef, closeMenu, toggleMenuByElement } =
    useFloatingMenu<HTMLElement>();
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  useEffect(() => {
    setManuscriptMenuOpen(Boolean(menuOpenId));
    return () => {
      setManuscriptMenuOpen(false);
    };
  }, [menuOpenId, setManuscriptMenuOpen]);

  useShortcutCommand((command) => {
    if (command.type === "sidebar.section.toggle") {
      setSidebarOpen(true);
      if (command.section === "manuscript") setManuscriptOpen((prev) => !prev);
      if (command.section === "research") setResearchOpen((prev) => !prev);
      if (command.section === "snapshot") setSnapshotOpen((prev) => !prev);
      if (command.section === "trash") setTrashOpen((prev) => !prev);
      return;
    }

    if (command.type === "sidebar.section.open") {
      setSidebarOpen(true);
      if (command.section === "manuscript") setManuscriptOpen(true);
      if (command.section === "research") setResearchOpen(true);
      if (command.section === "snapshot") setSnapshotOpen(true);
      if (command.section === "trash") setTrashOpen(true);
      return;
    }

    if (command.type === "sidebar.section.close") {
      if (command.section === "manuscript") setManuscriptOpen(false);
      if (command.section === "research") setResearchOpen(false);
      if (command.section === "snapshot") setSnapshotOpen(false);
      if (command.section === "trash") setTrashOpen(false);
    }
  });

  const handleMenuClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    toggleMenuByElement(id, e.currentTarget as HTMLElement);
  };

  const handleRenameProject = async () => {
    if (!currentProjectId) return;
    const nextTitle = (
      await dialog.prompt({
        title: t("sidebar.tooltip.renameProject"),
        message: t("sidebar.prompt.renameProject"),
        defaultValue: currentProjectTitle ?? "",
        placeholder: t("sidebar.prompt.renameProject"),
      })
    )?.trim();
    if (!nextTitle || nextTitle === currentProjectTitle) return;
    await updateProject(currentProjectId, nextTitle);
  };

  const handleAction = async (action: string, id: string) => {
    api.logger.info("Sidebar action", { action, id });
    closeMenu();
    if (action === "open_right" && onSplitView) {
      onSplitView("vertical", id);
    }
    if (action === "rename" && onRenameChapter) {
      const current = chapters.find((c) => c.id === id);
      const nextTitle = (
        await dialog.prompt({
          title: t("sidebar.menu.rename"),
          message: t("sidebar.prompt.renameTitle"),
          defaultValue: current?.title ?? "",
          placeholder: t("sidebar.prompt.renameTitle"),
        })
      )?.trim();
      if (nextTitle) {
        onRenameChapter(id, nextTitle);
      }
    }
    if (action === "duplicate" && onDuplicateChapter) {
      onDuplicateChapter(id);
    }
    if (action === "delete" && onDeleteChapter) {
      const confirmed = await dialog.confirm({
        title: t("sidebar.menu.delete"),
        message: t("sidebar.prompt.deleteConfirm"),
        isDestructive: true,
      });
      if (!confirmed) return;
      onDeleteChapter(id);
    }
  };

  const sidebarItems = useMemo<SidebarItem[]>(() => {
    const items: SidebarItem[] = [{ type: "manuscript-header" }];

    if (isManuscriptOpen) {
      chapters.forEach((chapter) => items.push({ type: "chapter", chapter }));
      items.push({ type: "add-chapter" });
    }

    items.push({ type: "research-header" });
    if (isResearchOpen) {
      items.push({ type: "research-item", id: "character" });
      items.push({ type: "research-item", id: "world" });
      items.push({ type: "research-item", id: "scrap" });
      items.push({ type: "research-item", id: "analysis" });
    }

    items.push({ type: "snapshot-header" });
    if (isSnapshotOpen) {
      if (activeChapterId) {
        items.push({ type: "snapshot-list", chapterId: activeChapterId });
      } else {
        items.push({ type: "snapshot-empty-msg" });
      }
    }

    items.push({ type: "trash-header" });
    if (isTrashOpen) {
      if (currentProjectId) {
        items.push({ type: "trash-list", projectId: currentProjectId, refreshKey: trashRefreshKey });
      } else {
        items.push({ type: "trash-empty" });
      }
    }

    return items;
  }, [
    chapters,
    isManuscriptOpen,
    isResearchOpen,
    isTrashOpen,
    currentProjectId,
    trashRefreshKey,
    activeChapterId,
    isSnapshotOpen,
  ]);

  return (
    <div className="h-full flex flex-col select-none" data-testid="sidebar">
      {menuOpenId && (
        <div
          className="fixed inset-0 z-9999 bg-transparent"
          onPointerDown={closeMenu}
        />
      )}
      {/* Context Menu Popup */}
      {menuOpenId && (
        <div
          ref={menuRef}
          className="fixed z-10000 bg-panel border border-border rounded-lg shadow-lg min-w-42.5 p-1.5 animate-in fade-in zoom-in-95 duration-100 flex flex-col"
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
                <div
                  key={chapter.id}
                  className={cn(
                    "flex items-center px-4 py-1.5 pl-9 cursor-pointer text-[13px] transition-all",
                    activeChapterId === chapter.id
                      ? "bg-active text-fg font-medium border-l-[3px] border-accent"
                      : "text-muted border-l-2 border-transparent hover:bg-surface-hover hover:text-fg",
                  )}
                  onClick={() => onSelectChapter(chapter.id)}
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
              );
            }

            if (item.type === "add-chapter") {
              return (
                <div
                  className="flex items-center px-4 py-1.5 pl-9 cursor-pointer text-[13px] text-muted border-l-2 border-transparent hover:bg-surface-hover hover:text-fg transition-all"
                  onClick={onAddChapter}
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
