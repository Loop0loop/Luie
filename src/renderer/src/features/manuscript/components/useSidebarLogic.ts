import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { useShallow } from "zustand/react/shallow";
import { useChapterManagement } from "@renderer/features/manuscript/hooks/useChapterManagement";
import { useFloatingMenu } from "@renderer/shared/hooks/useFloatingMenu";
import { useDialog } from "@shared/ui/useDialog";
import { useShortcutCommand } from "@renderer/features/workspace/hooks/useShortcutCommand";
import type { ShortcutCommand } from "@renderer/features/workspace/hooks/useShortcutCommand";
import { api } from "@shared/api";
import type { ResearchTab } from "@renderer/features/workspace/stores/uiStore";

export interface Chapter {
  id: string;
  title: string;
  order: number;
}

export type SidebarItem =
  | { type: "manuscript-header" }
  | { type: "chapter"; chapter: Chapter }
  | { type: "add-chapter" }
  | { type: "research-header" }
  | {
      type: "research-item";
      id: ResearchTab;
    }
  | { type: "snapshot-header" }
  | { type: "snapshot-list"; chapterId: string }
  | { type: "snapshot-empty-msg" }
  | { type: "trash-header" }
  | { type: "trash-list"; projectId: string; refreshKey: number }
  | { type: "trash-empty" };

export function useSidebarLogic({
  onSplitView,
}: {
  onSplitView?: (type: "vertical" | "horizontal", contentId: string) => void;
}) {
  const { t } = useTranslation();
  const dialog = useDialog();
  const updateProject = useProjectStore((state) => state.updateProject);
  const currentProject = useProjectStore((state) => state.currentProject);
  const { setRegionOpen, setManuscriptMenuOpen } = useUIStore(
    useShallow((state) => ({
      setRegionOpen: state.setRegionOpen,
      setManuscriptMenuOpen: state.setManuscriptMenuOpen,
    })),
  );

  const currentProjectId = currentProject?.id;
  const currentProjectTitle = currentProject?.title;

  const chapterManagement = useChapterManagement();
  const {
    chapters,
    activeChapterId,
    handleSelectChapter,
    handleAddChapter,
    handleRenameChapter,
    handleDuplicateChapter,
    handleDeleteChapter,
  } = chapterManagement;

  const [isManuscriptOpen, setManuscriptOpen] = useState(true);
  const [isResearchOpen, setResearchOpen] = useState(true);
  const [isSnapshotOpen, setSnapshotOpen] = useState(false);
  const [isTrashOpen, setTrashOpen] = useState(false);
  const [trashRefreshKey, setTrashRefreshKey] = useState(0);

  const { menuOpenId, menuPosition, menuRef, closeMenu, toggleMenuByElement } =
    useFloatingMenu<HTMLElement>();

  useEffect(() => {
    setManuscriptMenuOpen(Boolean(menuOpenId));
    return () => {
      setManuscriptMenuOpen(false);
    };
  }, [menuOpenId, setManuscriptMenuOpen]);

  useShortcutCommand((command: ShortcutCommand) => {
    if (command.type === "sidebar.section.toggle") {
      setRegionOpen("leftSidebar", true);
      if (command.section === "manuscript") setManuscriptOpen((prev) => !prev);
      if (command.section === "research") setResearchOpen((prev) => !prev);
      if (command.section === "snapshot") setSnapshotOpen((prev) => !prev);
      if (command.section === "trash") setTrashOpen((prev) => !prev);
      return;
    }

    if (command.type === "sidebar.section.open") {
      setRegionOpen("leftSidebar", true);
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

  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [isEditingProject, setIsEditingProject] = useState(false);

  const startRenameChapter = (id: string) => {
    setEditingChapterId(id);
    closeMenu();
  };

  const commitRenameChapter = (id: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (trimmed) {
      void handleRenameChapter(id, trimmed);
    }
    setEditingChapterId(null);
  };

  const cancelRenameChapter = () => {
    setEditingChapterId(null);
  };

  const startRenameProject = () => {
    if (!currentProjectId) return;
    setIsEditingProject(true);
  };

  const commitRenameProject = async (newTitle: string) => {
    const trimmed = newTitle.trim();
    if (currentProjectId && trimmed && trimmed !== currentProjectTitle) {
      await updateProject(currentProjectId, trimmed);
    }
    setIsEditingProject(false);
  };

  const cancelRenameProject = () => {
    setIsEditingProject(false);
  };

  const handleRenameProject = async () => {
    startRenameProject();
  };

  const handleAction = async (action: string, id: string) => {
    api.logger.info("Sidebar action", { action, id });
    closeMenu();
    if (action === "open_right" && onSplitView) {
      onSplitView("vertical", id);
    }
    if (action === "rename") {
      startRenameChapter(id);
    }
    if (action === "duplicate") {
      void handleDuplicateChapter(id);
    }
    if (action === "delete") {
      const confirmed = await dialog.confirm({
        title: t("sidebar.menu.delete"),
        message: t("sidebar.prompt.deleteConfirm"),
        isDestructive: true,
      });
      if (!confirmed) return;
      void handleDeleteChapter(id);
    }
  };

  const sidebarItems = useMemo<SidebarItem[]>(() => {
    const items: SidebarItem[] = [{ type: "manuscript-header" }];

    if (isManuscriptOpen) {
      chapters.forEach((chapter: Chapter) =>
        items.push({ type: "chapter", chapter }),
      );
      items.push({ type: "add-chapter" });
    }

    items.push({ type: "research-header" });
    if (isResearchOpen) {
      items.push({ type: "research-item", id: "character" });
      items.push({ type: "research-item", id: "event" });
      items.push({ type: "research-item", id: "faction" });
      items.push({ type: "research-item", id: "scrap" });
      items.push({ type: "research-item", id: "plotboard" });
      items.push({ type: "research-item", id: "untitled" });
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
        items.push({
          type: "trash-list",
          projectId: currentProjectId,
          refreshKey: trashRefreshKey,
        });
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

  return {
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
    trashRefreshKey,
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
    editingChapterId,
    startRenameChapter,
    commitRenameChapter,
    cancelRenameChapter,
    isEditingProject,
    startRenameProject,
    commitRenameProject,
    cancelRenameProject,
  };
}
