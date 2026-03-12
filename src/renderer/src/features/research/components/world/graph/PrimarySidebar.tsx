import { useTranslation } from "react-i18next";
import { useGraphIdeStore } from "@renderer/features/research/stores/graphIdeStore";
import { GraphSidebarContent } from "./sidebars/GraphSidebarContent";
import { TimelineSidebarContent } from "./sidebars/TimelineSidebarContent";
import { NoteSidebarContent } from "./sidebars/NoteSidebarContent";
import { EntitySidebarContent } from "./sidebars/EntitySidebarContent";
import { LibrarySidebarContent } from "./sidebars/LibrarySidebarContent";

export function PrimarySidebar() {
  const { t } = useTranslation();
  const activeTab = useGraphIdeStore((state) => state.activeTab);

  const renderContent = () => {
    switch (activeTab) {
      case "graph":
        return <GraphSidebarContent />;
      case "timeline":
        return <TimelineSidebarContent />;
      case "note":
        return <NoteSidebarContent />;
      case "entity":
        return <EntitySidebarContent />;
      case "library":
        return <LibrarySidebarContent />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-sidebar">
      <div className="flex h-[40px] items-center px-4 font-bold text-[10px] tracking-wider uppercase text-fg shrink-0 border-b border-border/40">
        {t(`world.graph.ide.title.${activeTab}`, activeTab)}
      </div>
      <div className="flex-1 overflow-y-auto">
        {renderContent()}
      </div>
    </div>
  );
}