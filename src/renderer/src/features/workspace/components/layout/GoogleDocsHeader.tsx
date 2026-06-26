import type { ComponentType } from "react";
import { BookOpen, ChevronLeft, History, Settings, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@shared/types/utils";
import type { DocsLayoutPanelTab } from "@renderer/shared/constants/layoutSizing";

type GoogleDocsHeaderProps = {
  activeChapterId?: string;
  activeChapterTitle?: string;
  activeRightTab: DocsLayoutPanelTab | null;
  isSidebarOpen: boolean;
  onOpenSettings: () => void;
  onRenameChapter?: (id: string, title: string) => void;
  onRightTabClick: (tab: DocsLayoutPanelTab) => void;
  onToggleSidebar: (open: boolean) => void;
};

function DocsHeaderIconButton(props: {
  active?: boolean;
  icon: ComponentType<{ className?: string }>;
  onClick: () => void;
  title: string;
}) {
  const { active = false, icon: Icon, onClick, title } = props;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-hover",
        active && "bg-accent/10 text-accent",
      )}
      title={title}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}

export function GoogleDocsHeader({
  activeChapterId,
  activeChapterTitle,
  activeRightTab,
  isSidebarOpen,
  onOpenSettings,
  onRenameChapter,
  onRightTabClick,
  onToggleSidebar,
}: GoogleDocsHeaderProps) {
  const { t } = useTranslation();

  return (
    <header className="flex h-[64px] shrink-0 select-none items-center justify-between bg-app px-4 transition-colors duration-200">
      <div className="flex min-w-0 items-center gap-3">
        {isSidebarOpen && (
          <button
            onClick={() => onToggleSidebar(false)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-hover"
            title={t("sidebar.toggle.close")}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        <div
          className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-control text-accent transition-colors hover:bg-surface-hover"
          title={t("home")}
        >
          <BookOpen className="h-5 w-5" />
        </div>

        <input
          type="text"
          value={activeChapterTitle || ""}
          onChange={(event) => {
            if (activeChapterId && onRenameChapter) {
              onRenameChapter(activeChapterId, event.target.value);
            }
          }}
          placeholder={t("project.defaults.untitled")}
          className="max-w-[400px] min-w-[150px] truncate rounded-[4px] border border-transparent bg-transparent px-2 py-0.5 text-[18px] text-fg transition-colors duration-150 hover:bg-surface-hover focus:bg-app focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <DocsHeaderIconButton
          active={activeRightTab === "snapshot"}
          icon={History}
          onClick={() => onRightTabClick("snapshot")}
          title={t("sidebar.section.snapshot")}
        />
        <DocsHeaderIconButton
          active={activeRightTab === "trash"}
          icon={Trash2}
          onClick={() => onRightTabClick("trash")}
          title={t("sidebar.section.trash")}
        />
        <DocsHeaderIconButton
          icon={Settings}
          onClick={onOpenSettings}
          title={t("sidebar.section.settings")}
        />
      </div>
    </header>
  );
}
