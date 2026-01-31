import { useEffect, useRef, useState } from "react";
import { cn, cva, type VariantProps } from "../../../../shared/types/utils";
import WindowBar from "./WindowBar";
import { Plus, Book, FileText, FileType, MoreVertical } from "lucide-react";
import type { Project } from "../../../../shared/types";
import { useProjectStore } from "../../stores/projectStore";
import { ConfirmDialog, PromptDialog } from "../common/Modal";
import {
  DEFAULT_PROJECT_FILENAME,
  LUIE_PACKAGE_EXTENSION_NO_DOT,
  LUIE_PACKAGE_FILTER_NAME,
  MARKDOWN_EXTENSION_NO_DOT,
  TEXT_EXTENSION_NO_DOT,
  TEMPLATE_NEW_PROJECT_LABEL,
  TEMPLATE_SIDEBAR_TITLE,
  DIALOG_TITLE_DELETE_PROJECT,
  DIALOG_TITLE_RENAME_PROJECT,
  PROJECT_TEMPLATE_CATEGORY_ALL,
  PROJECT_TEMPLATE_CATEGORY_GENERAL,
  PROJECT_TEMPLATE_CATEGORY_NOVEL,
  PROJECT_TEMPLATE_CATEGORY_SCRIPT,
  PROJECT_TEMPLATE_TITLE_BLANK,
  PROJECT_TEMPLATE_TITLE_WEB_NOVEL,
  PROJECT_TEMPLATE_TITLE_SCREENPLAY,
  PROJECT_TEMPLATE_TITLE_ESSAY,
  PROJECT_TEMPLATE_DIALOG_SELECT_PATH,
  PROJECT_TEMPLATE_FILTER_MARKDOWN,
  PROJECT_TEMPLATE_FILTER_TEXT,
  PROJECT_TEMPLATE_CONTEXT_OPEN,
  PROJECT_TEMPLATE_CONTEXT_RENAME,
  PROJECT_TEMPLATE_CONTEXT_DELETE,
  PROJECT_TEMPLATE_DELETE_CONFIRM,
  PROJECT_TEMPLATE_DELETE_CONFIRM_LABEL,
  PROJECT_TEMPLATE_RECENT_TITLE,
  PROJECT_TEMPLATE_EMPTY_PATH,
  PROJECT_TEMPLATE_COVER_STANDARD,
  PROJECT_TEMPLATE_COVER_NOVEL,
  PROJECT_TEMPLATE_COVER_SCREEN,
  PROJECT_TEMPLATE_COVER_PLAY,
  PROJECT_TEMPLATE_COVER_INTRO,
  PROJECT_TEMPLATE_COVER_ESSAY,
} from "../../../../shared/constants";

interface ProjectTemplateSelectorProps {
  onSelectProject: (templateId: string, projectPath: string) => void;
  projects?: Project[];
  onOpenProject?: (project: Project) => void;
}

export default function ProjectTemplateSelector({
  onSelectProject,
  projects = [],
  onOpenProject,
}: ProjectTemplateSelectorProps) {
  const [activeCategory, setActiveCategory] = useState("all");

  const { deleteProject, updateProject } = useProjectStore();

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

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
  }>({
    isOpen: false,
    projectId: "",
    projectTitle: "",
  });

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!menuOpenId) return;

      const target = event.target as Node;
      const clickedMenu = !!menuRef.current?.contains(target);
      const clickedButton = !!menuButtonRef.current?.contains(target);

      if (!clickedMenu && !clickedButton) {
        setMenuOpenId(null);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [menuOpenId]);

  const categories = [
    { id: "all", label: PROJECT_TEMPLATE_CATEGORY_ALL, icon: <Book className="w-4 h-4" /> },
    { id: "novel", label: PROJECT_TEMPLATE_CATEGORY_NOVEL, icon: <Book className="w-4 h-4" /> },
    { id: "script", label: PROJECT_TEMPLATE_CATEGORY_SCRIPT, icon: <FileText className="w-4 h-4" /> },
    { id: "misc", label: PROJECT_TEMPLATE_CATEGORY_GENERAL, icon: <FileType className="w-4 h-4" /> },
  ];

  const templates = [
    {
      id: "blank",
      title: PROJECT_TEMPLATE_TITLE_BLANK,
      category: "all",
      type: "blank",
    },
    {
      id: "novel_basic",
      title: PROJECT_TEMPLATE_TITLE_WEB_NOVEL,
      category: "novel",
      type: "novel",
    },
    {
      id: "script_basic",
      title: PROJECT_TEMPLATE_TITLE_SCREENPLAY,
      category: "script",
      type: "script",
    },
    {
      id: "essay",
      title: PROJECT_TEMPLATE_TITLE_ESSAY,
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

  const handleSelectTemplate = async (templateId: string) => {
    try {
      const response = await window.api.fs.selectSaveLocation({
        title: PROJECT_TEMPLATE_DIALOG_SELECT_PATH,
        defaultPath: DEFAULT_PROJECT_FILENAME,
        filters: [
          { name: LUIE_PACKAGE_FILTER_NAME, extensions: [LUIE_PACKAGE_EXTENSION_NO_DOT] },
          { name: PROJECT_TEMPLATE_FILTER_MARKDOWN, extensions: [MARKDOWN_EXTENSION_NO_DOT] },
          { name: PROJECT_TEMPLATE_FILTER_TEXT, extensions: [TEXT_EXTENSION_NO_DOT] },
        ],
      });
      if (response.success && response.data) {
        onSelectProject(templateId, response.data);
      }
    } catch (error) {
      window.api.logger.error("Failed to select directory", error);
    }
  };

  const menuItem = cva(
    "px-3 py-2 rounded cursor-pointer transition-colors",
    {
      variants: {
        tone: {
          default: "text-fg hover:bg-active hover:text-fg",
          danger:
            "text-danger hover:bg-danger/10 hover:text-danger dark:hover:bg-danger/20",
        },
        size: {
          sm: "text-micro",
          md: "text-label",
        },
      },
      defaultVariants: {
        tone: "default",
        size: "md",
      },
    },
  );



  const shellClass = cn(
    "flex h-screen w-screen overflow-hidden bg-canvas text-fg",
    "selection:bg-active selection:text-white",
  );
  const sidebarItemClass = cn(
      "flex items-center gap-3 px-3 py-2 text-label font-medium text-muted",
      "rounded-md cursor-pointer transition-all hover:bg-hover hover:text-fg",
      "data-[active=true]:bg-hover data-[active=true]:text-fg data-[active=true]:font-semibold",
    );
  const recentCardClass = cn(
    "group relative bg-surface border border-border/40 rounded-lg p-4 cursor-pointer",
    "transition-all hover:border-active hover:shadow-sm",
  );
  const templateCardBase = cn(
    "aspect-3/4 relative rounded-lg border border-border/40 bg-surface",
    "shadow-sm overflow-hidden transition-all",
    "group-hover:-translate-y-1 group-hover:shadow-md group-hover:border-active/50",
  );
  const templateTitleClass = cn(
    "text-sm font-medium text-center text-fg",
    "group-hover:text-active transition-colors",
  );

  return (
    <div className={shellClass}>
      <WindowBar />

      {menuOpenId && (
        <div
          className="fixed inset-0 z-[999]"
          onPointerDown={() => setMenuOpenId(null)}
        />
      )}

      {/* Context Menu rendered at root level to avoid transform/z-index issues */}
      {menuOpenId &&
        (() => {
          const p = projects.find((proj) => proj.id === menuOpenId);
          if (!p) return null;
          return (
            <div
              ref={menuRef}
              className={cn(
                "fixed z-[1000] min-w-[180px] bg-surface rounded-lg",
                "border border-border/40 shadow-lg p-1.5",
                "animate-in fade-in zoom-in-95 duration-100",
                "flex flex-col gap-0.5",
              )}
              style={{ top: menuPosition.y, left: menuPosition.x }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={menuItem()}
                onClick={() => {
                  setMenuOpenId(null);
                  onOpenProject?.(p);
                }}
              >
                {PROJECT_TEMPLATE_CONTEXT_OPEN}
              </div>
              <div
                className={menuItem()}
                onClick={() => {
                  setMenuOpenId(null);
                  setRenameDialog({
                    isOpen: true,
                    projectId: p.id,
                    currentTitle: p.title,
                  });
                }}
              >
                {PROJECT_TEMPLATE_CONTEXT_RENAME}
              </div>
              <div className="h-px bg-border my-1 mx-1" />
              <div
                className={menuItem({ tone: "danger" })}
                onClick={() => {
                  setMenuOpenId(null);
                  setDeleteDialog({
                    isOpen: true,
                    projectId: p.id,
                    projectTitle: p.title,
                  });
                }}
              >
                {PROJECT_TEMPLATE_CONTEXT_DELETE}
              </div>
            </div>
          );
        })()}

      {/* Custom Dialogs */}
      <PromptDialog
        isOpen={renameDialog.isOpen}
        title={DIALOG_TITLE_RENAME_PROJECT}
        defaultValue={renameDialog.currentTitle}
        onConfirm={async (value) => {
          const nextTitle = value.trim();
          if (nextTitle && nextTitle !== renameDialog.currentTitle) {
            try {
              await updateProject(renameDialog.projectId, nextTitle);
            } catch (error) {
              window.api.logger.error("Failed to update project", error);
            }
          }
          setRenameDialog((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setRenameDialog((prev) => ({ ...prev, isOpen: false }))}
      />

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title={DIALOG_TITLE_DELETE_PROJECT}
        message={PROJECT_TEMPLATE_DELETE_CONFIRM.replace(
          "{title}",
          deleteDialog.projectTitle,
        )}
        confirmLabel={PROJECT_TEMPLATE_DELETE_CONFIRM_LABEL}
        isDestructive
        onConfirm={async () => {
          try {
            await deleteProject(deleteDialog.projectId);
          } catch (error) {
            window.api.logger.error("Failed to delete project", error);
          }
          setDeleteDialog((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setDeleteDialog((prev) => ({ ...prev, isOpen: false }))}
      />

      <div className="flex flex-1 overflow-hidden pt-[calc(var(--window-bar-height,0px))]">
        <div className="w-[240px] bg-sidebar border-r border-border/40 flex flex-col py-6 gap-6 px-4">
          <div className="text-micro font-bold text-muted uppercase tracking-wider px-2">{TEMPLATE_SIDEBAR_TITLE}</div>
          <div className="flex flex-col gap-1">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className={sidebarItemClass}
                data-active={activeCategory === cat.id}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.icon}
                {cat.label}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col p-10 overflow-y-auto w-full">
          <div className="mb-10 w-full">
            <div className="flex items-center justify-between mb-4">
              <div className="text-micro font-bold text-muted uppercase tracking-wider">{PROJECT_TEMPLATE_RECENT_TITLE}</div>
            </div>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 w-full">
              {projects.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  className={recentCardClass}
                  onClick={() => onOpenProject?.(p)}
                >
                  <div className="flex flex-col gap-1">
                    <div className="text-[15px] font-medium text-fg truncate pr-6">{p.title}</div>
                    <div
                      className="text-micro text-tertiary truncate font-mono opacity-80"
                      title={p.projectPath ?? ""}
                    >
                      {p.projectPath ?? PROJECT_TEMPLATE_EMPTY_PATH}
                    </div>
                  </div>

                  <button
                    className="absolute top-2 right-2 p-1.5 text-tertiary rounded hover:bg-hover hover:text-fg opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      menuButtonRef.current = e.currentTarget;
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setMenuPosition({ x: rect.right + 8, y: rect.top });
                      setMenuOpenId((prev) => (prev === p.id ? null : p.id));
                      window.api.logger.info("Project context menu", {
                        id: p.id,
                      });
                    }}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="text-micro font-bold text-muted uppercase tracking-wider mb-4">
            START NEW PROJECT
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-6 pb-12">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="group flex flex-col gap-3 cursor-pointer"
                onClick={() => handleSelectTemplate(template.id)}
              >
                  <div className={templateCardBase}>
                  {template.type === "blank" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-border bg-canvas/50">
                      <div className="w-full h-full border-2 border-dashed border-border/50 rounded-lg flex flex-col items-center justify-center gap-2 m-2">
                        <Plus className="w-8 h-8 opacity-50" />
                        <span className="text-xs font-medium opacity-70">
                          {TEMPLATE_NEW_PROJECT_LABEL}
                        </span>
                      </div>
                    </div>
                  )}

                  {template.type === "novel" && (
                    <div className="w-full h-full p-6 flex flex-col bg-canvas text-fg relative">
                      <div className="text-[10px] uppercase tracking-widest opacity-60 text-center mt-2">{PROJECT_TEMPLATE_COVER_STANDARD}</div>
                      <div className="flex-1 flex items-center justify-center text-center font-serif text-2xl font-bold leading-tight px-2">{PROJECT_TEMPLATE_COVER_NOVEL}</div>
                      <div className="text-2xl text-center opacity-30 pb-4">❦</div>
                    </div>
                  )}

                  {template.type === "script" && (
                    <div className="w-full h-full p-6 flex flex-col bg-surface text-fg font-mono relative border-l-12 border-l-border/50">
                      <div className="flex-1 flex flex-col justify-center gap-4">
                        <div className="text-lg font-bold uppercase leading-tight text-center">
                          {PROJECT_TEMPLATE_COVER_SCREEN}
                          <br />
                          {PROJECT_TEMPLATE_COVER_PLAY}
                        </div>
                        <div className="w-full h-px bg-border/60" />
                        <div className="w-1/2 h-px bg-border/60 self-center" />
                      </div>
                      <div className="text-[9px] text-center opacity-60">
                        {PROJECT_TEMPLATE_COVER_INTRO}
                      </div>
                    </div>
                  )}

                  {template.type === "doc" && (
                    <div className="w-full h-full flex flex-col bg-surface overflow-hidden relative">
                      <div className="absolute top-0 left-0 w-full h-2 bg-accent/80" />
                      <div className="flex-1 p-8 flex flex-col justify-center">
                        <div className="text-xl font-bold text-fg mb-4 leading-tight">
                          {PROJECT_TEMPLATE_COVER_ESSAY}
                        </div>
                        <div className="w-12 h-1 bg-border" />
                      </div>
                    </div>
                  )}
                </div>
                <span className={templateTitleClass}>{template.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
