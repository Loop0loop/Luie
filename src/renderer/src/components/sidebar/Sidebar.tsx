import { useState, useRef, useEffect } from "react";
import styles from "../../styles/components/Sidebar.module.css";
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
} from "lucide-react";

interface Chapter {
  id: string;
  title: string;
  order: number;
}

interface SidebarProps {
  chapters: Chapter[];
  activeChapterId?: string;
  currentProjectTitle?: string;
  onSelectChapter: (id: string) => void;
  onAddChapter: () => void;
  onRenameChapter?: (id: string, title: string) => void;
  onDuplicateChapter?: (id: string) => void;
  onDeleteChapter?: (id: string) => void;
  onOpenSettings: () => void;
  onSelectResearchItem: (type: "character" | "world" | "scrap") => void;
  onSplitView?: (type: "vertical" | "horizontal", contentId: string) => void;
}

export default function Sidebar({
  chapters,
  activeChapterId,
  currentProjectTitle,
  onSelectChapter,
  onAddChapter,
  onRenameChapter,
  onDuplicateChapter,
  onDeleteChapter,
  onOpenSettings,
  onSelectResearchItem,
  onSplitView,
}: SidebarProps) {
  // Section collapse states
  const [isManuscriptOpen, setManuscriptOpen] = useState(true);
  const [isResearchOpen, setResearchOpen] = useState(true);
  const [isTrashOpen, setTrashOpen] = useState(false);

  // Context Menu State
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMenuClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    // Position menu to the right of the button
    setMenuPosition({ x: rect.right + 8, y: rect.top });
    setMenuOpenId(id === menuOpenId ? null : id);
  };

  const handleAction = (action: string, id: string) => {
    window.api.logger.info("Sidebar action", { action, id });
    setMenuOpenId(null);
    if (action === "open_right" && onSplitView) {
      onSplitView("vertical", id);
    }
    if (action === "rename" && onRenameChapter) {
      const current = chapters.find((c) => c.id === id);
      const nextTitle = window.prompt("새 제목", current?.title ?? "")?.trim();
      if (nextTitle) {
        onRenameChapter(id, nextTitle);
      }
    }
    if (action === "duplicate" && onDuplicateChapter) {
      onDuplicateChapter(id);
    }
    if (action === "delete" && onDeleteChapter) {
      onDeleteChapter(id);
    }
  };

  return (
    <div className={styles.container}>
      {/* Context Menu Popup */}
      {menuOpenId && (
        <div
          ref={menuRef}
          className={styles.contextMenu}
          style={{ top: menuPosition.y, left: menuPosition.x }}
        >
          <div
            className={styles.contextMenuItem}
            onClick={() => handleAction("open_below", menuOpenId)}
          >
            <ArrowDownFromLine size={14} /> 아래에 열기
          </div>
          <div
            className={styles.contextMenuItem}
            onClick={() => handleAction("open_right", menuOpenId)}
          >
            <ArrowRightFromLine size={14} /> 오른쪽에 열기
          </div>
          <div className={styles.divider} />
          <div
            className={styles.contextMenuItem}
            onClick={() => handleAction("rename", menuOpenId)}
          >
            <Edit2 size={14} /> 이름 수정하기
          </div>
          <div
            className={styles.contextMenuItem}
            onClick={() => handleAction("duplicate", menuOpenId)}
          >
            <Copy size={14} /> 복제하기
          </div>
          <div
            className={styles.contextMenuItem}
            onClick={() => handleAction("delete", menuOpenId)}
            style={{ color: "#ef4444" }}
          >
            <Trash2 size={14} /> 삭제하기
          </div>
        </div>
      )}
      <div className={styles.header}>
        <h2 className={styles.projectName}>
          {currentProjectTitle || "프로젝트"}
        </h2>
        <div className={styles.metaInfo}>PROJECT BINDER</div>
      </div>

      <div className={styles.binderArea}>
        {/* MANUSCRIPT SECTION */}
        <div
          className={styles.sectionHeader}
          onClick={() => setManuscriptOpen(!isManuscriptOpen)}
        >
          {isManuscriptOpen ? (
            <ChevronDown size={12} className={styles.sectionIcon} />
          ) : (
            <ChevronRight size={12} className={styles.sectionIcon} />
          )}
          <span>원고 (Manuscript)</span>
        </div>

        {isManuscriptOpen && (
          <div className={styles.sectionContent}>
            {chapters.map((chapter) => (
              <div
                key={chapter.id}
                className={
                  activeChapterId === chapter.id
                    ? styles.itemActive
                    : styles.item
                }
                onClick={() => onSelectChapter(chapter.id)}
                onMouseEnter={() => setHoveredItemId(chapter.id)}
                onMouseLeave={() => setHoveredItemId(null)}
              >
                <FileText size={14} className={styles.itemIcon} />
                <span className={styles.itemTitle}>
                  {chapter.order}. {chapter.title}
                </span>

                {/* More Action Button - Visible on hover or when menu is open */}
                {(hoveredItemId === chapter.id ||
                  menuOpenId === chapter.id) && (
                  <div
                    className={styles.moreButton}
                    onClick={(e) => handleMenuClick(e, chapter.id)}
                  >
                    <MoreVertical size={14} />
                  </div>
                )}
              </div>
            ))}
            {/* Inline Add Button for Manuscript */}
            <div
              className={styles.item}
              onClick={onAddChapter}
              style={{ color: "var(--text-tertiary)" }}
            >
              <Plus size={14} className={styles.itemIcon} />
              <span>새 회차 추가...</span>
            </div>
          </div>
        )}

        {/* RESEARCH SECTION */}
        <div
          className={styles.sectionHeader}
          onClick={() => setResearchOpen(!isResearchOpen)}
        >
          {isResearchOpen ? (
            <ChevronDown size={12} className={styles.sectionIcon} />
          ) : (
            <ChevronRight size={12} className={styles.sectionIcon} />
          )}
          <span>연구 (Research)</span>
        </div>

        {isResearchOpen && (
          <div className={styles.sectionContent}>
            <div
              className={styles.item}
              onClick={() => onSelectResearchItem("character")}
              onMouseEnter={() => setHoveredItemId("res-char")}
              onMouseLeave={() => setHoveredItemId(null)}
            >
              <FolderOpen size={14} className={styles.itemIcon} />
              <span>등장인물 (Characters)</span>
              {(hoveredItemId === "res-char" || menuOpenId === "res-char") && (
                <div
                  className={styles.moreButton}
                  onClick={(e) => handleMenuClick(e, "res-char")}
                >
                  <MoreVertical size={14} />
                </div>
              )}
            </div>
            <div
              className={styles.item}
              onClick={() => onSelectResearchItem("world")}
              onMouseEnter={() => setHoveredItemId("res-world")}
              onMouseLeave={() => setHoveredItemId(null)}
            >
              <FolderOpen size={14} className={styles.itemIcon} />
              <span>세계관 (World)</span>
              {(hoveredItemId === "res-world" ||
                menuOpenId === "res-world") && (
                <div
                  className={styles.moreButton}
                  onClick={(e) => handleMenuClick(e, "res-world")}
                >
                  <MoreVertical size={14} />
                </div>
              )}
            </div>
            <div
              className={styles.item}
              onClick={() => onSelectResearchItem("scrap")}
              onMouseEnter={() => setHoveredItemId("res-scrap")}
              onMouseLeave={() => setHoveredItemId(null)}
            >
              <BookOpen size={14} className={styles.itemIcon} />
              <span>자료 스크랩</span>
              {(hoveredItemId === "res-scrap" ||
                menuOpenId === "res-scrap") && (
                <div
                  className={styles.moreButton}
                  onClick={(e) => handleMenuClick(e, "res-scrap")}
                >
                  <MoreVertical size={14} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* TRASH SECTION */}
        <div
          className={styles.sectionHeader}
          onClick={() => setTrashOpen(!isTrashOpen)}
        >
          {isTrashOpen ? (
            <ChevronDown size={12} className={styles.sectionIcon} />
          ) : (
            <ChevronRight size={12} className={styles.sectionIcon} />
          )}
          <span>휴지통 (Trash)</span>
        </div>

        {isTrashOpen && (
          <div className={styles.sectionContent}>
            <div
              className={styles.item}
              style={{ fontStyle: "italic", color: "var(--text-tertiary)" }}
            >
              <Trash2 size={14} className={styles.itemIcon} />
              <span>비어 있음</span>
            </div>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <button className={styles.settingsButton} onClick={onOpenSettings}>
          <Settings size={16} />
          <span>설정 (Settings)</span>
        </button>
      </div>
    </div>
  );
}
