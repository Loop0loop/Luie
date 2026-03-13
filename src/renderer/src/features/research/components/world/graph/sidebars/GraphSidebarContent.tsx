import { useMemo, useCallback, useState } from "react";
import {
  Users,
  CalendarDays,
  MapPin,
  Flag,
  Scale,
  Lightbulb,
  Box,
  BookOpen,
  CircleDashed,
  Search,
  LayoutGrid,
  RefreshCw,
  Network,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@renderer/lib/utils";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { useGraphIdeStore } from "@renderer/features/research/stores/graphIdeStore";
import { SidebarTreeSection } from "./SidebarTreeSection";
import type { RelationKind } from "@shared/types";

const ENTITY_TYPE_META = [
  { type: "Character",   icon: Users,        color: "#818cf8" },
  { type: "Event",       icon: CalendarDays, color: "#fb7185" },
  { type: "Place",       icon: MapPin,       color: "#34d399" },
  { type: "Faction",     icon: Flag,         color: "#fb923c" },
  { type: "Rule",        icon: Scale,        color: "#c084fc" },
  { type: "Concept",     icon: Lightbulb,    color: "#38bdf8" },
  { type: "Item",        icon: Box,          color: "#fbbf24" },
  { type: "Term",        icon: BookOpen,     color: "#2dd4bf" },
  { type: "WorldEntity", icon: CircleDashed, color: "#94a3b8" },
] as const;

const RELATION_META: { kind: RelationKind; label: string; color: string }[] = [
  { kind: "belongs_to", label: "belongs_to", color: "#c7d2fe" },
  { kind: "causes",     label: "causes",     color: "#fed7aa" },
  { kind: "controls",   label: "controls",   color: "#e9d5ff" },
  { kind: "located_in", label: "located_in", color: "#bbf7d0" },
  { kind: "enemy_of",   label: "enemy_of",   color: "#fecaca" },
  { kind: "violates",   label: "violates",   color: "#fde68a" },
];

export function GraphSidebarContent() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");

  const graphData = useWorldBuildingStore((s) => s.graphData);
  const filter = useWorldBuildingStore((s) => s.filter);
  const setFilter = useWorldBuildingStore((s) => s.setFilter);
  const triggerLayout = useGraphIdeStore((s) => s.triggerLayout);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setSearch(val);
      setFilter({ searchQuery: val });
    },
    [setFilter],
  );

  const countByType = useMemo(() => {
    const counts: Record<string, number> = {};
    graphData?.nodes.forEach((node) => {
      const type = node.subType ?? node.entityType;
      counts[type] = (counts[type] ?? 0) + 1;
    });
    return counts;
  }, [graphData]);

  const toggleEntityType = useCallback(
    (type: string) => {
      const next = filter.entityTypes.includes(type)
        ? filter.entityTypes.filter((e) => e !== type)
        : [...filter.entityTypes, type];
      setFilter({ entityTypes: next });
    },
    [filter.entityTypes, setFilter],
  );

  const toggleRelation = useCallback(
    (kind: RelationKind) => {
      const next = filter.relationKinds.includes(kind)
        ? filter.relationKinds.filter((k) => k !== kind)
        : [...filter.relationKinds, kind];
      setFilter({ relationKinds: next });
    },
    [filter.relationKinds, setFilter],
  );

  const visibleEntityTypes = useMemo(
    () => ENTITY_TYPE_META.filter(({ type }) => (countByType[type] ?? 0) > 0),
    [countByType],
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
            onChange={handleSearchChange}
            placeholder={t("world.graph.ide.sidebar.search", "노드 검색...")}
            className="w-full rounded-md border border-transparent bg-element/60 py-1.5 pl-8 pr-3 text-[12px] text-fg placeholder:text-muted-foreground/50 outline-none focus:border-border/60 focus:bg-element transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Entities */}
        <SidebarTreeSection title={t("world.graph.ide.sidebar.nodes", "Entities")}>
          {visibleEntityTypes.length === 0 ? (
            <p className="px-2 py-2 text-[11px] text-muted-foreground/50">노드가 없습니다</p>
          ) : (
            visibleEntityTypes.map(({ type, icon: Icon, color }) => {
              const count = countByType[type] ?? 0;
              const isOn = filter.entityTypes.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleEntityType(type)}
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

        {/* Relations */}
        <SidebarTreeSection title={t("world.graph.ide.sidebar.relations", "Relations")}>
          {RELATION_META.map(({ kind, label, color }) => {
            const isOn = filter.relationKinds.includes(kind);
            return (
              <button
                key={kind}
                type="button"
                onClick={() => toggleRelation(kind)}
                className={cn(
                  "group flex w-full items-center gap-2 rounded-md px-2 py-[5px] text-[12px] transition-all",
                  isOn ? "text-fg hover:bg-element/80" : "opacity-35 hover:opacity-60",
                )}
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                <span className="h-px w-5 shrink-0 rounded" style={{ backgroundColor: color }} />
                <span className="flex-1 truncate text-left">
                  {t(`world.graph.relationTypes.${kind}`, { defaultValue: label })}
                </span>
              </button>
            );
          })}
        </SidebarTreeSection>
      </div>

      {/* Layout Controls */}
      <div className="shrink-0 border-t border-border/30 px-3 py-3">
        <p className="mb-2 select-none text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">
          Layout
        </p>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => triggerLayout("auto")}
            title="자동 배치"
            className="flex flex-1 items-center justify-center gap-1 rounded-md border border-border/40 bg-element/40 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-element hover:text-fg"
          >
            <Network className="h-3 w-3" />
            Auto
          </button>
          <button
            type="button"
            onClick={() => triggerLayout("cluster")}
            title="타입별 클러스터"
            className="flex flex-1 items-center justify-center gap-1 rounded-md border border-border/40 bg-element/40 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-element hover:text-fg"
          >
            <LayoutGrid className="h-3 w-3" />
            Cluster
          </button>
          <button
            type="button"
            onClick={() => triggerLayout("reset")}
            title="화면 맞추기"
            className="flex flex-1 items-center justify-center gap-1 rounded-md border border-border/40 bg-element/40 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-element hover:text-fg"
          >
            <RefreshCw className="h-3 w-3" />
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
