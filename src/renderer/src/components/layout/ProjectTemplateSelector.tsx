import { useEffect, useRef, useState } from "react";
import styles from "../../styles/components/ProjectTemplateSelector.module.css";
import WindowBar from "./WindowBar";
import { Plus, Book, FileText, FileType, MoreVertical } from "lucide-react";
import type { Project } from "../../../../shared/types";
import { useProjectStore } from "../../stores/projectStore";

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

  const { deleteProject } = useProjectStore();
  const { updateProject } = useProjectStore();

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

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
    { id: "all", label: "All Templates", icon: <Book size={16} /> },
    { id: "novel", label: "Novel (소설)", icon: <Book size={16} /> },
    { id: "script", label: "Script (대본)", icon: <FileText size={16} /> },
    { id: "misc", label: "General", icon: <FileType size={16} /> },
  ];

  const templates = [
    {
      id: "blank",
      title: "빈 프로젝트 (Blank)",
      category: "all",
      type: "blank",
    },
    {
      id: "novel_basic",
      title: "웹소설 표준 (Web Novel)",
      category: "novel",
      type: "novel",
    },
    {
      id: "script_basic",
      title: "드라마 대본 (Screenplay)",
      category: "script",
      type: "script",
    },
    {
      id: "essay",
      title: "에세이/수필 (Essay)",
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
        title: "프로젝트 저장 위치 선택",
        defaultPath: "New Project.luie",
        filters: [
          { name: "Luie Project", extensions: ["luie"] },
          { name: "Markdown", extensions: ["md"] },
          { name: "Text", extensions: ["txt"] },
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
                열기
              </div>
              <div
                className={styles.recentContextMenuItem}
                onClick={async () => {
                  setMenuOpenId(null);
                  const nextTitle = window
                    .prompt("프로젝트 이름 수정", p.title)
                    ?.trim();
                  if (!nextTitle || nextTitle === p.title) return;

                  try {
                    await updateProject(p.id, nextTitle);
                  } catch (error) {
                    window.api.logger.error("Failed to update project", error);
                  }
                }}
              >
                이름 수정
              </div>
              <div className={styles.recentContextMenuDivider} />
              <div
                className={`${styles.recentContextMenuItem} ${styles.recentContextMenuDanger}`}
                onClick={async () => {
                  setMenuOpenId(null);
                  const ok = window.confirm(
                    `정말로 "${p.title}" 프로젝트를 삭제할까요?`,
                  );
                  if (!ok) return;

                  try {
                    await deleteProject(p.id);
                  } catch (error) {
                    window.api.logger.error("Failed to delete project", error);
                  }
                }}
              >
                삭제
              </div>
            </div>
          );
        })()}

      <div className={styles.body}>
        <div className={styles.sidebar}>
          <div className={styles.sidebarTitle}>Start New Project</div>
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
        </div>

        <div className={styles.content}>
          {projects.length > 0 && (
            <div className={styles.recentSection}>
              <div className={styles.recentHeader}>
                <div className={styles.recentTitle}>Recent Projects</div>
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
                        {p.projectPath ?? "(No path)"}
                      </div>
                    </div>

                    <button
                      className={styles.recentCardMenuBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        menuButtonRef.current = e.currentTarget;
                        const rect = (
                          e.currentTarget as HTMLElement
                        ).getBoundingClientRect();
                        setMenuPosition({ x: rect.right + 8, y: rect.top });
                        setMenuOpenId((prev) => (prev === p.id ? null : p.id));
                        window.api.logger.info("Project context menu", {
                          id: p.id,
                        });
                      }}
                    >
                      <MoreVertical size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                        <Plus size={32} color="#a1a1aa" />
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 500,
                            color: "#a1a1aa",
                          }}
                        >
                          NEW PROJECT
                        </span>
                      </div>
                    </div>
                  )}

                  {template.type === "novel" && (
                    <div
                      className={`${styles.coverNovel} ${styles.coverContent}`}
                    >
                      <div className={styles.subtitle}>THE STANDARD</div>
                      <div className={styles.title}>NOVEL</div>
                      <div
                        style={{ fontSize: 32, opacity: 0.2, marginTop: 16 }}
                      >
                        ❦
                      </div>
                    </div>
                  )}

                  {template.type === "script" && (
                    <div
                      className={`${styles.coverScript} ${styles.coverContent}`}
                    >
                      <div className={styles.title}>
                        SCREEN
                        <br />
                        PLAY
                      </div>
                      <div className={styles.line} />
                      <div className={styles.line} style={{ width: "60%" }} />
                      <div
                        style={{
                          marginTop: "auto",
                          fontSize: 10,
                          color: "#64748b",
                        }}
                      >
                        INT. COFFEE SHOP - DAY
                      </div>
                    </div>
                  )}

                  {template.type === "doc" && (
                    <div
                      className={styles.coverBlank}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <div style={{ textAlign: "center" }}>
                        <div
                          style={{
                            fontSize: 24,
                            fontFamily: "serif",
                            color: "#333",
                          }}
                        >
                          Essay
                        </div>
                        <div
                          style={{
                            width: 40,
                            height: 1,
                            background: "#333",
                            margin: "8px auto",
                          }}
                        />
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
