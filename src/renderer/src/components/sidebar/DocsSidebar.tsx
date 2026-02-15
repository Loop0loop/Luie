import { useTranslation } from "react-i18next";
import { cn } from "../../../../shared/types/utils";
import type { Chapter } from "../../../../shared/types";
import { 
  Plus
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
    <div className="flex flex-col h-full bg-white dark:bg-[#1e1e1e] text-fg">
      <div className="flex-1 overflow-y-auto pt-4 pb-2">
            {/* Outline Header (Optional, but good for context) */}
            <div className="px-4 mb-2">
                 <h2 className="text-[11px] font-bold text-[#5f6368] dark:text-[#9aa0a6] uppercase tracking-wider">
                    {t("sidebar.section.manuscript")}
                 </h2>
            </div>
            
            {/* List */}
            <div className="flex flex-col gap-0.5">
                {chapters.map((chapter) => (
                <div
                    key={chapter.id}
                    onClick={() => onSelectChapter(chapter.id)}
                    className={cn(
                    "relative group cursor-pointer text-[13px] py-1.5 pr-4 transition-colors select-none",
                    activeChapterId === chapter.id
                        ? "text-[#1a73e8] dark:text-[#8ab4f8] font-semibold bg-blue-50/50 dark:bg-blue-900/20"
                        : "text-[#5f6368] dark:text-[#c4c7c5] hover:bg-[#f1f3f4] dark:hover:bg-[#303134]"
                    )}
                >
                    {/* Left Border Indicator for Active State */}
                    {activeChapterId === chapter.id && (
                        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#1a73e8] dark:bg-[#8ab4f8] rounded-r" />
                    )}
                    
                    <span className={cn("truncate block", activeChapterId === chapter.id ? "pl-3.5" : "pl-4")}>
                         {chapter.title || t("chapter.untitled")}
                    </span>
                </div>
                ))}
            </div>
            
            {/* Add Button - Floating or subtle at bottom? Docs doesn't have "Add Chapter", but we need it. Keep it subtle. */}
            <button
                onClick={onAddChapter}
                className="flex items-center mx-4 mt-4 px-3 py-1.5 text-xs font-medium text-[#1a73e8] dark:text-[#8ab4f8] hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full w-fit transition-colors"
                title={t("sidebar.addChapter")}
            >
                <Plus className="w-3 h-3 mr-1.5" />
                {t("sidebar.addChapter")}
            </button>
      </div>
    </div>
  );
}
