import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { useChapterManagement } from "@renderer/features/manuscript/hooks/useChapterManagement";
import { useFloatingMenu } from "@shared/hooks/useFloatingMenu";
import { useDialog } from "@shared/ui/DialogProvider";
import { useShortcutCommand } from "@renderer/features/workspace/hooks/useShortcutCommand";
import { api } from "@shared/api";

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
    | { type: "research-item"; id: "character" | "world" | "scrap" | "analysis" }
    | { type: "snapshot-header" }
    | { type: "snapshot-list"; chapterId: string }
    | { type: "snapshot-empty-msg" }
    | { type: "trash-header" }
    | { type: "trash-list"; projectId: string; refreshKey: number }
    | { type: "trash-empty" };

export function useSidebarLogic({
    currentProjectTitle,
    currentProjectId,
    onSplitView,
}: {
    currentProjectTitle?: string;
    currentProjectId?: string;
    onSplitView?: (type: "vertical" | "horizontal", contentId: string) => void;
}) {
    const { t } = useTranslation();
    const dialog = useDialog();
    const { updateProject } = useProjectStore();
    const { setSidebarOpen, setManuscriptMenuOpen } = useUIStore();

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

    const { menuOpenId, menuPosition, menuRef, closeMenu, toggleMenuByElement } = useFloatingMenu<HTMLElement>();
    const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

    useEffect(() => {
        setManuscriptMenuOpen(Boolean(menuOpenId));
        return () => {
            setManuscriptMenuOpen(false);
        };
    }, [menuOpenId, setManuscriptMenuOpen]);

    useShortcutCommand((command: any) => {
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
        if (action === "rename") {
            const current = chapters.find((c: Chapter) => c.id === id);
            const nextTitle = (
                await dialog.prompt({
                    title: t("sidebar.menu.rename"),
                    message: t("sidebar.prompt.renameTitle"),
                    defaultValue: current?.title ?? "",
                    placeholder: t("sidebar.prompt.renameTitle"),
                })
            )?.trim();
            if (nextTitle) {
                void handleRenameChapter(id, nextTitle);
            }
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
            chapters.forEach((chapter: Chapter) => items.push({ type: "chapter", chapter }));
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

    return {
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
        trashRefreshKey,
        setTrashRefreshKey,
        handleMenuClick,
        handleRenameProject,
        handleAction,
        closeMenu,
        activeChapterId,
        handleSelectChapter,
        handleAddChapter,
    };
}
