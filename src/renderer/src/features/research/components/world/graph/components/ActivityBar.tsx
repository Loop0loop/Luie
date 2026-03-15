import { useTranslation } from "react-i18next";
import { Network, Clock, StickyNote, Users, Archive, Settings } from "lucide-react";
import { useWorldGraphUiStore, type GraphIdeTab } from "@renderer/features/research/stores/worldGraphUiStore";
import { cn } from "@renderer/lib/utils";

const NAV_ITEMS: { id: GraphIdeTab; icon: React.ElementType; label: string; labelKey: string }[] = [
  { id: "graph",    icon: Network,    label: "Graph",    labelKey: "world.graph.ide.graph" },
  { id: "timeline", icon: Clock,      label: "Timeline", labelKey: "world.graph.ide.timeline" },
  { id: "note",     icon: StickyNote, label: "Notes",    labelKey: "world.graph.ide.note" },
  { id: "entity",   icon: Users,      label: "Entity",   labelKey: "world.graph.ide.entity" },
  { id: "library",  icon: Archive,    label: "Library",  labelKey: "world.graph.ide.library" },
];

export function ActivityBar() {
  const { t } = useTranslation();
  const activeTab = useWorldGraphUiStore((state) => state.activeTab);
  const setActiveTab = useWorldGraphUiStore((state) => state.setActiveTab);
  const toggleSidebar = useWorldGraphUiStore((state) => state.toggleSidebar);

  const handleNavClick = (id: GraphIdeTab) => {
    if (activeTab === id) {
      toggleSidebar();
    } else {
      setActiveTab(id);
    }
  };

  return (
    <aside className="relative z-10 flex w-13 shrink-0 flex-col items-center border-r border-border/30 bg-sidebar py-2">
      <div className="flex flex-1 flex-col items-center gap-0.5 w-full px-1.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              title={t(item.labelKey, item.label)}
              className={cn(
                "relative flex w-full flex-col items-center gap-0.5 rounded-lg py-2 px-1 transition-all duration-150 outline-none",
                isActive
                  ? "text-fg"
                  : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-element/60",
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-accent" />
              )}
              {isActive && (
                <span className="absolute inset-0 rounded-lg bg-accent/10" />
              )}
              <Icon
                strokeWidth={isActive ? 2 : 1.8}
                className={cn(
                  "relative h-4.25 w-4.25 transition-colors",
                  isActive ? "text-accent" : "text-current",
                )}
              />
              <span
                className={cn(
                  "relative text-[9px] font-medium leading-none tracking-wide",
                  isActive ? "text-accent" : "text-current",
                )}
              >
                {t(item.labelKey, item.label)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col items-center w-full px-1.5 pb-1">
        <button
          type="button"
          title={t("world.graph.ide.settings", "Settings")}
          className="flex w-full flex-col items-center gap-0.5 rounded-lg py-2 px-1 text-muted-foreground/40 hover:text-muted-foreground hover:bg-element/60 transition-all duration-150 outline-none"
        >
          <Settings strokeWidth={1.6} className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
