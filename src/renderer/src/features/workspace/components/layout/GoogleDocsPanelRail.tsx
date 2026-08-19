import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@shared/types/utils";
import { DraggableItem } from "@shared/ui/DraggableItem";
import type { DocsLayoutPanelTab } from "@renderer/shared/constants/layoutSizing";
import { useEditorStore } from "@renderer/domains/editor";
import { RESEARCH_PANEL_TABS } from "@renderer/features/workspace/components/researchPanelTabs";

type GoogleDocsPanelRailProps = {
  activeRightTab: DocsLayoutPanelTab | null;
  onSelectTab: (tab: DocsLayoutPanelTab) => void;
};

export function GoogleDocsPanelRail({
  activeRightTab,
  onSelectTab,
}: GoogleDocsPanelRailProps) {
  const { t } = useTranslation();
  const enableAnimations = useEditorStore((state) => state.enableAnimations);

  return (
    <div
      className={cn(
        "z-10 flex h-full w-14 shrink-0 flex-col items-center gap-4 overflow-hidden bg-app py-4",
        enableAnimations
          ? "animate-in slide-in-from-right fade-in duration-180"
          : "transition-none",
      )}
    >
      {RESEARCH_PANEL_TABS.map((tab) => {
        const title = t(tab.titleKey);
        return (
          <DraggableItem
            key={tab.id}
            id={`binder-icon-${tab.tab}`}
            data={{ type: tab.dataType, id: tab.id, title }}
          >
            <button
              onClick={() => onSelectTab(tab.tab as DocsLayoutPanelTab)}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-fg",
                activeRightTab === tab.tab && "bg-accent/15 text-accent",
              )}
              aria-label={title}
              title={title}
            >
              <tab.icon className="h-5 w-5" />
            </button>
          </DraggableItem>
        );
      })}

      <div className="mt-auto">
        <button
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-fg"
          aria-label={t("menu.extensions")}
          title={t("menu.extensions")}
        >
          <Plus className="h-5 w-5 text-muted" />
        </button>
      </div>
    </div>
  );
}
