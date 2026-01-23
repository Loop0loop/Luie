import { useEffect, useRef, useState } from "react";
import styles from "../../styles/components/ProjectTemplateSelector.module.css";
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
    { id: "all", label: PROJECT_TEMPLATE_CATEGORY_ALL, icon: <Book className={styles.iconMd} /> },
    { id: "novel", label: PROJECT_TEMPLATE_CATEGORY_NOVEL, icon: <Book className={styles.iconMd} /> },
    { id: "script", label: PROJECT_TEMPLATE_CATEGORY_SCRIPT, icon: <FileText className={styles.iconMd} /> },
    { id: "misc", label: PROJECT_TEMPLATE_CATEGORY_GENERAL, icon: <FileType className={styles.iconMd} /> },
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

  return (
    <div className={styles.container}>
      <WindowBar />

      {menuOpenId && (
        <div
          className={styles.menuBackdrop}
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
              className={styles.recentContextMenu}
              style={{ top: menuPosition.y, left: menuPosition.x }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={styles.recentContextMenuItem}
                onClick={() => {
                  setMenuOpenId(null);
                  onOpenProject?.(p);
                }}
              >
                {PROJECT_TEMPLATE_CONTEXT_OPEN}
              </div>
              <div
                className={styles.recentContextMenuItem}
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
              <div className={styles.recentContextMenuDivider} />
              <div
                className={`${styles.recentContextMenuItem} ${styles.recentContextMenuDanger}`}
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

      <div className={styles.body}>
        <div className={styles.sidebar}>
          <div className={styles.sidebarTitle}>{TEMPLATE_SIDEBAR_TITLE}</div>
          {categories.map((cat) => (
            <div
              key={cat.id}
              className={
                activeCategory === cat.id
                  ? `${styles.menuItem} ${styles.menuItemActive}`
                  : styles.menuItem
              }
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.icon}
              {cat.label}
            </div>
          ))}

          <div className={styles.recentSection}>
            <div className={styles.recentHeader}>
              <div className={styles.recentTitle}>{PROJECT_TEMPLATE_RECENT_TITLE}</div>
            </div>

            <div className={styles.recentGrid}>
              {projects.slice(0, 6).map((p) => (
                <div
                  key={p.id}
                  className={styles.recentCard}
                  onClick={() => onOpenProject?.(p)}
                >
                  <div className={styles.recentCardContent}>
                    <div className={styles.recentProjectTitle}>{p.title}</div>
                    <div
                      className={styles.recentProjectPath}
                      title={p.projectPath ?? ""}
                    >
                      {p.projectPath ?? PROJECT_TEMPLATE_EMPTY_PATH}
                    </div>
                  </div>

                  <button
                    className={styles.recentCardMenuBtn}
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
                    <MoreVertical className={styles.iconMd} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles.grid}>
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className={styles.card}
                onClick={() => handleSelectTemplate(template.id)}
              >
                <div className={styles.cardPreview}>
                  {template.type === "blank" && (
                    <div className={styles.coverBlank}>
                      <div className={styles.dashed}>
                        <Plus className={styles.coverPlusIcon} />
                        <span className={styles.newProjectLabel}>
                          {TEMPLATE_NEW_PROJECT_LABEL}
                        </span>
                      </div>
                    </div>
                  )}

                  {template.type === "novel" && (
                    <div
                      className={`${styles.coverNovel} ${styles.coverContent}`}
                    >
                      <div className={styles.subtitle}>{PROJECT_TEMPLATE_COVER_STANDARD}</div>
                      <div className={styles.title}>{PROJECT_TEMPLATE_COVER_NOVEL}</div>
                      <div className={styles.coverSymbol}>❦</div>
                    </div>
                  )}

                  {template.type === "script" && (
                    <div
                      className={`${styles.coverScript} ${styles.coverContent}`}
                    >
                      <div className={styles.title}>
                        {PROJECT_TEMPLATE_COVER_SCREEN}
                        <br />
                        {PROJECT_TEMPLATE_COVER_PLAY}
                      </div>
                      <div className={styles.line} />
                      <div className={`${styles.line} ${styles.lineShort}`} />
                      <div className={styles.coverIntro}>
                        {PROJECT_TEMPLATE_COVER_INTRO}
                      </div>
                    </div>
                  )}

                  {template.type === "doc" && (
                    <div className={`${styles.coverBlank} ${styles.coverDoc}`}>
                      <div className={styles.coverDocInner}>
                        <div className={styles.coverDocTitle}>
                          {PROJECT_TEMPLATE_COVER_ESSAY}
                        </div>
                        <div className={styles.coverDocDivider} />
                      </div>
                    </div>
                  )}
                </div>
                <span className={styles.cardTitle}>{template.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
