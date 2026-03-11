import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  ChevronLeft,
  Globe,
  Plus,
  Shield,
  Sparkles,
  StickyNote,
  User,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@shared/types/utils";
import { DraggableItem } from "@shared/ui/DraggableItem";
import type { DocsLayoutPanelTab } from "@shared/constants/layoutSizing";
import type { DragItemType } from "@shared/ui/GlobalDragContext";

type RailTabConfig = {
  dataType: DragItemType;
  icon: LucideIcon;
  id: string;
  titleKey: string;
  titleFallback?: string;
  tab: DocsLayoutPanelTab;
};

const RAIL_TABS: RailTabConfig[] = [
  {
    dataType: "character",
    icon: User,
    id: "binder-character",
    titleKey: "research.title.characters",
    tab: "character",
  },
  {
    dataType: "world",
    icon: Globe,
    id: "binder-world",
    titleKey: "research.title.world",
    tab: "world",
  },
  {
    dataType: "event",
    icon: Calendar,
    id: "binder-event",
    titleKey: "research.title.events",
    titleFallback: "Events",
    tab: "event",
  },
  {
    dataType: "faction",
    icon: Shield,
    id: "binder-faction",
    titleKey: "research.title.factions",
    titleFallback: "Factions",
    tab: "faction",
  },
  {
    dataType: "memo",
    icon: StickyNote,
    id: "binder-memo",
    titleKey: "research.title.scrap",
    tab: "scrap",
  },
  {
    dataType: "analysis",
    icon: Sparkles,
    id: "binder-analysis",
    titleKey: "research.title.analysis",
    tab: "analysis",
  },
];

type GoogleDocsPanelRailProps = {
  activeRightTab: DocsLayoutPanelTab | null;
  isOpen: boolean;
  onSelectTab: (tab: DocsLayoutPanelTab) => void;
  onToggleOpen: (open: boolean) => void;
};

export function GoogleDocsPanelRail({
  activeRightTab,
  isOpen,
  onSelectTab,
  onToggleOpen,
}: GoogleDocsPanelRailProps) {
  const { t } = useTranslation();

  return (
    <>
      <div
        className={cn(
          "z-10 flex h-full shrink-0 flex-col items-center gap-4 overflow-hidden border-l border-border bg-background py-4 transition-all duration-300 ease-in-out",
          isOpen ? "w-14 opacity-100" : "w-0 border-l-0 opacity-0",
        )}
      >
        <button
          onClick={() => onToggleOpen(false)}
          className="mb-2 flex h-8 w-full items-center justify-center border-b border-border/50 transition-colors hover:bg-surface-hover"
          title={t("sidebar.toggle.close")}
        >
          <ChevronLeft className="h-4 w-4 rotate-180 text-muted-foreground" />
        </button>

        {RAIL_TABS.map((tab) => {
          const title = tab.titleFallback
            ? t(tab.titleKey, tab.titleFallback)
            : t(tab.titleKey);
          return (
            <DraggableItem
              key={tab.id}
              id={`binder-icon-${tab.tab}`}
              data={{ type: tab.dataType, id: tab.id, title }}
            >
              <button
                onClick={() => onSelectTab(tab.tab)}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-hover hover:text-fg",
                  activeRightTab === tab.tab && "bg-accent/15 text-accent",
                )}
                title={title}
              >
                <tab.icon className="h-5 w-5" />
              </button>
            </DraggableItem>
          );
        })}

        <div className="mt-auto">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-hover hover:text-fg"
            title={t("menu.extensions")}
          >
            <Plus className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {!isOpen && (
        <div className="absolute right-0 top-1/2 z-20 flex -translate-y-1/2 items-center">
          <button
            onClick={() => onToggleOpen(true)}
            className="flex h-12 w-8 cursor-pointer items-center justify-center rounded-l-lg border border-r-0 border-border bg-background text-muted-foreground shadow-md transition-colors hover:bg-surface-hover"
            title={t("sidebar.toggle.open")}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>
      )}
    </>
  );
}
