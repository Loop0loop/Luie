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
            <div className="flex flex-col gap-1 px-3">
                {chapters.map((chapter) => (
                <div
                    key={chapter.id}
                    onClick={() => onSelectChapter(chapter.id)}
                    className={cn(
                    "flex items-center px-4 py-1.5 cursor-pointer text-[13px] transition-colors select-none rounded-[100px] min-h-[32px]",
                    activeChapterId === chapter.id
                        ? "bg-[#c2e7ff] text-[#001d35] font-semibold"
                        : "text-[#444746] dark:text-[#c4c7c5] hover:bg-[#1f1f1f]/5 dark:hover:bg-white/10"
                    )}
                >
                    <span className="truncate">
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
