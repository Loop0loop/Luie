import { useState } from 'react';
import { useTranslation } from "react-i18next";
import { cn } from "../../../../shared/types/utils";
import type { Chapter } from "../../../../shared/types";
import { 
  FileText, 
  BookOpen, 
  History, 
  Trash2, 
  Plus
} from "lucide-react";
import { SnapshotList } from "../snapshot/SnapshotList";
import { TrashList } from "../trash/TrashList";

interface DocsSidebarProps {
  chapters: Chapter[];
  activeChapterId?: string;
  onSelectChapter: (id: string) => void;
  onAddChapter: () => void;
  onSelectResearchItem: (type: "character" | "world" | "scrap" | "analysis") => void;
  currentProjectId?: string;
}

type Tab = "manuscript" | "research" | "snapshot" | "trash";

export default function DocsSidebar({
  chapters,
  activeChapterId,
  onSelectChapter,
  onAddChapter,
  onSelectResearchItem,
  currentProjectId
}: DocsSidebarProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("manuscript");
  const [trashRefreshKey, setTrashRefreshKey] = useState(0);

  const tabs = [
    { id: "manuscript", icon: FileText, label: t("sidebar.section.manuscript") },
    { id: "research", icon: BookOpen, label: t("sidebar.section.research") },
    { id: "snapshot", icon: History, label: t("sidebar.section.snapshot") },
    { id: "trash", icon: Trash2, label: t("sidebar.section.trash") },
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1e1e1e] text-fg">
      {/* 1. Tabs Header */}
      <div className="flex items-center border-b border-border/50 bg-[#f9fbfd] dark:bg-[#2d2d2d]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={cn(
              "flex-1 flex items-center justify-center py-2.5 text-muted hover:text-fg hover:bg-black/5 dark:hover:bg-white/5 transition-colors relative",
              activeTab === tab.id && "text-blue-600 dark:text-blue-400 font-medium"
            )}
            title={tab.label}
          >
            <tab.icon className="w-4 h-4" />
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
            )}
          </button>
        ))}
      </div>

      {/* 2. Content Area */}
      <div className="flex-1 overflow-y-auto py-2">
        {activeTab === "manuscript" && (
          <div className="flex flex-col">
            <div className="px-4 py-2 text-xs font-semibold text-muted uppercase tracking-wider mb-1">
              {t("sidebar.section.manuscript")}
            </div>
            {chapters.map((chapter) => (
              <div
                key={chapter.id}
                onClick={() => onSelectChapter(chapter.id)}
                className={cn(
                  "flex items-center px-4 py-1.5 cursor-pointer text-sm transition-colors border-l-2 border-transparent",
                  activeChapterId === chapter.id
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-600 dark:border-blue-400 font-medium"
                    : "text-fg hover:bg-black/5 dark:hover:bg-white/5"
                )}
              >
                <span className="truncate">
                  {chapter.order}. {chapter.title}
                </span>
              </div>
            ))}
            <button
                onClick={onAddChapter}
                className="flex items-center mx-4 mt-2 px-3 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full w-fit transition-colors"
            >
                <Plus className="w-3 h-3 mr-1" />
                {t("sidebar.addChapter")}
            </button>
          </div>
        )}

        {activeTab === "research" && (
          <div className="flex flex-col">
             <div className="px-4 py-2 text-xs font-semibold text-muted uppercase tracking-wider mb-1">
              {t("sidebar.section.research")}
            </div>
            {[
                { id: "character", label: t("sidebar.item.characters") },
                { id: "world", label: t("sidebar.item.world") },
                { id: "scrap", label: t("sidebar.item.scrap") },
                { id: "analysis", label: t("research.title.analysis") }
            ].map(item => (
                <div
                    key={item.id}
                    onClick={() => onSelectResearchItem(item.id as "character" | "world" | "scrap" | "analysis")}
                    className="flex items-center px-4 py-2 cursor-pointer text-sm text-fg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                    <span className="truncate">{item.label}</span>
                </div>
            ))}
          </div>
        )}

        {activeTab === "snapshot" && (
            <div className="flex flex-col h-full">
                <div className="px-4 py-2 text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                    {t("sidebar.section.snapshot")}
                </div>
                {activeChapterId ? (
                    <SnapshotList chapterId={activeChapterId} />
                ) : (
                    <div className="px-4 py-4 text-xs text-muted italic text-center">
                        {t("sidebar.snapshotEmpty")}
                    </div>
                )}
            </div>
        )}

        {activeTab === "trash" && (
            <div className="flex flex-col h-full">
                 <div className="flex items-center justify-between px-4 py-2 mb-1">
                    <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                        {t("sidebar.section.trash")}
                    </span>
                    <button 
                        onClick={() => setTrashRefreshKey(k => k + 1)} 
                        className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded"
                        title={t("sidebar.tooltip.refresh")}
                    >
                        <History className="w-3 h-3 text-muted" />
                    </button>
                </div>
                {currentProjectId ? (
                    <TrashList projectId={currentProjectId} refreshKey={trashRefreshKey} />
                ) : (
                    <div className="px-4 py-4 text-xs text-muted italic text-center">
                        {t("sidebar.trashEmpty")}
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
}
