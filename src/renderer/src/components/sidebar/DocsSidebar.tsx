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
      <div className="flex-1 overflow-y-auto py-2">
          {/* Header */}
            <div className="px-4 py-2 text-xs font-semibold text-muted uppercase tracking-wider mb-1">
              {t("sidebar.section.manuscript")}
            </div>
            
            {/* List */}
            {chapters.map((chapter) => (
              <div
                key={chapter.id}
                onClick={() => onSelectChapter(chapter.id)}
                className={cn(
                  "flex items-center px-4 py-2 cursor-pointer text-sm transition-colors mx-2 rounded-full mb-1",
                  activeChapterId === chapter.id
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 font-medium"
                    : "text-[#444746] dark:text-[#c4c7c5] hover:bg-black/5 dark:hover:bg-white/5"
                )}
              >
                <span className="truncate">
                  {chapter.order}. {chapter.title}
                </span>
              </div>
            ))}
            
            {/* Add Button */}
            <button
                onClick={onAddChapter}
                className="flex items-center mx-4 mt-2 px-3 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full w-fit transition-colors"
            >
                <Plus className="w-3 h-3 mr-1" />
                {t("sidebar.addChapter")}
            </button>
      </div>
    </div>
  );
}
