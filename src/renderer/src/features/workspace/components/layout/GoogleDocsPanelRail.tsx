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
import { useEditorStore } from "@renderer/features/editor/stores/editorStore";
import { useAnimatedPresence } from "@renderer/features/workspace/hooks/useAnimatedPresence";

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
  const enableAnimations = useEditorStore((state) => state.enableAnimations);
  const { isExiting, shouldRender } = useAnimatedPresence(isOpen, {
    durationMs: 180,
    enabled: enableAnimations,
  });

  if (!shouldRender) return null;

  return (
    <div
      className={cn(
        "z-10 flex h-full w-14 shrink-0 flex-col items-center gap-4 overflow-hidden border-l border-border bg-background py-4",
        enableAnimations
          ? isExiting
            ? "animate-out slide-out-to-right fade-out duration-180"
            : "animate-in slide-in-from-right fade-in duration-180"
          : "transition-none",
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
  );
}
