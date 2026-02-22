import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";

import { useChapterManagement } from "../../hooks/useChapterManagement";
import SidebarChapterList from "./sections/SidebarChapterList";

export default function DocsSidebar({
  hideHeader = false,
}: { hideHeader?: boolean }) {
  const { t } = useTranslation();
  const { handleAddChapter } = useChapterManagement();

  return (
    <div className="flex flex-col h-full bg-background text-foreground relative">

      {/* Header */}
      {!hideHeader && (
        <div className="p-4 flex items-center justify-between shrink-0">
          <h2 className="font-semibold text-sm text-muted-foreground">{t("sidebar.title")}</h2>
          <button
            onClick={() => { void handleAddChapter(); }}
            className="w-6 h-6 rounded-md hover:bg-muted/50 flex items-center justify-center transition-colors text-muted-foreground"
            title={t("sidebar.action.new")}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}

      <SidebarChapterList />

      {/* Add Button - Floating or subtle at bottom? Docs doesn't have "Add Chapter", but we need it. Keep it subtle. */}
      <button
        onClick={() => { void handleAddChapter(); }}
        className="flex items-center mx-4 mt-4 mb-4 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/10 rounded-full w-fit transition-colors shrink-0"
        title={t("sidebar.addChapter")}
      >
        <Plus className="w-3 h-3 mr-1.5" />
        {t("sidebar.addChapter")}
      </button>
    </div>
  );
}
