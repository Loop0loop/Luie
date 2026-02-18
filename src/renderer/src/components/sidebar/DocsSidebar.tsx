import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../../shared/types/utils";
import type { Chapter } from "../../../../shared/types";
import { 
  Plus,
  MoreVertical,
  Edit2,
  Copy,
  Trash2,
} from "lucide-react";
import { useFloatingMenu } from "../../hooks/useFloatingMenu";
import { useDialog } from "../common/DialogProvider";
import { useUIStore } from "../../stores/uiStore";

interface DocsSidebarProps {
  chapters: Chapter[];
  activeChapterId?: string;
  onSelectChapter: (id: string) => void;
  onAddChapter: () => void;
  onRenameChapter?: (id: string, title: string) => void;
  onDuplicateChapter?: (id: string) => void;
  onDeleteChapter?: (id: string) => void;
}

type ChapterAction = "rename" | "duplicate" | "delete";

export default function DocsSidebar({
  chapters,
  activeChapterId,
  onSelectChapter,
  onAddChapter,
  onRenameChapter,
  onDuplicateChapter,
  onDeleteChapter,
}: DocsSidebarProps) {
  const { t } = useTranslation();
  const dialog = useDialog();
  const { menuOpenId, menuPosition, menuRef, closeMenu, toggleMenuByElement } = useFloatingMenu<HTMLButtonElement>();
  const setManuscriptMenuOpen = useUIStore(
    (state) => state.setManuscriptMenuOpen,
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    setManuscriptMenuOpen(Boolean(menuOpenId));
    return () => {
      setManuscriptMenuOpen(false);
    };
  }, [menuOpenId, setManuscriptMenuOpen]);

  const handleAction = async (
    action: ChapterAction,
    id: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    closeMenu();

    if (action === "rename") {
      const current = chapters.find((chapter) => chapter.id === id);
      if (current) {
         setEditingId(id);
         setEditValue(current.title || "");
      }
      return;
    }

    if (action === "duplicate") {
      if (!onDuplicateChapter) return;
      onDuplicateChapter(id);
      return;
    }

    if (!onDeleteChapter) return;
    const confirmed = await dialog.confirm({
      title: t("sidebar.menu.delete"),
      message: t("sidebar.prompt.deleteConfirm"),
      isDestructive: true,
    });

    if (confirmed) {
      onDeleteChapter(id);
    }
  };

  const commitRename = () => {
     if (editingId && onRenameChapter && editValue.trim()) {
        onRenameChapter(editingId, editValue.trim());
     }
     setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
          commitRename();
      } else if (e.key === "Escape") {
          setEditingId(null);
      }
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground relative">
      {/* Menu Overlay */}
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
          className="fixed z-10000 bg-panel border border-border rounded-lg shadow-lg min-w-[160px] p-1.5 animate-in fade-in zoom-in-95 duration-100 flex flex-col text-fg"
          style={{ top: menuPosition.y, left: menuPosition.x }}
        >
          <div
            className="flex items-center gap-2.5 px-3 py-2 text-[13px] cursor-pointer rounded-md transition-all hover:bg-surface-hover hover:text-fg"
            onClick={(e) => void handleAction("rename", menuOpenId, e)}
          >
            <Edit2 className="w-3.5 h-3.5" /> {t("sidebar.menu.rename")}
          </div>
          <div
            className="flex items-center gap-2.5 px-3 py-2 text-[13px] cursor-pointer rounded-md transition-all hover:bg-surface-hover hover:text-fg"
            onClick={(e) => void handleAction("duplicate", menuOpenId, e)}
          >
            <Copy className="w-3.5 h-3.5" /> {t("sidebar.menu.duplicate")}
          </div>
          <div
            className="flex items-center gap-2.5 px-3 py-2 text-[13px] cursor-pointer rounded-md transition-all hover:bg-surface-hover hover:text-red-600 text-red-500"
            onClick={(e) => void handleAction("delete", menuOpenId, e)}
          >
            <Trash2 className="w-3.5 h-3.5" /> {t("sidebar.menu.delete")}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-4 flex items-center justify-between shrink-0">
        <h2 className="font-semibold text-sm text-muted-foreground">{t("sidebar.title")}</h2>
        <button 
           onClick={onAddChapter}
           className="w-6 h-6 rounded-md hover:bg-muted/50 flex items-center justify-center transition-colors text-muted-foreground"
           title={t("sidebar.action.new")}
        >
           <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Chapter List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5 custom-scrollbar pb-4">
          {chapters.map(chapter => {
             const isActive = chapter.id === activeChapterId;
             const isEditing = chapter.id === editingId;

             return (
               <div 
                 key={chapter.id}
                 className={cn(
                    "group flex items-center justify-between px-3 py-2 rounded-md transition-colors cursor-pointer text-sm select-none min-h-[36px]",
                    isActive ? "bg-accent/10 text-accent font-medium" : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                 )}
                 onClick={() => onSelectChapter(chapter.id)}
               >
                 {isEditing ? (
                     <input 
                        autoFocus
                        type="text"
                        value={editValue}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={handleKeyDown}
                        className="bg-background border border-accent/50 rounded px-1 py-0.5 w-full text-foreground outline-none text-sm h-6 leading-none"
                     />
                 ) : (
                     <span className="truncate flex-1 leading-normal">{chapter.title || t("project.defaults.untitled")}</span>
                 )}

                 {/* Menu Button (Only show if not editing) */}
                 {!isEditing && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleMenuByElement(chapter.id, e.currentTarget);
                        }}
                        className={cn(
                            "opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-sm hover:bg-background/50",
                            (menuOpenId === chapter.id) && "opacity-100"
                        )}
                    >
                        <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                 )}
               </div>
             );
          })}
      </div>
      
      {/* Add Button - Floating or subtle at bottom? Docs doesn't have "Add Chapter", but we need it. Keep it subtle. */}
      <button
          onClick={onAddChapter}
          className="flex items-center mx-4 mt-4 mb-4 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/10 rounded-full w-fit transition-colors shrink-0"
          title={t("sidebar.addChapter")}
      >
          <Plus className="w-3 h-3 mr-1.5" />
          {t("sidebar.addChapter")}
      </button>
    </div>
  );
}
