import { useState, useId, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@shared/api";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useFloatingMenu } from "@renderer/shared/hooks/useFloatingMenu";
import { useToast } from "@shared/ui/ToastContext";
import type { Project, SyncStatus } from "@shared/types";
import {
    DEFAULT_PROJECT_FILENAME,
    LUIE_PACKAGE_EXTENSION_NO_DOT,
    LUIE_PACKAGE_FILTER_NAME,
    MARKDOWN_EXTENSION_NO_DOT,
    TEXT_EXTENSION_NO_DOT,
} from "@shared/constants";

export interface ProjectSelectorState {
    activeCategory: string;
    setActiveCategory: (cat: string) => void;
    syncStatus: SyncStatus;
    setSyncStatus: React.Dispatch<React.SetStateAction<SyncStatus>>;
    localProjects: Project[];
    setLocalProjects: React.Dispatch<React.SetStateAction<Project[]>>;
    menuOpenId: string | null;
    menuPosition: { x: number; y: number };
    menuRef: React.RefObject<HTMLElement | null>;
    closeMenu: () => void;
    toggleMenuByElement: (id: string, element: HTMLElement) => void;
    renameDialog: { isOpen: boolean; projectId: string; currentTitle: string };
    setRenameDialog: React.Dispatch<React.SetStateAction<{ isOpen: boolean; projectId: string; currentTitle: string }>>;
    deleteDialog: { isOpen: boolean; projectId: string; projectTitle: string; mode: "delete" | "removeMissing"; deleteFile: boolean };
    setDeleteDialog: React.Dispatch<React.SetStateAction<{ isOpen: boolean; projectId: string; projectTitle: string; mode: "delete" | "removeMissing"; deleteFile: boolean }>>;
    renameError: string | null;
    isRenaming: boolean;
    renameFormId: string;
}

export interface ProjectSelectorActions {
    handleRename: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
    handleDeleteOrRemove: () => Promise<void>;
    handleRepairProjectPath: (project: Project) => Promise<void>;
    handleSelectTemplate: (templateId: string, onSelectProject: (templateId: string, projectPath: string) => void) => Promise<void>;
    getProjectSyncBadge: (project: Project) => "synced" | "pending" | "localOnly" | "syncError";
}

export function useProjectSelector(projects: Project[]): ProjectSelectorState & ProjectSelectorActions {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const [activeCategory, setActiveCategory] = useState("all");
    const [syncStatus, setSyncStatus] = useState<SyncStatus>({
        connected: false,
        autoSync: true,
        mode: "idle",
        health: "disconnected",
        inFlight: false,
        queued: false,
        conflicts: {
            chapters: 0,
            memos: 0,
            total: 0,
        },
    });

    const deleteProjectWithOptions = useProjectStore((state) => state.deleteProjectWithOptions);
    const updateProject = useProjectStore((state) => state.updateProject);
    const loadProjects = useProjectStore((state) => state.loadProjects);
    const [localProjects, setLocalProjects] = useState<Project[]>(projects);

    useEffect(() => {
        setLocalProjects(projects);
    }, [projects]);

    const { menuOpenId, menuPosition, menuRef, closeMenu, toggleMenuByElement } =
        useFloatingMenu<HTMLElement>();

    useEffect(() => {
        let active = true;
        void api.sync.getStatus().then((response) => {
            if (!active || !response.success || !response.data) return;
            setSyncStatus(response.data);
        });
        const unsubscribe = api.sync.onStatusChanged((status) => {
            if (!active) return;
            setSyncStatus(status);
        });
        return () => {
            active = false;
            unsubscribe();
        };
    }, []);

    // Dialog States
    const [renameDialog, setRenameDialog] = useState<{
        isOpen: boolean;
        projectId: string;
        currentTitle: string;
    }>({
        isOpen: false,
        projectId: "",
        currentTitle: "",
    });

    const [deleteDialog, setDeleteDialog] = useState<{
        isOpen: boolean;
        projectId: string;
        projectTitle: string;
        mode: "delete" | "removeMissing";
        deleteFile: boolean;
    }>({
        isOpen: false,
        projectId: "",
        projectTitle: "",
        mode: "delete",
        deleteFile: false,
    });

    const [renameError, setRenameError] = useState<string | null>(null);
    const [isRenaming, setIsRenaming] = useState(false);
    const renameFormId = useId();

    const handleRename = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const projectId = String(formData.get("projectId") ?? "").trim();
        const nextTitle = String(formData.get("title") ?? "").trim();

        if (!projectId) {
            setRenameError(t("settings.projectTemplate.error.notFound"));
            return;
        }
        if (!nextTitle) {
            setRenameError(t("settings.projectTemplate.error.nameRequired"));
            return;
        }
        if (nextTitle === renameDialog.currentTitle) {
            setRenameDialog((prev) => ({ ...prev, isOpen: false }));
            return;
        }

        setRenameError(null);
        setIsRenaming(true);

        // Optimistic UI update
        setLocalProjects((prev) =>
            prev.map((p) => (p.id === projectId ? { ...p, title: nextTitle } : p)),
        );

        try {
            await updateProject(projectId, nextTitle);
            setRenameDialog((prev) => ({ ...prev, isOpen: false }));
        } catch (error) {
            // Revert on failure
            setLocalProjects(projects);
            api.logger.error("Failed to update project", error);
            setRenameError(t("settings.projectTemplate.error.renameFailed"));
        } finally {
            setIsRenaming(false);
        }
    }, [projects, renameDialog.currentTitle, t, updateProject]);

    const toTimestamp = (value: unknown): number => {
        const parsed = Date.parse(String(value ?? ""));
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const getProjectSyncBadge = useCallback((project: Project): "synced" | "pending" | "localOnly" | "syncError" => {
        const projectState = syncStatus.projectStateById?.[project.id];
        if (projectState?.state === "error") {
            return "syncError";
        }
        if (projectState?.state === "pending") {
            return "pending";
        }
        if (projectState?.state === "synced") {
            return "synced";
        }

        if (syncStatus.health === "degraded") {
            return "syncError";
        }

        if (syncStatus.health === "disconnected" || !syncStatus.connected) {
            return "localOnly";
        }

        const lastSyncedAt = toTimestamp(syncStatus.projectLastSyncedAtByProjectId?.[project.id]);
        if (!lastSyncedAt) {
            return "pending";
        }

        const updatedAt = toTimestamp(project.updatedAt);
        if (!updatedAt) {
            return "pending";
        }

        return updatedAt <= lastSyncedAt ? "synced" : "pending";
    }, [syncStatus]);

    const handleRepairProjectPath = useCallback(async (project: Project) => {
        try {
            const response = await api.fs.selectFile({
                title: t("settings.projectTemplate.dialog.repairPathTitle"),
                filters: [{ name: LUIE_PACKAGE_FILTER_NAME, extensions: [LUIE_PACKAGE_EXTENSION_NO_DOT] }],
            });
            if (!response.success || !response.data) {
                return;
            }

            const projectPath = response.data;
            const approved = await api.fs.approveProjectPath(projectPath);
            if (!approved.success || !approved.data?.normalizedPath) {
                throw new Error("Failed to approve repaired project path");
            }
            const normalizedPath = approved.data.normalizedPath;
            setLocalProjects((prev) =>
                prev.map((p) =>
                    p.id === project.id
                        ? { ...p, projectPath: normalizedPath, pathMissing: false }
                        : p,
                ),
            );

            await updateProject(project.id, undefined, undefined, normalizedPath);
            await loadProjects();
            showToast(t("settings.projectTemplate.toast.pathRepaired"), "success");
        } catch (error) {
            setLocalProjects(projects);
            showToast(t("settings.projectTemplate.toast.pathRepairFailed"), "error");
            api.logger.error("Failed to repair project path", {
                projectId: project.id,
                error,
            });
        }
    }, [loadProjects, projects, showToast, t, updateProject]);

    const handleDeleteOrRemove = useCallback(async () => {
        setLocalProjects((prev) => prev.filter((p) => p.id !== deleteDialog.projectId));
        try {
            if (deleteDialog.mode === "removeMissing") {
                const response = await api.project.removeLocal(deleteDialog.projectId);
                if (!response.success) {
                    throw new Error(response.error?.message ?? "Failed to remove local project");
                }
                await loadProjects();
            } else {
                await deleteProjectWithOptions({
                    id: deleteDialog.projectId,
                    deleteFile: deleteDialog.deleteFile,
                });
            }
        } catch (error) {
            setLocalProjects(projects);
            api.logger.error(
                deleteDialog.mode === "removeMissing"
                    ? "Failed to remove missing-path project from list"
                    : "Failed to delete project",
                error,
            );
        }
        setDeleteDialog((prev) => ({
            ...prev,
            isOpen: false,
            mode: "delete",
            deleteFile: false,
        }));
    }, [deleteDialog.deleteFile, deleteDialog.mode, deleteDialog.projectId, deleteProjectWithOptions, loadProjects, projects]);

    const handleSelectTemplate = useCallback(async (
        templateId: string,
        onSelectProject: (templateId: string, projectPath: string) => void
    ) => {
        try {
            const response = await api.fs.selectSaveLocation({
                title: t("settings.projectTemplate.dialog.selectPath"),
                defaultPath: DEFAULT_PROJECT_FILENAME,
                filters: [
                    { name: LUIE_PACKAGE_FILTER_NAME, extensions: [LUIE_PACKAGE_EXTENSION_NO_DOT] },
                    { name: t("settings.projectTemplate.filter.markdown"), extensions: [MARKDOWN_EXTENSION_NO_DOT] },
                    { name: t("settings.projectTemplate.filter.text"), extensions: [TEXT_EXTENSION_NO_DOT] },
                ],
            });
            if (response.success && response.data) {
                onSelectProject(templateId, response.data);
            }
        } catch (error) {
            api.logger.error("Failed to select directory", error);
        }
    }, [t]);

    return {
        activeCategory,
        setActiveCategory,
        syncStatus,
        setSyncStatus,
        localProjects,
        setLocalProjects,
        menuOpenId,
        menuPosition,
        menuRef,
        closeMenu,
        toggleMenuByElement,
        renameDialog,
        setRenameDialog,
        deleteDialog,
        setDeleteDialog,
        renameError,
        isRenaming,
        renameFormId,
        handleRename,
        handleRepairProjectPath,
        handleSelectTemplate,
        handleDeleteOrRemove,
        getProjectSyncBadge,
    };
}
