import { useTranslation } from "react-i18next";
import { Network, Clock, FileText, Database, Library, Settings } from "lucide-react";
import { useGraphIdeStore, type GraphIdeTab } from "@renderer/features/research/stores/graphIdeStore";
import { Button } from "@renderer/components/ui/button";
import { cn } from "@renderer/lib/utils";

const NAV_ITEMS: { id: GraphIdeTab; icon: React.ElementType; labelKey: string }[] = [
  { id: "graph", icon: Network, labelKey: "world.graph.ide.graph" },
  { id: "timeline", icon: Clock, labelKey: "world.graph.ide.timeline" },
  { id: "note", icon: FileText, labelKey: "world.graph.ide.note" },
  { id: "entity", icon: Database, labelKey: "world.graph.ide.entity" },
  { id: "library", icon: Library, labelKey: "world.graph.ide.library" },
];

export function ActivityBar() {
  const { t } = useTranslation();
  const activeTab = useGraphIdeStore((state) => state.activeTab);
  const setActiveTab = useGraphIdeStore((state) => state.setActiveTab);
  const toggleSidebar = useGraphIdeStore((state) => state.toggleSidebar);

  const handleNavClick = (id: GraphIdeTab) => {
    if (activeTab === id) {
      toggleSidebar();
    } else {
      setActiveTab(id);
    }
  };

  return (
    <aside className="relative z-10 flex w-16 shrink-0 flex-col items-center bg-transparent py-3">
      <div className="flex flex-1 flex-col items-center gap-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <Button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              title={t(item.labelKey, item.id)}
              variant="ghost"
              size="icon"
              className={cn(
                "h-9 w-9 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                isActive && "bg-accent text-accent-foreground"
              )}
            >
              <Icon strokeWidth={isActive ? 2.5 : 2} className="h-5 w-5" />
            </Button>
          );
        })}
      </div>

      <div className="mt-auto flex flex-col items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title={t("world.graph.ide.settings", "Settings")}
          className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <Settings strokeWidth={2} className="h-5 w-5" />
        </Button>
      </div>
    </aside>
  );
}
