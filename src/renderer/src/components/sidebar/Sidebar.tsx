import { useState, useRef, useEffect, memo } from "react";
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
import {
  ICON_SIZE_MD,
  ICON_SIZE_SM,
  ICON_SIZE_XS,
  SIDEBAR_ADD_CHAPTER,
  SIDEBAR_BINDER_TITLE,
  SIDEBAR_DEFAULT_PROJECT_TITLE,
  SIDEBAR_ITEM_CHARACTERS,
  SIDEBAR_ITEM_SCRAP,
  SIDEBAR_ITEM_WORLD,
  SIDEBAR_MENU_DELETE,
  SIDEBAR_MENU_DUPLICATE,
  SIDEBAR_MENU_OPEN_BELOW,
  SIDEBAR_MENU_OPEN_RIGHT,
  SIDEBAR_MENU_RENAME,
  SIDEBAR_PROMPT_RENAME_TITLE,
  SIDEBAR_SECTION_MANUSCRIPT,
  SIDEBAR_SECTION_RESEARCH,
  SIDEBAR_SECTION_TRASH,
  SIDEBAR_SETTINGS_LABEL,
  SIDEBAR_TRASH_EMPTY,
} from "../../../../shared/constants";

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
  onPrefetchSettings?: () => void;
  onSelectResearchItem: (type: "character" | "world" | "scrap") => void;
  onSplitView?: (type: "vertical" | "horizontal", contentId: string) => void;
}

function Sidebar({
  chapters,
  activeChapterId,
  currentProjectTitle,
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
  // Section collapse states
  const [isManuscriptOpen, setManuscriptOpen] = useState(true);
  const [isResearchOpen, setResearchOpen] = useState(true);
  const [isTrashOpen, setTrashOpen] = useState(false);

  // Context Menu State
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLElement | null>(null);

  // Close menu on outside click
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
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [menuOpenId]);

  const handleMenuClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    menuButtonRef.current = e.currentTarget as HTMLElement;
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
      const nextTitle = window.prompt(SIDEBAR_PROMPT_RENAME_TITLE, current?.title ?? "")?.trim();
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
      {menuOpenId && (
        <div
          className={styles.menuBackdrop}
          onPointerDown={() => setMenuOpenId(null)}
        />
      )}
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
            <ArrowDownFromLine size={ICON_SIZE_SM} /> {SIDEBAR_MENU_OPEN_BELOW}
          </div>
          <div
            className={styles.contextMenuItem}
            onClick={() => handleAction("open_right", menuOpenId)}
          >
            <ArrowRightFromLine size={ICON_SIZE_SM} /> {SIDEBAR_MENU_OPEN_RIGHT}
          </div>
          <div className={styles.divider} />
          <div
            className={styles.contextMenuItem}
            onClick={() => handleAction("rename", menuOpenId)}
          >
            <Edit2 size={ICON_SIZE_SM} /> {SIDEBAR_MENU_RENAME}
          </div>
          <div
            className={styles.contextMenuItem}
            onClick={() => handleAction("duplicate", menuOpenId)}
          >
            <Copy size={ICON_SIZE_SM} /> {SIDEBAR_MENU_DUPLICATE}
          </div>
          <div
            className={styles.contextMenuItem}
            onClick={() => handleAction("delete", menuOpenId)}
            style={{ color: "#ef4444" }}
          >
            <Trash2 size={ICON_SIZE_SM} /> {SIDEBAR_MENU_DELETE}
          </div>
        </div>
      )}
      <div className={styles.header}>
        <h2 className={styles.projectName}>
          {currentProjectTitle || SIDEBAR_DEFAULT_PROJECT_TITLE}
        </h2>
        <div className={styles.metaInfo}>{SIDEBAR_BINDER_TITLE}</div>
      </div>

      <div className={styles.binderArea}>
        {/* MANUSCRIPT SECTION */}
        <div
          className={styles.sectionHeader}
          onClick={() => setManuscriptOpen(!isManuscriptOpen)}
        >
          {isManuscriptOpen ? (
            <ChevronDown size={ICON_SIZE_XS} className={styles.sectionIcon} />
          ) : (
            <ChevronRight size={ICON_SIZE_XS} className={styles.sectionIcon} />
          )}
          <span>{SIDEBAR_SECTION_MANUSCRIPT}</span>
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
                <FileText size={ICON_SIZE_SM} className={styles.itemIcon} />
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
                    <MoreVertical size={ICON_SIZE_SM} />
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
              <Plus size={ICON_SIZE_SM} className={styles.itemIcon} />
              <span>{SIDEBAR_ADD_CHAPTER}</span>
            </div>
          </div>
        )}

        {/* RESEARCH SECTION */}
        <div
          className={styles.sectionHeader}
          onClick={() => setResearchOpen(!isResearchOpen)}
        >
          {isResearchOpen ? (
            <ChevronDown size={ICON_SIZE_XS} className={styles.sectionIcon} />
          ) : (
            <ChevronRight size={ICON_SIZE_XS} className={styles.sectionIcon} />
          )}
          <span>{SIDEBAR_SECTION_RESEARCH}</span>
        </div>

        {isResearchOpen && (
          <div className={styles.sectionContent}>
            <div
              className={styles.item}
              onClick={() => onSelectResearchItem("character")}
              onMouseEnter={() => setHoveredItemId("res-char")}
              onMouseLeave={() => setHoveredItemId(null)}
            >
              <FolderOpen size={ICON_SIZE_SM} className={styles.itemIcon} />
              <span>{SIDEBAR_ITEM_CHARACTERS}</span>
              {(hoveredItemId === "res-char" || menuOpenId === "res-char") && (
                <div
                  className={styles.moreButton}
                  onClick={(e) => handleMenuClick(e, "res-char")}
                >
                  <MoreVertical size={ICON_SIZE_SM} />
                </div>
              )}
            </div>
            <div
              className={styles.item}
              onClick={() => onSelectResearchItem("world")}
              onMouseEnter={() => setHoveredItemId("res-world")}
              onMouseLeave={() => setHoveredItemId(null)}
            >
              <FolderOpen size={ICON_SIZE_SM} className={styles.itemIcon} />
              <span>{SIDEBAR_ITEM_WORLD}</span>
              {(hoveredItemId === "res-world" ||
                menuOpenId === "res-world") && (
                <div
                  className={styles.moreButton}
                  onClick={(e) => handleMenuClick(e, "res-world")}
                >
                  <MoreVertical size={ICON_SIZE_SM} />
                </div>
              )}
            </div>
            <div
              className={styles.item}
              onClick={() => onSelectResearchItem("scrap")}
              onMouseEnter={() => setHoveredItemId("res-scrap")}
              onMouseLeave={() => setHoveredItemId(null)}
            >
              <BookOpen size={ICON_SIZE_SM} className={styles.itemIcon} />
              <span>{SIDEBAR_ITEM_SCRAP}</span>
              {(hoveredItemId === "res-scrap" ||
                menuOpenId === "res-scrap") && (
                <div
                  className={styles.moreButton}
                  onClick={(e) => handleMenuClick(e, "res-scrap")}
                >
                  <MoreVertical size={ICON_SIZE_SM} />
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
            <ChevronDown size={ICON_SIZE_XS} className={styles.sectionIcon} />
          ) : (
            <ChevronRight size={ICON_SIZE_XS} className={styles.sectionIcon} />
          )}
          <span>{SIDEBAR_SECTION_TRASH}</span>
        </div>

        {isTrashOpen && (
          <div className={styles.sectionContent}>
            <div
              className={styles.item}
              style={{ fontStyle: "italic", color: "var(--text-tertiary)" }}
            >
              <Trash2 size={ICON_SIZE_SM} className={styles.itemIcon} />
              <span>{SIDEBAR_TRASH_EMPTY}</span>
            </div>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <button
          className={styles.settingsButton}
          onClick={onOpenSettings}
          onPointerEnter={onPrefetchSettings}
        >
          <Settings size={ICON_SIZE_MD} />
          <span>{SIDEBAR_SETTINGS_LABEL}</span>
        </button>
      </div>
    </div>
  );
}

export default memo(Sidebar);
