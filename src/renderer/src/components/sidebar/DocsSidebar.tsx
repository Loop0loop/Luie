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

interface DocsSidebarProps {
  chapters: Chapter[];
  activeChapterId?: string;
  onSelectChapter: (id: string) => void;
  onAddChapter: () => void;
  onRenameChapter?: (id: string, title: string) => void;
  onDuplicateChapter?: (id: string) => void;
  onDeleteChapter?: (id: string) => void;
}

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
  const { menuOpenId, menuPosition, menuRef, closeMenu, toggleMenuByElement } = useFloatingMenu<HTMLButtonElement>();

  const handleAction = (action: string, id: string) => {
    closeMenu();
    if (action === "rename" && onRenameChapter) {
        // Simple prompt for now, or hoist state? Sidebar uses window.prompt.
        // We can do the same for consistency.
        // Actually Sidebar.tsx logic:
        /*
        const current = chapters.find((c) => c.id === id);
        const nextTitle = window.prompt(t("sidebar.prompt.renameTitle"), current?.title ?? "")?.trim();
        if (nextTitle) onRenameChapter(id, nextTitle);
        */
       // But here we accept onRenameChapter as (id, title) => void.
       // So we should implement the prompt here or expect parent to handle it?
       // SidebarProps definition: onRenameChapter?: (id: string, title: string) => void;
       // Sidebar.tsx implements the prompt internally inside handleAction.
       // So I should do the same.
       const current = chapters.find((c) => c.id === id);
       // We don't have t("sidebar.prompt.renameTitle")? We have t.
       const nextTitle = window.prompt("새로운 제목을 입력하세요", current?.title ?? "")?.trim();
       if (nextTitle) onRenameChapter(id, nextTitle);
    }
    if (action === "duplicate" && onDuplicateChapter) {
        onDuplicateChapter(id);
    }
    if (action === "delete" && onDeleteChapter) {
        if (window.confirm("정말로 삭제하시겠습니까?")) {
            onDeleteChapter(id);
        }
    }
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground relative">
      {menuOpenId && (
        <div
          className="fixed inset-0 z-[9999] bg-transparent"
          onPointerDown={closeMenu}
        />
      )}
      {/* Context Menu Popup */}
      {menuOpenId && (
        <div
          ref={menuRef}
          className="fixed z-[10000] bg-popover border border-border rounded-lg shadow-lg min-w-[160px] p-1.5 animate-in fade-in zoom-in-95 duration-100 flex flex-col text-popover-foreground"
          style={{ top: menuPosition.y, left: menuPosition.x }}
        >
          <div
            className="flex items-center gap-2.5 px-3 py-2 text-[13px] cursor-pointer rounded-md transition-all hover:bg-accent hover:text-accent-foreground"
            onClick={() => handleAction("rename", menuOpenId)}
          >
            <Edit2 className="w-3.5 h-3.5" /> {t("sidebar.menu.rename")}
          </div>
          <div
            className="flex items-center gap-2.5 px-3 py-2 text-[13px] cursor-pointer rounded-md transition-all hover:bg-accent hover:text-accent-foreground"
            onClick={() => handleAction("duplicate", menuOpenId)}
          >
            <Copy className="w-3.5 h-3.5" /> {t("sidebar.menu.duplicate")}
          </div>
          <div
            className="flex items-center gap-2.5 px-3 py-2 text-[13px] cursor-pointer rounded-md transition-all hover:bg-accent hover:text-accent-foreground text-red-500 hover:text-red-600"
            onClick={() => handleAction("delete", menuOpenId)}
          >
            <Trash2 className="w-3.5 h-3.5" /> {t("sidebar.menu.delete")}
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto pt-4 pb-2">
            {/* Outline Header (Optional, but good for context) */}
            <div className="px-4 mb-2">
                 <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    {t("sidebar.section.manuscript")}
                 </h2>
            </div>
            
            {/* List */}
            <div className="flex flex-col gap-1 px-3">
                {chapters.map((chapter) => (
                <div
                    key={chapter.id}
                    onClick={() => onSelectChapter(chapter.id)}
                    className={cn(
                     "flex items-center px-4 py-1.5 cursor-pointer text-[13px] transition-colors select-none rounded-[100px] min-h-[32px] group relative",
                    activeChapterId === chapter.id
                        ? "bg-accent text-accent-fg font-semibold"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                >
                    <span className="truncate flex-1">
                         {chapter.title || t("chapter.untitled")}
                    </span>

                    {/* Hover Menu Trigger */}
                    <button
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-all duration-200"
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleMenuByElement(chapter.id, e.currentTarget);
                        }}
                    >
                        <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                </div>
                ))}
            </div>
            
            {/* Add Button - Floating or subtle at bottom? Docs doesn't have "Add Chapter", but we need it. Keep it subtle. */}
            <button
                onClick={onAddChapter}
                className="flex items-center mx-4 mt-4 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/10 rounded-full w-fit transition-colors"
                title={t("sidebar.addChapter")}
            >
                <Plus className="w-3 h-3 mr-1.5" />
                {t("sidebar.addChapter")}
            </button>
      </div>
    </div>
  );
}
