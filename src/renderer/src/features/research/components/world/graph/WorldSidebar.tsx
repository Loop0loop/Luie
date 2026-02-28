/**
 * WorldSidebar - 좌측 사이드바
 * 엔티티/관계 필터 + 검색 + 엔티티 라이브러리 (타입별 그룹)
 */

import { useCallback, useMemo, useState } from "react";
import { Search, FilterX, Layers, Share2, LibraryBig, Check, X, ChevronDown, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@shared/types/utils";
import { WORLD_ENTITY_TYPES } from "@shared/constants/world";
import { WORLD_GRAPH_NODE_THEMES, WORLD_GRAPH_ICON_MAP } from "@shared/constants/worldGraphUI";
import type { RelationKind, WorldGraphNode } from "@shared/types";
import { useFilteredGraph, useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";

// ─── Constants ────────────────────────────────────────────────────────────────

const RELATION_KINDS: RelationKind[] = [
  "belongs_to",
  "enemy_of",
  "causes",
  "controls",
  "located_in",
  "violates",
];

// ─── Sub-components ───────────────────────────────────────────────────────────

interface EntityGroupProps {
  entityType: string;
  nodes: WorldGraphNode[];
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (nodeId: string) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function EntityGroup({ entityType, nodes, isOpen, onToggle, onSelect, t }: EntityGroupProps) {
  const theme = WORLD_GRAPH_NODE_THEMES[entityType] ?? WORLD_GRAPH_NODE_THEMES.WorldEntity;
  const Icon = WORLD_GRAPH_ICON_MAP[entityType] ?? WORLD_GRAPH_ICON_MAP.WorldEntity;
  const label = t(`world.graph.entityTypes.${entityType}`, { defaultValue: entityType });

  return (
    <div className="flex flex-col">
      {/* Group Header */}
      <button
        type="button"
        onClick={onToggle}
        className="group flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-element/60 transition-colors text-left w-full"
      >
        <div className="flex items-center gap-2">
          <div className={cn("flex h-5 w-5 items-center justify-center rounded-md shrink-0", theme.iconBg, theme.text)}>
            <Icon size={11} strokeWidth={2.5} />
          </div>
          <span className="text-[12px] font-semibold text-fg/80 group-hover:text-fg transition-colors">{label}</span>
          <span className="text-[10px] text-muted bg-element/80 border border-border/40 px-1.5 py-0.5 rounded-full font-medium">
            {nodes.length}
          </span>
        </div>
        <div className="text-muted/60 group-hover:text-muted transition-colors">
          {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </div>
      </button>

      {/* Group Items */}
      {isOpen && nodes.length > 0 && (
        <div className="ml-1 pl-3 border-l border-border/30 flex flex-col gap-0.5 py-0.5 mb-1">
          {nodes.map((node) => (
            <button
              key={node.id}
              type="button"
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData("application/reactflow", JSON.stringify(node));
                event.dataTransfer.effectAllowed = "move";
              }}
              onClick={() => onSelect(node.id)}
              className="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-element/80 hover:text-fg transition-all text-left w-full cursor-pointer"
            >
              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", theme.iconBg)} />
              <span className="truncate text-[12px] text-fg/70 group-hover:text-fg transition-colors">{node.name}</span>
            </button>
          ))}
        </div>
      )}

      {isOpen && nodes.length === 0 && (
        <div className="ml-1 pl-3 border-l border-border/30 py-2">
          <span className="text-[11px] text-muted/50 italic px-2">비어 있음</span>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function WorldSidebar() {
  const { t } = useTranslation();
  const filter = useWorldBuildingStore((state) => state.filter);
  const setFilter = useWorldBuildingStore((state) => state.setFilter);
  const resetFilter = useWorldBuildingStore((state) => state.resetFilter);
  const selectNode = useWorldBuildingStore((state) => state.selectNode);
  const { nodes: filteredNodes } = useFilteredGraph();

  // 각 그룹의 열림/닫힘 상태. 기본은 활성화된 필터 타입은 열려있음
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(WORLD_ENTITY_TYPES.map((type) => [type, true])),
  );

  const onSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setFilter({ searchQuery: event.target.value }),
    [setFilter],
  );

  const toggleEntityType = useCallback(
    (entityType: string) => {
      setFilter({
        entityTypes: filter.entityTypes.includes(entityType)
          ? filter.entityTypes.filter((value) => value !== entityType)
          : [...filter.entityTypes, entityType],
      });
    },
    [filter.entityTypes, setFilter],
  );

  const toggleRelationKind = useCallback(
    (kind: RelationKind) => {
      setFilter({
        relationKinds: filter.relationKinds.includes(kind)
          ? filter.relationKinds.filter((value) => value !== kind)
          : [...filter.relationKinds, kind],
      });
    },
    [filter.relationKinds, setFilter],
  );

  const clearSearch = useCallback(() => setFilter({ searchQuery: "" }), [setFilter]);

  const toggleGroup = useCallback((entityType: string) => {
    setOpenGroups((prev) => ({ ...prev, [entityType]: !prev[entityType] }));
  }, []);

  const hasActiveFilter = filter.entityTypes.length > 0 || filter.relationKinds.length > 0 || Boolean(filter.searchQuery);

  /** 필터링된 노드를 타입별로 그룹화 */
  const groupedNodes = useMemo(() => {
    const groups: Record<string, WorldGraphNode[]> = {};
    for (const type of WORLD_ENTITY_TYPES) {
      groups[type] = [];
    }
    for (const node of filteredNodes) {
      const key = node.subType ?? node.entityType;
      if (key in groups) {
        groups[key].push(node);
      } else if (node.entityType in groups) {
        groups[node.entityType].push(node);
      } else {
        (groups["WorldEntity"] ??= []).push(node);
      }
    }
    return groups;
  }, [filteredNodes]);

  /** 실제로 노드가 있는 타입부터 정렬 (빈 타입은 뒤로) */
  const sortedEntityTypes = useMemo(
    () =>
      [...WORLD_ENTITY_TYPES].sort((a, b) => {
        const aHas = (groupedNodes[a]?.length ?? 0) > 0;
        const bHas = (groupedNodes[b]?.length ?? 0) > 0;
        if (aHas && !bHas) return -1;
        if (!aHas && bHas) return 1;
        return 0;
      }),
    [groupedNodes],
  );

  return (
    <div className="flex h-full flex-col bg-sidebar/40 backdrop-blur-xl border-r border-border/40 shadow-xl">
      {/* 검색 바 */}
      <div className="p-4 border-b border-border/40 bg-transparent">
        <div className="group flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 bg-element/50 focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-accent/50 transition-all shadow-sm">
          <Search size={14} className="text-muted group-focus-within:text-accent transition-colors" />
          <input
            type="text"
            placeholder={t("world.graph.sidebar.searchPlaceholder")}
            value={filter.searchQuery}
            onChange={onSearchChange}
            className="flex-1 min-w-0 bg-transparent border-none text-[13px] text-fg outline-none placeholder:text-muted/60"
          />
          {filter.searchQuery && (
            <button type="button" onClick={clearSearch} className="p-0.5 rounded-sm hover:bg-muted/20 text-muted transition-colors">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="overflow-y-auto custom-scrollbar flex flex-col gap-5 px-4 py-5 border-b border-border/60">
        {/* 엔티티 타입 필터 */}
        <section className="flex flex-col gap-2">
          <h6 className="text-[11px] font-bold text-muted uppercase tracking-wider flex items-center gap-2">
            <Layers size={12} />
            {t("world.graph.sidebar.entityType")}
          </h6>
          <div className="flex flex-col gap-0.5">
            {WORLD_ENTITY_TYPES.map((key) => {
              const theme = WORLD_GRAPH_NODE_THEMES[key] ?? WORLD_GRAPH_NODE_THEMES.WorldEntity;
              const isActive = filter.entityTypes.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleEntityType(key)}
                  className={cn(
                    "group flex items-center justify-between px-2.5 py-1.5 rounded-md border text-left transition-all duration-200",
                    isActive ? "bg-element border-border shadow-sm" : "bg-transparent border-transparent hover:bg-element hover:border-border/50",
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors", isActive ? "bg-accent border-accent text-white" : "border-border bg-sidebar group-hover:border-border")}>
                      {isActive && <Check size={10} strokeWidth={3} />}
                    </div>
                    <span className={cn("text-[12px] truncate", isActive ? "text-fg font-medium" : "text-muted group-hover:text-fg/80")}>
                      {t(`world.graph.entityTypes.${key}`, { defaultValue: key })}
                    </span>
                  </div>
                  {isActive && (
                    <span className={cn("w-2 h-2 rounded-full shrink-0 shadow-sm", theme.iconBg)} />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* 관계 타입 필터 */}
        <section className="flex flex-col gap-2">
          <h6 className="text-[11px] font-bold text-muted uppercase tracking-wider flex items-center gap-2">
            <Share2 size={12} />
            {t("world.graph.sidebar.relationType")}
          </h6>
          <div className="flex flex-wrap gap-1.5">
            {RELATION_KINDS.map((key) => {
              const isActive = filter.relationKinds.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleRelationKind(key)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-200 border",
                    isActive ? "bg-accent text-white border-accent shadow-sm" : "bg-element border-border text-muted hover:text-fg hover:border-border/80",
                  )}
                >
                  {t(`world.graph.relationTypes.${key}`, { defaultValue: key })}
                </button>
              );
            })}
          </div>
        </section>

        {hasActiveFilter && (
          <button
            type="button"
            onClick={resetFilter}
            className="group flex items-center justify-center gap-2 py-1.5 text-xs font-semibold text-muted hover:text-fg rounded-lg border border-border/60 hover:border-border bg-element/50 hover:bg-element transition-all"
          >
            <FilterX size={13} className="group-hover:text-destructive transition-colors" />
            {t("world.graph.sidebar.resetFilters")}
          </button>
        )}
      </div>

      {/* 라이브러리 — 엔티티 타입별 그룹 */}
      <div className="flex-1 min-h-0 flex flex-col bg-panel">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-sidebar/50">
          <h6 className="text-[11px] font-bold text-muted uppercase tracking-wider flex items-center gap-2">
            <LibraryBig size={12} />
            {t("world.graph.sidebar.library")}
          </h6>
          <span className="text-[10px] font-semibold text-muted bg-element px-2 py-0.5 rounded-full border border-border/50">
            {filteredNodes.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3 flex flex-col gap-0.5">
          {sortedEntityTypes.map((entityType) => {
            const nodes = groupedNodes[entityType] ?? [];
            // 필터에서 비활성화된 타입이고 검색 결과도 없으면 숨김
            if (nodes.length === 0 && !filter.entityTypes.includes(entityType)) return null;
            return (
              <EntityGroup
                key={entityType}
                entityType={entityType}
                nodes={nodes}
                isOpen={openGroups[entityType] ?? false}
                onToggle={() => toggleGroup(entityType)}
                onSelect={selectNode}
                t={t}
              />
            );
          })}

          {filteredNodes.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 text-center px-4">
              <LibraryBig size={28} className="text-muted/30 mb-3" />
              <p className="text-[13px] text-muted font-semibold">{t("world.graph.sidebar.noResults")}</p>
              <p className="text-[11px] text-muted/60 mt-1 whitespace-pre-line leading-relaxed">
                {t("world.graph.sidebar.noResultsHint")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
