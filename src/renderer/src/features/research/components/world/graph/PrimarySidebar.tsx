import { useTranslation } from "react-i18next";
import { GitGraph, Clock, StickyNote, Database, Library } from "lucide-react";
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
    fallbackTitle: "그래프 뷰",
  },
  timeline: {
    titleKey: "world.graph.ide.title.timeline",
    fallbackTitle: "타임라인",
  },
  note: {
    titleKey: "world.graph.ide.title.note",
    fallbackTitle: "노트",
  },
  entity: {
    titleKey: "world.graph.ide.title.entity",
    fallbackTitle: "엔티티",
  },
  library: {
    titleKey: "world.graph.ide.title.library",
    fallbackTitle: "라이브러리",
  },
} as const;

export function PrimarySidebar() {
  const { t } = useTranslation();
  const activeTab = useGraphIdeStore((state) => state.activeTab);
  const tabMeta = TAB_META[activeTab];

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
    <div className="flex h-full w-full flex-col bg-background/50 border-r">
      {/* Header - Simple and minimalistic like Obsidian */}
      <div className="flex shrink-0 items-center px-4 py-3 h-[48px] border-b bg-transparent">
        <h2 className="text-xs font-semibold tracking-wide text-foreground uppercase">
          {t(tabMeta.titleKey, tabMeta.fallbackTitle)}
        </h2>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="px-2 py-3">
          {renderContent()}
        </div>
      </ScrollArea>
    </div>
  );
}
