import {
  Calendar,
  GitBranch,
  Shield,
  StickyNote,
  User,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@shared/types/utils";
import { DraggableItem } from "@shared/ui/DraggableItem";
import type { DragItemType } from "@shared/ui/GlobalDragContext";
import type { DocsLayoutPanelTab } from "@renderer/shared/constants/layoutSizing";
import { useEditorStore } from "@renderer/domains/editor";

const RESEARCH_RAIL_TABS = [
  {
    dataType: "character",
    icon: User,
    tab: "character",
    titleKey: "research.title.characters",
  },
  {
    dataType: "event",
    icon: Calendar,
    tab: "event",
    titleKey: "research.title.events",
  },
  {
    dataType: "faction",
    icon: Shield,
    tab: "faction",
    titleKey: "research.title.factions",
  },
  {
    dataType: "memo",
    icon: StickyNote,
    tab: "scrap",
    titleKey: "research.title.scrap",
  },
  {
    dataType: "plot",
    icon: GitBranch,
    tab: "plotboard",
    titleKey: "research.title.plotBoard",
  },
  {
    dataType: "mindmap",
    icon: Workflow,
    tab: "untitled",
    titleKey: "research.title.untitled",
  },
] as const satisfies ReadonlyArray<{
  dataType: DragItemType;
  icon: LucideIcon;
  tab: DocsLayoutPanelTab;
  titleKey: string;
}>;

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
        "z-10 flex h-full w-14 shrink-0 flex-col items-center gap-4 overflow-hidden bg-sidebar pb-4 pt-28",
        enableAnimations
          ? "animate-in slide-in-from-right fade-in duration-180"
          : "transition-none",
      )}
    >
      {RESEARCH_RAIL_TABS.map((tab) => {
        const title = t(tab.titleKey);
        const isActive = activeRightTab === tab.tab;
        return (
          <DraggableItem
            key={tab.tab}
            id={`docs-rail-${tab.tab}`}
            data={{ type: tab.dataType, id: tab.tab, title }}
          >
            <button
              onClick={() => onSelectTab(tab.tab)}
              className={cn(
                "relative flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-fg",
                isActive && "bg-accent/15 text-accent",
              )}
              aria-label={title}
              aria-pressed={isActive}
              title={title}
            >
              {/* NOTE: 색상만으로 활성 상태를 표시하지 않는다. 아이콘 두께 변화 + 좌측
                  인디케이터 바로 형태 신호를 함께 준다. */}
              <tab.icon className="h-5 w-5" strokeWidth={isActive ? 2.25 : 1.75} />
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute -left-1 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent"
                />
              )}
            </button>
          </DraggableItem>
        );
      })}
    </div>
  );
}
