import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FileText,
  Tags,
  StickyNote,
  History,
  AlertCircle,
} from "lucide-react";
import { useChapterStore } from "../../stores/chapterStore";
import { SnapshotList } from "../snapshot/SnapshotList";
import { cn } from "../../../../shared/types/utils";

interface InspectorPanelProps {
  activeChapterId?: string;
}

type InspectorTab = "synopsis" | "metadata" | "notes" | "snapshots";

export default function InspectorPanel({ activeChapterId }: InspectorPanelProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<InspectorTab>("synopsis");
  const { items: chapters, update } = useChapterStore();

  const activeChapter = chapters.find((c) => c.id === activeChapterId);

  const [synopsis, setSynopsis] = useState(activeChapter?.synopsis || "");

  const handleSynopsisChange = (val: string) => {
    setSynopsis(val);
  };

  const handleSynopsisBlur = () => {
    if (activeChapterId && activeChapter && synopsis !== activeChapter.synopsis) {
      update({ id: activeChapterId, synopsis });
    }
  };

  if (!activeChapterId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted p-4 text-center">
        <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">{t("inspector.noSelection")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-panel border-l border-border/50 text-sm">
      {/* 1. Header Tabs */}
      <div className="flex items-center justify-around border-b border-border/50 bg-surface/50 p-1">
        <InspectorTabButton
          icon={<FileText className="w-4 h-4" />}
          isActive={activeTab === "synopsis"}
          onClick={() => setActiveTab("synopsis")}
          title={t("inspector.tab.synopsis")}
        />
        <InspectorTabButton
          icon={<Tags className="w-4 h-4" />}
          isActive={activeTab === "metadata"}
          onClick={() => setActiveTab("metadata")}
          title={t("inspector.tab.metadata")}
        />
        <InspectorTabButton
          icon={<StickyNote className="w-4 h-4" />}
          isActive={activeTab === "notes"}
          onClick={() => setActiveTab("notes")}
          title={t("inspector.tab.notes")}
        />
        <InspectorTabButton
          icon={<History className="w-4 h-4" />}
          isActive={activeTab === "snapshots"}
          onClick={() => setActiveTab("snapshots")}
          title={t("inspector.tab.snapshots")}
        />
      </div>

      {/* 2. Content Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === "synopsis" && (
          <div className="p-4 flex flex-col h-full">
            <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30 rounded-lg p-3 shadow-sm h-64 flex flex-col relative">
                {/* Index Card Style Header */}
                <div className="border-b border-yellow-200 dark:border-yellow-800/30 pb-2 mb-2 font-bold text-center text-foreground/80 truncate">
                    {activeChapter?.title || "Untitled"}
                </div>
                <textarea
                    className="flex-1 w-full bg-transparent border-none resize-none focus:ring-0 text-sm p-0 leading-relaxed placeholder:text-muted-foreground/50"
                    placeholder={t("inspector.synopsis.placeholder")}
                    value={synopsis}
                    onChange={(e) => handleSynopsisChange(e.target.value)}
                    onBlur={handleSynopsisBlur}
                />
            </div>
            
            <div className="mt-6">
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                    {t("inspector.section.image")}
                </h3>
                <div className="aspect-video bg-surface/50 border border-border/50 rounded-lg flex items-center justify-center text-muted border-dashed">
                    <span className="text-xs">{t("inspector.image.placeholder")}</span>
                </div>
            </div>
          </div>
        )}

        {activeTab === "metadata" && (
          <div className="p-4 space-y-6">
             {/* General Info */}
             <div className="space-y-4">
                 <div className="space-y-1">
                     <label className="text-xs font-medium text-muted">{t("inspector.meta.created")}</label>
                     <div className="text-sm font-mono">{activeChapter?.createdAt ? new Date(activeChapter.createdAt).toLocaleString() : "-"}</div>
                 </div>
                 <div className="space-y-1">
                     <label className="text-xs font-medium text-muted">{t("inspector.meta.modified")}</label>
                     <div className="text-sm font-mono">{activeChapter?.updatedAt ? new Date(activeChapter.updatedAt).toLocaleString() : "-"}</div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs font-medium text-muted">{t("inspector.meta.words")}</label>
                    <div className="text-sm font-mono">{activeChapter?.wordCount ?? 0} words</div>
                </div>
             </div>

             <div className="border-t border-border/50 pt-4 space-y-4">
                 <div className="space-y-1">
                     <label className="text-xs font-medium text-muted">{t("inspector.meta.label")}</label>
                     <select className="w-full bg-surface border border-border rounded px-2 py-1 text-sm focus:ring-1 focus:ring-accent">
                         <option>{t("inspector.label.none")}</option>
                         <option>{t("inspector.label.concept")}</option>
                         <option>{t("inspector.label.draft")}</option>
                     </select>
                 </div>
                 <div className="space-y-1">
                     <label className="text-xs font-medium text-muted">{t("inspector.meta.status")}</label>
                     <select className="w-full bg-surface border border-border rounded px-2 py-1 text-sm focus:ring-1 focus:ring-accent">
                         <option>{t("inspector.status.todo")}</option>
                         <option>{t("inspector.status.inprogress")}</option>
                         <option>{t("inspector.status.done")}</option>
                     </select>
                 </div>
             </div>
          </div>
        )}

        {activeTab === "notes" && (
          <div className="p-0 h-full flex flex-col">
            <div className="px-4 py-2 bg-surface/50 border-b border-border/50 text-xs font-medium text-muted">
                {t("inspector.notes.document")}
            </div>
            <textarea
                className="flex-1 w-full p-4 bg-transparent border-none resize-none focus:ring-0 leading-relaxed text-sm"
                placeholder={t("inspector.notes.placeholder")}
            />
          </div>
        )}

        {activeTab === "snapshots" && (
          <div className="h-full flex flex-col">
             <SnapshotList chapterId={activeChapterId} />
          </div>
        )}
      </div>
    </div>
  );
}

function InspectorTabButton({
  icon,
  isActive,
  onClick,
  title,
}: {
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "p-2 rounded transition-colors text-muted-foreground hover:text-foreground",
        isActive && "bg-accent/10 text-accent"
      )}
    >
      {icon}
    </button>
  );
}
