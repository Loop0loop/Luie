import { useMemo } from "react";
import { CalendarDays, Users, Layers } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@renderer/lib/utils";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { SidebarTreeSection } from "./SidebarTreeSection";

export function TimelineSidebarContent() {
  const { t } = useTranslation();

  const graphData = useWorldBuildingStore((s) => s.graphData);
  const selectedNodeId = useWorldBuildingStore((s) => s.selectedNodeId);
  const selectNode = useWorldBuildingStore((s) => s.selectNode);

  const { events, characters } = useMemo(() => {
    const nodes = graphData?.nodes ?? [];
    return {
      events: nodes.filter((n) => n.entityType === "Event"),
      characters: nodes.filter((n) => n.entityType === "Character"),
    };
  }, [graphData]);

  const renderNodeItem = (node: (typeof events)[0]) => {
    const isActive = selectedNodeId === node.id;
    return (
      <button
        key={node.id}
        type="button"
        onClick={() => selectNode(node.id)}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-[5px] text-left text-[12px] transition-all",
          isActive
            ? "bg-accent/10 text-accent font-medium"
            : "text-fg/80 hover:bg-element/80",
        )}
      >
        <span className="flex-1 truncate">{node.name}</span>
      </button>
    );
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Events */}
      <SidebarTreeSection
        title={t("world.graph.ide.sidebar.timeline.events", "Events")}
        actionIcon={<CalendarDays className="h-3.5 w-3.5" />}
      >
        {events.length === 0 ? (
          <p className="px-2 py-1.5 text-[11px] text-muted-foreground/50">사건이 없습니다</p>
        ) : (
          events.map(renderNodeItem)
        )}
      </SidebarTreeSection>

      {/* Characters */}
      <SidebarTreeSection
        title={t("world.graph.ide.sidebar.timeline.characters", "Characters")}
        actionIcon={<Users className="h-3.5 w-3.5" />}
        defaultExpanded={false}
      >
        {characters.length === 0 ? (
          <p className="px-2 py-1.5 text-[11px] text-muted-foreground/50">캐릭터가 없습니다</p>
        ) : (
          characters.map(renderNodeItem)
        )}
      </SidebarTreeSection>

      {/* Era - Static placeholder */}
      <SidebarTreeSection
        title={t("world.graph.ide.sidebar.timeline.era", "Era")}
        actionIcon={<Layers className="h-3.5 w-3.5" />}
        defaultExpanded={false}
      >
        {["고대", "왕국 시대", "현재"].map((era) => (
          <button
            key={era}
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2 py-[5px] text-left text-[12px] text-fg/60 transition-all hover:bg-element/80 hover:text-fg"
          >
            <span className="flex-1 truncate">{era}</span>
          </button>
        ))}
      </SidebarTreeSection>
    </div>
  );
}
