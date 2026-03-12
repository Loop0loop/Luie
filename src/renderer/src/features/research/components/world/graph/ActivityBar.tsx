import { useTranslation } from "react-i18next";
import { GitGraph, Clock, StickyNote, Database, Library, Settings } from "lucide-react";
import { useGraphIdeStore, type GraphIdeTab } from "@renderer/features/research/stores/graphIdeStore";
import clsx from "clsx";

const NAV_ITEMS: { id: GraphIdeTab; icon: React.ElementType; labelKey: string }[] = [
  { id: "graph", icon: GitGraph, labelKey: "world.graph.ide.graph" },
  { id: "timeline", icon: Clock, labelKey: "world.graph.ide.timeline" },
  { id: "note", icon: StickyNote, labelKey: "world.graph.ide.note" },
  { id: "entity", icon: Database, labelKey: "world.graph.ide.entity" },
  { id: "library", icon: Library, labelKey: "world.graph.ide.library" },
];

export function ActivityBar() {
  const { t } = useTranslation();
  const activeTab = useGraphIdeStore((state) => state.activeTab);
  const setActiveTab = useGraphIdeStore((state) => state.setActiveTab);
  const isSidebarOpen = useGraphIdeStore((state) => state.isSidebarOpen);
  const toggleSidebar = useGraphIdeStore((state) => state.toggleSidebar);

  const handleNavClick = (id: GraphIdeTab) => {
    if (activeTab === id) {
      toggleSidebar();
    } else {
      setActiveTab(id);
    }
  };

  return (
    <div className="flex w-[50px] shrink-0 flex-col items-center border-r border-border bg-sidebar py-3 z-10">
      <div className="flex flex-1 flex-col items-center gap-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              title={t(item.labelKey, item.id)}
              className={clsx(
                "group relative flex h-11 w-11 items-center justify-center rounded-lg transition-colors",
                isActive ? "text-fg" : "text-muted hover:text-fg hover:bg-element-hover"
              )}
            >
              <Icon strokeWidth={isActive ? 2.5 : 2} className="h-5 w-5" />
              {isActive && isSidebarOpen && (
                <div className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-md bg-accent" />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-2 mt-auto text-muted">
        {/* 설정 등 추가 확장 가능 영역 */}
      </div>
    </div>
  );
}