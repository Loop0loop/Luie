import { useTranslation } from "react-i18next";
import { cn } from "../../../../shared/types/utils";
import type { Chapter } from "../../../../shared/types";
import { 
  Plus,
  MoreVertical,
} from "lucide-react";

interface DocsSidebarProps {
  chapters: Chapter[];
  activeChapterId?: string;
  onSelectChapter: (id: string) => void;
  onAddChapter: () => void;
}

export default function DocsSidebar({
  chapters,
  activeChapterId,
  onSelectChapter,
  onAddChapter,
}: DocsSidebarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
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
                            // TODO: Add context menu logic here if needed, or trigger parent's onMenu
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
