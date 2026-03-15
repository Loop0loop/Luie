import { useMemo, useCallback, useState } from "react";
import { CircleDashed, Search, LayoutGrid, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@renderer/lib/utils";
import { SidebarTreeSection } from "./SidebarTreeSection";
import type { RelationKind } from "@shared/types";
import { WORLD_GRAPH_ICON_MAP, WORLD_GRAPH_MINIMAP_COLORS } from "@shared/constants/worldGraphUI";
import { useWorldGraphScene } from "../scene/useWorldGraphScene";
import { useGraphVisibility } from "../scene/useGraphVisibility";
import { useWorldGraphUiStore } from "@renderer/features/research/stores/worldGraphUiStore";

export function GraphSidebarContent() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const scene = useWorldGraphScene();
  const triggerLayout = useWorldGraphUiStore((s) => s.triggerLayout);
  const {
    visibilityFilter,
    setGraphSearchQuery,
    toggleEntityTypeFilter,
    toggleRelationKindFilter,
    showAllCanvasElements,
  } = useGraphVisibility();

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setSearch(val);
      setGraphSearchQuery(val);
    },
    [setGraphSearchQuery],
  );

  const { visibleEntityTypes, visibleRelations } = useMemo(() => {
    const typeCounts = new Map<string, number>();
    scene.visibleNodes.forEach((node) => {
      const type = node.subType || node.entityType || "Entity";
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    });

    const relCounts = new Map<string, number>();
    scene.visibleEdges.forEach((edge) => {
      const kind = edge.relation || "연결됨";
      relCounts.set(kind, (relCounts.get(kind) || 0) + 1);
    });

    return {
      visibleEntityTypes: Array.from(typeCounts.entries()).map(([type, count]) => ({ type, count })),
      visibleRelations: Array.from(relCounts.entries()).map(([kind, count]) => ({ kind, count }))
    };
  }, [scene.visibleEdges, scene.visibleNodes]);

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 pt-2 pb-3">
        <div className="relative flex items-center">
          <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground/50" />
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder={t("world.graph.ide.sidebar.search", "노드 검색...")}
            className="w-full rounded-md border border-transparent bg-element/60 py-1.5 pl-8 pr-3 text-[12px] text-fg placeholder:text-muted-foreground/50 outline-none focus:border-border/60 focus:bg-element transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <SidebarTreeSection title={t("world.graph.ide.sidebar.nodes", "Entities")}>
          {visibleEntityTypes.length === 0 ? (
            <p className="px-2 py-2 text-[11px] text-muted-foreground/50">표시할 노드가 없습니다</p>
          ) : (
            visibleEntityTypes.map(({ type, count }) => {
              const isOn = visibilityFilter.entityTypes.includes(type);
              const color = WORLD_GRAPH_MINIMAP_COLORS[type] ?? "#94a3b8";
              const Icon = WORLD_GRAPH_ICON_MAP[type] ?? CircleDashed;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleEntityTypeFilter(type)}
                  className={cn(
                    "group flex w-full items-center gap-2 rounded-md px-2 py-[5px] text-[12px] transition-all",
                    isOn ? "text-fg hover:bg-element/80" : "opacity-35 hover:opacity-60",
                  )}
                >
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                  <Icon className="h-[13px] w-[13px] shrink-0" style={{ color }} />
                  <span className="flex-1 truncate text-left">
                    {t(`world.graph.entityTypes.${type}`, { defaultValue: type })}
                  </span>
                  {count > 0 && (
                    <span className="shrink-0 tabular-nums text-[10px] text-muted-foreground/50">
                      {count}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </SidebarTreeSection>

        <SidebarTreeSection title={t("world.graph.ide.sidebar.relations", "Relations")}>
          {visibleRelations.length === 0 ? (
            <p className="px-2 py-2 text-[11px] text-muted-foreground/50">연결이 없습니다</p>
          ) : (
            visibleRelations.map(({ kind, count }) => {
              const isOn = visibilityFilter.relationKinds.includes(kind as RelationKind);
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => toggleRelationKindFilter(kind as RelationKind)}
                  className={cn(
                    "group flex w-full items-center gap-2 rounded-md px-2 py-[5px] text-[12px] transition-all",
                    isOn ? "text-fg hover:bg-element/80" : "opacity-35 hover:opacity-60",
                  )}
                >
                  <span className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground" />
                  <span className="h-px w-5 shrink-0 rounded bg-border" />
                  <span className="flex-1 truncate text-left">
                    {t(`world.graph.relationTypes.${kind}`, { defaultValue: kind })}
                  </span>
                  {count > 0 && (
                    <span className="shrink-0 tabular-nums text-[10px] text-muted-foreground/50">
                      {count}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </SidebarTreeSection>
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-border/40 p-3 bg-element/30">
        <button
          type="button"
          onClick={() => {
            showAllCanvasElements();
            triggerLayout("auto");
          }}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition-all hover:bg-element hover:text-fg"
        >
          <LayoutGrid size={12} />
          <span>{t("world.graph.ide.sidebar.autoLayout", "자동 정렬")}</span>
        </button>
        <div className="h-4 w-px bg-border/50 mx-2" />
        <button
          type="button"
          onClick={() => triggerLayout("reset")}
          className="flex shrink-0 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition-all hover:bg-element hover:text-fg"
          title={t("world.graph.ide.sidebar.refresh", "새로고침")}
        >
          <RefreshCw size={12} />
        </button>
      </div>
    </div>
  );
}
