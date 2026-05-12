import { Network, CalendarRange, StickyNote, Users, Puzzle, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { GraphIdeTab } from "@renderer/features/research/stores/worldGraphUiStore";
import { cn } from "@renderer/lib/utils";

const TAB_ICON_MAP: Record<GraphIdeTab, React.ElementType> = {
  canvas: Network,
  timeline: CalendarRange,
  notes: StickyNote,
  entity: Users,
  plugins: Puzzle,
};

interface CanvasNavRailProps {
  activeTab: GraphIdeTab;
  onSelectTab: (tab: GraphIdeTab) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const TABS: GraphIdeTab[] = ["canvas", "timeline", "notes", "entity", "plugins"];

export function CanvasNavRail({ activeTab, onSelectTab, onRefresh, isRefreshing }: CanvasNavRailProps) {
  const { t } = useTranslation();

  return (
    <div className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-border/40 bg-sidebar/60 py-3">
      {TABS.map((tab) => {
        const Icon = TAB_ICON_MAP[tab];
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            type="button"
            title={t(`canvas.tab.${tab}`)}
            onClick={() => onSelectTab(tab)}
            className={cn(
              "group relative flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-150",
              isActive
                ? "bg-element text-fg shadow-sm"
                : "text-muted hover:bg-element/60 hover:text-fg",
            )}
          >
            <Icon size={16} strokeWidth={isActive ? 2 : 1.5} />
            {isActive && (
              <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r bg-fg/70" />
            )}
          </button>
        );
      })}

      <div className="mt-auto">
        <button
          type="button"
          title={t("canvas.action.refresh")}
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-element/60 hover:text-fg disabled:opacity-40"
        >
          <RefreshCw size={13} className={cn(isRefreshing && "animate-spin")} />
        </button>
      </div>
    </div>
  );
}
