import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@renderer/lib/utils";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { WORLD_GRAPH_ICON_MAP, WORLD_GRAPH_MINIMAP_COLORS } from "@shared/constants/worldGraphUI";
import { SidebarTreeSection } from "./SidebarTreeSection";

const DISPLAY_ORDER = ["Character", "Place", "Faction", "Event", "Concept", "Rule", "Item", "Term", "WorldEntity"] as const;

export function EntitySidebarContent() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");

  const graphData = useWorldBuildingStore((s) => s.graphData);
  const selectedNodeId = useWorldBuildingStore((s) => s.selectedNodeId);
  const selectNode = useWorldBuildingStore((s) => s.selectNode);

  const grouped = useMemo(() => {
    const nodes = graphData?.nodes ?? [];
    const q = search.trim().toLowerCase();
    const filtered = q
      ? nodes.filter((n) => n.name.toLowerCase().includes(q))
      : nodes;

    const groups: Record<string, typeof nodes> = {};
    filtered.forEach((node) => {
      const key = node.subType ?? node.entityType;
      if (!groups[key]) groups[key] = [];
      groups[key].push(node);
    });
    return groups;
  }, [graphData, search]);

  const orderedKeys = useMemo(
    () =>
      DISPLAY_ORDER.filter((type) => (grouped[type]?.length ?? 0) > 0),
    [grouped],
  );

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="px-3 pt-2 pb-3">
        <div className="relative flex items-center">
          <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("world.graph.ide.sidebar.search", "엔티티 검색...")}
            className="w-full rounded-md border border-transparent bg-element/60 py-1.5 pl-8 pr-3 text-[12px] text-fg placeholder:text-muted-foreground/50 outline-none focus:border-border/60 focus:bg-element transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {orderedKeys.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-[12px] text-muted-foreground/50">
              {graphData ? "엔티티가 없습니다" : "로딩 중..."}
            </p>
          </div>
        ) : (
          orderedKeys.map((type) => {
            const nodes = grouped[type] ?? [];
            const Icon = WORLD_GRAPH_ICON_MAP[type] ?? WORLD_GRAPH_ICON_MAP["WorldEntity"];
            const color = WORLD_GRAPH_MINIMAP_COLORS[type] ?? "#94a3b8";
            return (
              <SidebarTreeSection
                key={type}
                title={t(`world.graph.entityTypes.${type}`, { defaultValue: type })}
              >
                {nodes.map((node) => {
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
                      <Icon
                        className="h-[13px] w-[13px] shrink-0"
                        strokeWidth={1.8}
                        style={{ color }}
                      />
                      <span className="flex-1 truncate">{node.name}</span>
                    </button>
                  );
                })}
              </SidebarTreeSection>
            );
          })
        )}
      </div>
    </div>
  );
}
