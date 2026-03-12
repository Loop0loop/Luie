import { useTranslation } from "react-i18next";
import { Network, User, Calendar, Plus, Map, Clock } from "lucide-react";
import { useWorldBuildingStore, type WorldViewMode } from "@renderer/features/research/stores/worldBuildingStore";
import { cn } from "@shared/types/utils";

export function WorldGraphActivityBar() {
  const { t } = useTranslation();
  const viewMode = useWorldBuildingStore((state) => state.viewMode);
  const setViewMode = useWorldBuildingStore((state) => state.setViewMode);
  
  const isTimelineOpen = useWorldBuildingStore((state) => state.isTimelineOpen);
  const toggleTimeline = useWorldBuildingStore((state) => state.toggleTimeline);
  
  const isMapOpen = useWorldBuildingStore((state) => state.isMapOpen);
  const toggleMap = useWorldBuildingStore((state) => state.toggleMap);

  const activities: { id: WorldViewMode; icon: React.ElementType; label: string }[] = [
    { id: "standard", icon: Network, label: t("world.graph.mode.standard", "Standard") },
    { id: "protagonist", icon: User, label: t("world.graph.mode.protagonist", "Protagonist Focus") },
    { id: "event-chain", icon: Calendar, label: t("world.graph.mode.eventChain", "Event Focus") },
    { id: "freeform", icon: Plus, label: t("world.graph.mode.freeform", "Freeform") },
  ];

  return (
    <div className="w-12 h-full flex flex-col items-center py-2 bg-sidebar border-r border-border shrink-0 select-none">
      <div className="flex-1 flex flex-col gap-2 w-full px-1">
        {activities.map((activity) => (
          <button
            key={activity.id}
            onClick={() => setViewMode(activity.id)}
            title={activity.label}
            className={cn(
              "p-2 rounded-xl flex items-center justify-center transition-colors relative group w-full",
              viewMode === activity.id
                ? "text-accent"
                : "text-muted hover:text-fg hover:bg-surface-hover"
            )}
          >
            <activity.icon size={22} strokeWidth={viewMode === activity.id ? 2.5 : 2} />
            {viewMode === activity.id && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-2/3 bg-accent rounded-r-sm" />
            )}
          </button>
        ))}
      </div>
      
      {/* Bottom Toggles for Map and Timeline */}
      <div className="mt-auto flex flex-col gap-2 w-full px-1 pb-2 border-t border-border pt-2">
        <button
          onClick={toggleMap}
          title={t("world.map.title", "Map View")}
          className={cn(
            "p-2 rounded-xl flex items-center justify-center transition-colors w-full",
            isMapOpen ? "bg-accent/20 text-accent" : "text-muted hover:text-fg hover:bg-surface-hover"
          )}
        >
          <Map size={22} strokeWidth={isMapOpen ? 2.5 : 2} />
        </button>
        <button
          onClick={toggleTimeline}
          title={t("world.timeline.title", "Timeline View")}
          className={cn(
            "p-2 rounded-xl flex items-center justify-center transition-colors w-full",
            isTimelineOpen ? "bg-accent/20 text-accent" : "text-muted hover:text-fg hover:bg-surface-hover"
          )}
        >
          <Clock size={22} strokeWidth={isTimelineOpen ? 2.5 : 2} />
        </button>
      </div>
    </div>
  );
}
