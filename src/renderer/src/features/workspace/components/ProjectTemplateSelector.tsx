import { useState, useOptimistic, useActionState, useId, useEffect } from "react";
import { useTranslation } from "react-i18next";

import WindowBar from "@renderer/features/workspace/components/WindowBar";
import { Plus, Book, FileText, FileType, MoreVertical } from "lucide-react";
import type { Project, SyncStatus } from "@shared/types";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { ConfirmDialog, Modal } from "@shared/ui/Modal";
import { api } from "@shared/api";
import { useToast } from "@shared/ui/ToastContext";
import { useFloatingMenu } from "@shared/hooks/useFloatingMenu";
import {
  DEFAULT_PROJECT_FILENAME,
  LUIE_PACKAGE_EXTENSION_NO_DOT,
  LUIE_PACKAGE_FILTER_NAME,
  MARKDOWN_EXTENSION_NO_DOT,
  TEXT_EXTENSION_NO_DOT,
} from "@shared/constants";

interface ProjectTemplateSelectorProps {
  onSelectProject: (templateId: string, projectPath: string) => void;
  projects?: Project[];
  onOpenProject?: (project: Project) => void;
  onOpenLuieFile?: () => void;
  onOpenSnapshotBackup?: () => void;
}

export default function ProjectTemplateSelector({
  onSelectProject,
  projects = [],
  onOpenProject,
  onOpenLuieFile,
  onOpenSnapshotBackup,
}: ProjectTemplateSelectorProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [activeCategory, setActiveCategory] = useState("all");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    connected: false,
    autoSync: true,
    mode: "idle",
    inFlight: false,
    queued: false,
    conflicts: {
      chapters: 0,
      memos: 0,
      total: 0,
    },
  });

  const { deleteProject, updateProject, loadProjects } = useProjectStore();

  const [optimisticProjects, addOptimisticProject] = useOptimistic(
    projects,
    (
      state,
      action:
        | { type: "rename"; id: string; title: string }
        | { type: "delete"; id: string }
        | { type: "repair-path"; id: string; projectPath: string }
        | { type: "reset"; projects: Project[] },
    ) => {
      if (action.type === "rename") {
        return state.map((project) =>
          project.id === action.id ? { ...project, title: action.title } : project,
        );
      }
      if (action.type === "delete") {
        return state.filter((project) => project.id !== action.id);
      }
      if (action.type === "repair-path") {
        return state.map((project) =>
          project.id === action.id
            ? { ...project, projectPath: action.projectPath, pathMissing: false }
            : project,
        );
      }
      return action.projects;
    },
  );

  const { menuOpenId, menuPosition, menuRef, closeMenu, toggleMenuByElement } =
    useFloatingMenu<HTMLButtonElement>();

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
  }>({
    isOpen: false,
    projectId: "",
    projectTitle: "",
    mode: "delete",
  });

  const renameFormId = useId();
  const [renameState, renameAction, renamePending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      const projectId = String(formData.get("projectId") ?? "").trim();
      const nextTitle = String(formData.get("title") ?? "").trim();

      if (!projectId) {
        return { error: t("settings.projectTemplate.error.notFound") };
      }
      if (!nextTitle) {
        return { error: t("settings.projectTemplate.error.nameRequired") };
      }
      if (nextTitle === renameDialog.currentTitle) {
        setRenameDialog((prev) => ({ ...prev, isOpen: false }));
        return null;
      }

      addOptimisticProject({
        type: "rename",
        id: projectId,
        title: nextTitle,
      });

      try {
        await updateProject(projectId, nextTitle);
        setRenameDialog((prev) => ({ ...prev, isOpen: false }));
        return null;
      } catch (error) {
        addOptimisticProject({ type: "reset", projects });
        api.logger.error("Failed to update project", error);
        return { error: t("settings.projectTemplate.error.renameFailed") };
      }
    },
    null,
  );

  const categories = [
    { id: "all", label: t("settings.projectTemplate.category.all"), icon: <Book className="w-4 h-4" /> },
    { id: "novel", label: t("settings.projectTemplate.category.novel"), icon: <Book className="w-4 h-4" /> },
    { id: "script", label: t("settings.projectTemplate.category.script"), icon: <FileText className="w-4 h-4" /> },
    { id: "misc", label: t("settings.projectTemplate.category.general"), icon: <FileType className="w-4 h-4" /> },
  ];

  const templates = [
    {
      id: "blank",
      title: t("settings.projectTemplate.title.blank"),
      category: "all",
      type: "blank",
    },
    {
      id: "novel_basic",
      title: t("settings.projectTemplate.title.webNovel"),
      category: "novel",
      type: "novel",
    },
    {
      id: "script_basic",
      title: t("settings.projectTemplate.title.screenplay"),
      category: "script",
      type: "script",
    },
    {
      id: "essay",
      title: t("settings.projectTemplate.title.essay"),
      category: "misc",
      type: "doc",
    },
  ];

  const filteredTemplates =
    activeCategory === "all"
      ? templates
      : templates.filter(
        (t) => t.category === activeCategory || t.category === "all",
      );

  const toTimestamp = (value: unknown): number => {
    const parsed = Date.parse(String(value ?? ""));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const getProjectSyncBadge = (project: Project): "synced" | "pending" | "localOnly" | "syncError" => {
    if (!syncStatus.connected) {
      return syncStatus.mode === "error" ? "syncError" : "localOnly";
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
  };

  const handleRepairProjectPath = async (project: Project) => {
    try {
      const response = await api.fs.selectFile({
        title: t("settings.projectTemplate.dialog.repairPathTitle"),
        filters: [{ name: LUIE_PACKAGE_FILTER_NAME, extensions: [LUIE_PACKAGE_EXTENSION_NO_DOT] }],
      });
      if (!response.success || !response.data) {
        return;
      }

      const projectPath = response.data;
      addOptimisticProject({
        type: "repair-path",
        id: project.id,
        projectPath,
      });

      await updateProject(project.id, undefined, undefined, projectPath);
      await loadProjects();
      showToast(t("settings.projectTemplate.toast.pathRepaired"), "success");
    } catch (error) {
      addOptimisticProject({ type: "reset", projects });
      showToast(t("settings.projectTemplate.toast.pathRepairFailed"), "error");
      api.logger.error("Failed to repair project path", {
        projectId: project.id,
        error,
      });
    }
  };

  const handleSelectTemplate = async (templateId: string) => {
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
  };

  return (
    <div
      className="flex flex-col w-screen h-screen bg-app text-fg font-sans overflow-hidden"
      data-testid="template-selector"
    >
      <WindowBar />

      {menuOpenId && (
        <div
          className="fixed inset-0 z-dropdown bg-transparent"
          onPointerDown={closeMenu}
        />
      )}

      {/* Context Menu rendered at root level to avoid transform/z-index issues */}
      {menuOpenId &&
        (() => {
          const p = optimisticProjects.find((proj) => proj.id === menuOpenId);
          if (!p) return null;

          return (
            <div
              ref={menuRef}
              className="fixed z-dropdown min-w-35 bg-surface border border-border rounded-[10px] p-1.5 shadow-lg"
              style={{ top: menuPosition.y, left: menuPosition.x }}
              onClick={(e) => e.stopPropagation()}
            >
              {!p.pathMissing && (
                <div
                  className="px-2.5 py-2.5 rounded-lg text-[13px] text-fg cursor-pointer select-none hover:bg-active"
                  onClick={() => {
                    closeMenu();
                    onOpenProject?.(p);
                  }}
                >
                  {t("settings.projectTemplate.context.open")}
                </div>
              )}
              {p.pathMissing && (
                <div
                  className="px-2.5 py-2.5 rounded-lg text-[13px] text-fg cursor-pointer select-none hover:bg-active"
                  onClick={() => {
                    closeMenu();
                    void handleRepairProjectPath(p);
                  }}
                >
                  {t("settings.projectTemplate.context.repairPath")}
                </div>
              )}
              <div
                className="px-2.5 py-2.5 rounded-lg text-[13px] text-fg cursor-pointer select-none hover:bg-active"
                onClick={() => {
                  closeMenu();
                  setRenameDialog({
                    isOpen: true,
                    projectId: p.id,
                    currentTitle: p.title,
                  });
                }}
              >
                {t("settings.projectTemplate.context.rename")}
              </div>
              <div className="h-px bg-border my-1.5 mx-1" />
              <div
                className="px-2.5 py-2.5 rounded-lg text-[13px] text-danger-fg cursor-pointer select-none hover:bg-active"
                onClick={() => {
                  closeMenu();
                  setDeleteDialog({
                    isOpen: true,
                    projectId: p.id,
                    projectTitle: p.title,
                    mode: p.pathMissing ? "removeMissing" : "delete",
                  });
                }}
              >
                {p.pathMissing
                  ? t("settings.projectTemplate.context.removeMissing")
                  : t("settings.projectTemplate.context.delete")}
              </div>
            </div>
          );
        })()}

      {/* Custom Dialogs */}
      <Modal
        isOpen={renameDialog.isOpen}
        onClose={() => setRenameDialog((prev) => ({ ...prev, isOpen: false }))}
        title={t("settings.projectTemplate.dialog.renameTitle")}
        footer={
          <div className="flex justify-end gap-3 w-full">
            <button
              className="px-4 py-2 bg-transparent border border-border rounded-md text-muted text-[13px] cursor-pointer transition-all hover:bg-hover hover:text-fg"
              onClick={() => setRenameDialog((prev) => ({ ...prev, isOpen: false }))}
              disabled={renamePending}
            >
              {t("settings.projectTemplate.actions.cancel")}
            </button>
            <button
              className="px-4 py-2 bg-accent border-none rounded-md text-white text-[13px] font-medium cursor-pointer transition-all hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
              type="submit"
              form={renameFormId}
              disabled={renamePending}
            >
              {renamePending ? t("settings.projectTemplate.actions.saving") : t("settings.projectTemplate.actions.save")}
            </button>
          </div>
        }
      >
        <form id={renameFormId} action={renameAction} className="flex flex-col gap-3">
          {renameState?.error && (
            <div className="text-xs text-danger-fg">{renameState.error}</div>
          )}
          <input type="hidden" name="projectId" value={renameDialog.projectId} />
          <input
            key={`${renameDialog.isOpen}-${renameDialog.currentTitle}`}
            name="title"
            defaultValue={renameDialog.currentTitle}
            className="w-full p-2.5 bg-input border border-border rounded-md text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
            autoFocus
            disabled={renamePending}
          />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title={
          deleteDialog.mode === "removeMissing"
            ? t("settings.projectTemplate.dialog.removeMissingTitle")
            : t("settings.projectTemplate.dialog.deleteTitle")
        }
        message={
          deleteDialog.mode === "removeMissing"
            ? t("settings.projectTemplate.removeMissingConfirm", { title: deleteDialog.projectTitle })
            : t("settings.projectTemplate.deleteConfirm", { title: deleteDialog.projectTitle })
        }
        confirmLabel={
          deleteDialog.mode === "removeMissing"
            ? t("settings.projectTemplate.removeMissingConfirmLabel")
            : t("settings.projectTemplate.deleteConfirmLabel")
        }
        isDestructive
        onConfirm={async () => {
          addOptimisticProject({ type: "delete", id: deleteDialog.projectId });
          try {
            await deleteProject(deleteDialog.projectId);
          } catch (error) {
            addOptimisticProject({ type: "reset", projects });
            api.logger.error("Failed to delete project", error);
          }
          setDeleteDialog((prev) => ({ ...prev, isOpen: false, mode: "delete" }));
        }}
        onCancel={() => setDeleteDialog((prev) => ({ ...prev, isOpen: false, mode: "delete" }))}
      />

      <div className="flex-1 flex h-[calc(100vh-32px)]">
        <div className="w-60 bg-sidebar py-8 px-4 flex flex-col gap-2 border-r border-border">
          <div className="text-[11px] font-bold text-muted mb-4 pl-3 uppercase tracking-widest">{t("settings.projectTemplate.sidebarTitle")}</div>
          {categories.map((cat) => (
            <div
              key={cat.id}
              className={`
                px-4 py-3 rounded-lg text-sm transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)] flex items-center gap-2.5
                ${activeCategory === cat.id
                  ? "bg-accent text-accent-fg font-semibold shadow-md"
                  : "text-muted hover:bg-active hover:text-fg cursor-pointer"}
              `}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.icon}
              {cat.label}
            </div>
          ))}
        </div>

        <div className="flex-1 p-12 overflow-y-auto bg-app min-w-0">
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-bold tracking-[0.5px] text-subtle uppercase">{t("settings.projectTemplate.recentTitle")}</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs rounded-md bg-surface border border-border text-fg hover:bg-surface-hover"
                  onClick={() => onOpenLuieFile?.()}
                >
                  {t("settings.projectTemplate.actions.openLuie")}
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs rounded-md bg-surface border border-border text-fg hover:bg-surface-hover"
                  onClick={() => onOpenSnapshotBackup?.()}
                >
                  {t("settings.projectTemplate.actions.restoreSnapshot")}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
              {optimisticProjects.slice(0, 4).map((p) => {
                const syncBadge = getProjectSyncBadge(p);
                return (
                  <div
                    key={p.id}
                    className="bg-surface border border-border rounded-lg p-5 w-full text-left cursor-pointer transition-all duration-200 relative flex justify-between items-start hover:bg-surface-hover hover:border-border-active hover:-translate-y-0.5 hover:shadow-md group"
                    onClick={() => {
                      if (p.pathMissing) {
                        showToast(t("settings.projectTemplate.toast.pathMissingBlocked"), "info");
                        return;
                      }
                      onOpenProject?.(p);
                    }}
                  >
                    <div className="flex-1 overflow-hidden">
                      <div className="mb-1 flex items-center gap-2">
                        <div className="text-[15px] font-semibold text-fg truncate">{p.title}</div>
                        <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${syncBadge === "synced"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : syncBadge === "pending"
                            ? "bg-amber-500/15 text-amber-300"
                            : syncBadge === "syncError"
                              ? "bg-red-500/15 text-red-300"
                              : "bg-zinc-500/15 text-zinc-300"
                          }`}>
                          {t(`settings.projectTemplate.sync.${syncBadge}`)}
                        </span>
                        {p.pathMissing && (
                          <span className="inline-flex shrink-0 items-center rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-medium text-red-300">
                            {t("settings.projectTemplate.pathMissingBadge")}
                          </span>
                        )}
                      </div>
                      <div
                        className="text-xs text-muted whitespace-nowrap overflow-hidden text-ellipsis"
                        title={p.projectPath ?? ""}
                      >
                        {p.pathMissing
                          ? t("settings.projectTemplate.pathMissingDescription")
                          : p.projectPath ?? t("settings.projectTemplate.emptyPath")}
                      </div>
                    </div>

                    <button
                      className="opacity-85 p-1 rounded text-subtle border-none bg-transparent cursor-pointer absolute top-2.5 right-2.5 z-10 transition-all hover:opacity-100 hover:bg-active hover:text-fg group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        toggleMenuByElement(p.id, e.currentTarget);
                        api.logger.info("Project context menu", {
                          id: p.id,
                        });
                      }}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 relative z-0">
            <div className="max-w-350 mx-auto">
              <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-x-6 gap-y-10">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="group flex flex-col gap-3 cursor-pointer"
                    onClick={() => handleSelectTemplate(template.id)}
                  >
                    {/* Card Container */}
                    <div className="
                    relative aspect-3/4 w-full
                    bg-surface/40 
                    border border-white/5 
                    rounded-md 
                    overflow-hidden 
                    transition-all duration-300 
                    shadow-sm
                    group-hover:-translate-y-1.5 
                    group-hover:shadow-2xl 
                    group-hover:border-white/10
                    group-hover:bg-surface
                  ">

                      {/* === BLANK TEMPLATE === */}
                      {template.type === "blank" && (
                        <div className="w-full h-full flex flex-col items-center justify-center p-6">
                          <div className="w-full h-full border-2 dashed border-white/10 rounded-sm flex flex-col items-center justify-center gap-3 group-hover:border-accent/40 transition-colors">
                            <Plus className="w-8 h-8 text-neutral-500 group-hover:text-accent transition-colors" />
                          </div>
                        </div>
                      )}

                      {/* === NOVEL TEMPLATE (Serif, Book-like) === */}
                      {template.type === "novel" && (
                        <div className="w-full h-full bg-zinc-900 p-5 flex flex-col">
                          <div className="h-full bg-white/5 mx-auto w-full flex flex-col p-3 shadow-inner">
                            <div className="text-[8px] tracking-[2px] text-zinc-500 text-center uppercase mb-3 font-serif">{t("settings.projectTemplate.preview.standardFormat")}</div>
                            <div className="font-serif text-lg text-zinc-200 text-center font-bold pb-2 border-b border-white/10 mb-4">
                              {t("settings.projectTemplate.preview.chapterOne")}
                            </div>
                            <div className="space-y-1.5 opacity-40">
                              <div className="h-1 w-full bg-zinc-600 rounded-full" />
                              <div className="h-1 w-11/12 bg-zinc-600 rounded-full" />
                              <div className="h-1 w-full bg-zinc-600 rounded-full" />
                              <div className="h-1 w-4/5 bg-zinc-600 rounded-full" />
                            </div>
                            <div className="mt-auto flex justify-center text-zinc-600 text-2xl font-serif">❦</div>
                          </div>
                        </div>
                      )}

                      {/* === SCRIPT TEMPLATE (Mono, Screenplay) === */}
                      {template.type === "script" && (
                        <div className="w-full h-full bg-[#18181b] p-5 font-mono text-[9px] text-zinc-400 flex flex-col items-start leading-relaxed border-l-[6px] border-[#27272a] group-hover:border-accent transition-colors">
                          <div className="flex w-full justify-between opacity-50 mb-4 tracking-widest uppercase">
                            <span>{t("settings.projectTemplate.preview.script.int")}</span>
                            <span>{t("settings.projectTemplate.preview.script.day")}</span>
                          </div>

                          <div className="w-full text-center text-zinc-300 font-bold mb-1 tracking-wider uppercase">{t("settings.projectTemplate.preview.script.character")}</div>
                          <div className="w-full text-center mb-3">
                            {t("settings.projectTemplate.preview.script.direction")}<br />
                            {t("settings.projectTemplate.preview.script.dialogue")}
                          </div>

                          <div className="w-full text-center text-zinc-300 font-bold mb-1 tracking-wider uppercase">{t("settings.projectTemplate.preview.script.another")}</div>
                          <div className="w-full text-center">
                            {t("settings.projectTemplate.preview.script.anotherLine")}
                          </div>
                        </div>
                      )}

                      {/* === DOC TEMPLATE (Academic/General) === */}
                      {template.type === "doc" && (
                        <div className="w-full h-full bg-surface p-5 flex flex-col items-center">
                          <div className="text-center w-full pb-4 border-b border-white/5 mb-4">
                            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
                              <FileType className="w-5 h-5 text-blue-400" />
                            </div>
                            <div className="h-2 w-16 bg-zinc-700 mx-auto rounded-sm" />
                          </div>
                          <div className="w-full space-y-2 opacity-30">
                            <div className="flex gap-2">
                              <div className="h-1.5 w-1/3 bg-zinc-500" />
                              <div className="h-1.5 w-2/3 bg-zinc-600" />
                            </div>
                            <div className="h-1.5 w-full bg-zinc-600" />
                            <div className="h-1.5 w-4/5 bg-zinc-600" />
                            <div className="h-1.5 w-full bg-zinc-600" />
                          </div>
                        </div>
                      )}

                      {/* Overlay Highlight for unified feel */}
                      <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                    </div>

                    {/* Label */}
                    <div className="text-center group-hover:transform group-hover:-translate-y-0.5 transition-transform duration-300">
                      <span className="font-medium text-[13px] text-zinc-400 group-hover:text-white transition-colors tracking-wide">
                        {template.title}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
