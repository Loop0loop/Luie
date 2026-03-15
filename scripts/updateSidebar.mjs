import fs from 'fs';

const content = `import { useTranslation } from "react-i18next";
import { useGraphIdeStore } from "@renderer/features/research/stores/graphIdeStore";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import { GraphSidebarContent } from "../sidebars/GraphSidebarContent";
import { TimelineSidebarContent } from "../sidebars/TimelineSidebarContent";
import { NoteSidebarContent } from "../sidebars/NoteSidebarContent";
import { EntitySidebarContent } from "../sidebars/EntitySidebarContent";
import { LibrarySidebarContent } from "../sidebars/LibrarySidebarContent";

const TAB_META = {
  graph: { titleKey: "world.graph.ide.title.graph", fallbackTitle: "Graph Workspace" },
  timeline: { titleKey: "world.graph.ide.title.timeline", fallbackTitle: "Timeline" },
  note: { titleKey: "world.graph.ide.title.note", fallbackTitle: "Notes & Docs" },
  entity: { titleKey: "world.graph.ide.title.entity", fallbackTitle: "Entities" },
  library: { titleKey: "world.graph.ide.title.library", fallbackTitle: "Library" },
} as const;

export function PrimarySidebar() {
  const { t } = useTranslation();
  const activeTab = useGraphIdeStore((state) => state.activeTab);

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
    <div className="flex h-full w-full flex-col bg-background/50 text-foreground overflow-hidden">
      {/* Obsidian-like minimal header */}
      <div className="flex shrink-0 items-center px-4 h-11 border-b border-border/40">
        <h2 className="text-[12px] font-medium text-foreground/80 tracking-wide select-none">
          {t(TAB_META[activeTab].titleKey, TAB_META[activeTab].fallbackTitle)}
        </h2>
      </div>

      <ScrollArea className="flex-1 w-full mx-auto">
        <div className="py-2 w-full max-w-full">
          {renderContent()}
        </div>
      </ScrollArea>
    </div>
  );
}
`;

fs.writeFileSync('/Users/user/Luie/src/renderer/src/features/research/components/world/graph/components/PrimarySidebar.tsx', content);
console.log('writeFileSync completed!');
