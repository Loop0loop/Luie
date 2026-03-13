import { useTranslation } from "react-i18next";
import { useGraphIdeStore } from "@renderer/features/research/stores/graphIdeStore";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import { GraphSidebarContent } from "./sidebars/GraphSidebarContent";
import { TimelineSidebarContent } from "./sidebars/TimelineSidebarContent";
import { NoteSidebarContent } from "./sidebars/NoteSidebarContent";
import { EntitySidebarContent } from "./sidebars/EntitySidebarContent";
import { LibrarySidebarContent } from "./sidebars/LibrarySidebarContent";

const TAB_META = {
  graph: {
    titleKey: "world.graph.ide.title.graph",
    fallbackTitle: "Graph Workspace",
  },
  timeline: {
    titleKey: "world.graph.ide.title.timeline",
    fallbackTitle: "Timeline",
  },
  note: {
    titleKey: "world.graph.ide.title.note",
    fallbackTitle: "Notes & Docs",
  },
  entity: {
    titleKey: "world.graph.ide.title.entity",
    fallbackTitle: "Entities",
  },
  library: {
    titleKey: "world.graph.ide.title.library",
    fallbackTitle: "Library",
  },
} as const;

export function PrimarySidebar() {
  const { t } = useTranslation();
  const activeTab = useGraphIdeStore((state) => state.activeTab);
  const tabMeta = TAB_META[activeTab];

  const renderContent = () => {
    switch (activeTab) {
      case "graph": return <GraphSidebarContent />;
      case "timeline": return <TimelineSidebarContent />;
      case "note": return <NoteSidebarContent />;
      case "entity": return <EntitySidebarContent />;
      case "library": return <LibrarySidebarContent />;
      default: return null;
    }
  };

  return (
    <div className="flex h-full w-[260px] flex-col bg-sidebar text-foreground transition-colors overflow-hidden">
      
      {/* 
        Professional Header: 
        A subtle un-bordered workspace title, clean, slight padding.
      */}
      <div className="flex shrink-0 items-center justify-between px-4 h-[48px] bg-transparent">
        <h2 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground/80 cursor-default select-none">
          {t(tabMeta.titleKey, tabMeta.fallbackTitle)}
        </h2>
      </div>

      {/* Content Area */}
      <ScrollArea className="flex-1">
        <div className="pb-8">
          {renderContent()}
        </div>
      </ScrollArea>
    </div>
  );
}
