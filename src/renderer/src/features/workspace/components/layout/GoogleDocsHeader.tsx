import { BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@shared/types/utils";
import type { DocsLayoutPanelTab } from "@renderer/shared/constants/layoutSizing";

type GoogleDocsHeaderProps = {
  activeChapterId?: string;
  activeChapterTitle?: string;
  activeRightTab: DocsLayoutPanelTab | null;
  onOpenSettings: () => void;
  onRenameChapter?: (id: string, title: string) => void;
  onRightTabClick: (tab: DocsLayoutPanelTab) => void;
  reserveTrafficLightsSpace?: boolean;
};

function DocsHeaderMenuButton(props: {
  active?: boolean;
  onClick: () => void;
  label: string;
}) {
  const { active = false, onClick, label } = props;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active || undefined}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-control px-2 text-xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        active && "text-accent",
      )}
      title={label}
    >
      <span>{label}</span>
    </button>
  );
}

export function GoogleDocsHeader({
  activeChapterId,
  activeChapterTitle,
  activeRightTab,
  onOpenSettings,
  onRenameChapter,
  onRightTabClick,
  reserveTrafficLightsSpace = false,
}: GoogleDocsHeaderProps) {
  const { t } = useTranslation();

  return (
    <header className="flex min-h-[88px] shrink-0 select-none items-center bg-app px-4 py-2 transition-colors duration-200">
      {/* NOTE: traffic lights 예약 마진은 사이드바 slide transition(200ms)과 함께
          보간되어야 헤더가 왼쪽 끝에서 튀지 않는다. 애니메이션 off 시 전역 CSS가
          transition을 무효화한다. */}
      <div
        className={cn(
          "-translate-y-1 flex min-w-0 items-start gap-1 transition-[margin-left] duration-200 ease-[cubic-bezier(0.2,0,0,1)]",
          reserveTrafficLightsSpace && "ml-[70px]",
        )}
      >
        <div
          className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-control text-accent transition-colors hover:bg-surface-hover"
          title={t("home")}
        >
          <BookOpen className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <input
            type="text"
            value={activeChapterTitle || ""}
            onChange={(event) => {
              if (activeChapterId && onRenameChapter) {
                onRenameChapter(activeChapterId, event.target.value);
              }
            }}
            placeholder={t("project.defaults.untitled")}
            className="max-w-[400px] min-w-[150px] truncate rounded-[4px] border border-transparent bg-transparent px-1 py-0.5 text-[18px] text-fg transition-colors duration-150 hover:bg-surface-hover focus:bg-app focus:outline-none focus:ring-2 focus:ring-accent"
          />

          <nav
            aria-label={t("project.defaults.untitled")}
            className="mt-1 flex items-center gap-1"
          >
            <DocsHeaderMenuButton
              active={activeRightTab === "snapshot"}
              onClick={() => onRightTabClick("snapshot")}
              label={t("sidebar.section.snapshot")}
            />
            <DocsHeaderMenuButton
              active={activeRightTab === "trash"}
              onClick={() => onRightTabClick("trash")}
              label={t("sidebar.section.trash")}
            />
            <DocsHeaderMenuButton
              active={activeRightTab === "analysis"}
              onClick={() => onRightTabClick("analysis")}
              label={t("ai.sidePanel.view")}
            />
            <DocsHeaderMenuButton
              onClick={onOpenSettings}
              label={t("sidebar.section.settings")}
            />
          </nav>
        </div>
      </div>
    </header>
  );
}
