/**
 * WorldSidebar - 좌측 사이드바
 * 엔티티/관계 필터 + 검색 + 엔티티 라이브러리
 */

import { useCallback } from "react";
import { Search, FilterX, Layers, Share2, LibraryBig, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@shared/types/utils";
import { WORLD_ENTITY_TYPES } from "@shared/constants/world";
import { WORLD_GRAPH_NODE_THEMES } from "@shared/constants/worldGraphUI";
import type { RelationKind } from "@shared/types";
import { useFilteredGraph, useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";

const RELATION_KINDS: RelationKind[] = [
  "belongs_to",
  "enemy_of",
  "causes",
  "controls",
  "located_in",
  "violates",
];

export function WorldSidebar() {
  const { t } = useTranslation();
  const filter = useWorldBuildingStore((state) => state.filter);
  const setFilter = useWorldBuildingStore((state) => state.setFilter);
  const resetFilter = useWorldBuildingStore((state) => state.resetFilter);
  const selectNode = useWorldBuildingStore((state) => state.selectNode);
  const { nodes: filteredNodes } = useFilteredGraph();

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

  const hasActiveFilter =
    filter.entityTypes.length > 0 || filter.relationKinds.length > 0 || Boolean(filter.searchQuery);

  return (
    <div className="flex h-full flex-col bg-sidebar border-r border-border">
      <div className="p-3 border-b border-border/60 bg-panel">
        <p className="px-1 pb-2 text-[10px] font-bold text-muted uppercase tracking-wider">
          {t("world.graph.sidebar.entities")}
        </p>
        <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-border bg-element focus-within:ring-1 focus-within:ring-accent/40">
          <Search size={14} className="text-muted" />
          <input
            type="text"
            placeholder={t("world.graph.sidebar.searchPlaceholder")}
            value={filter.searchQuery}
            onChange={onSearchChange}
            className="flex-1 min-w-0 bg-transparent border-none text-xs text-fg outline-none placeholder:text-muted/70"
          />
        </div>
      </div>

      <div className="overflow-y-auto custom-scrollbar px-3 py-4 flex flex-col gap-5 border-b border-border/60">
        <section className="flex flex-col gap-2">
          <h6 className="text-[11px] font-semibold text-fg/90 flex items-center gap-1.5 px-1">
            <Layers size={12} className="text-muted" />
            {t("world.graph.sidebar.entityType")}
          </h6>
          <div className="grid grid-cols-2 gap-1.5">
            {WORLD_ENTITY_TYPES.map((key) => {
              const theme = WORLD_GRAPH_NODE_THEMES[key] ?? WORLD_GRAPH_NODE_THEMES.WorldEntity;
              const isActive = filter.entityTypes.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleEntityType(key)}
                  className={cn(
                    "flex items-center justify-between px-2.5 py-2 rounded-lg border text-left transition-colors",
                    isActive ? "bg-element border-border" : "bg-transparent border-transparent hover:bg-element/50",
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn("w-2 h-2 rounded-full shrink-0", theme.iconBg)} />
                    <span className={cn("text-xs truncate", isActive ? "text-fg" : "text-muted")}>
                      {t(`world.graph.entityTypes.${key}`, { defaultValue: key })}
                    </span>
                  </div>
                  {isActive && <Check size={12} className="text-accent shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h6 className="text-[11px] font-semibold text-fg/90 flex items-center gap-1.5 px-1">
            <Share2 size={12} className="text-muted" />
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
                    "px-2.5 py-1 rounded-md text-xs font-medium border transition-colors",
                    isActive ? "bg-accent/10 border-accent/30 text-accent" : "bg-transparent border-border text-muted hover:bg-element hover:text-fg",
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
            className="flex items-center justify-center gap-2 py-2 text-xs font-semibold text-muted hover:text-fg rounded-lg border border-border hover:bg-element transition-colors"
          >
            <FilterX size={14} />
            {t("world.graph.sidebar.resetFilters")}
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 flex flex-col bg-panel">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
          <h6 className="text-xs font-semibold text-fg flex items-center gap-1.5">
            <LibraryBig size={14} className="text-muted" />
            {t("world.graph.sidebar.library")}
          </h6>
          <span className="text-[10px] font-semibold text-muted bg-element px-1.5 py-0.5 rounded-md">
            {filteredNodes.length} {t("world.graph.sidebar.items")}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3 flex flex-col gap-1.5">
          {filteredNodes.map((node) => {
            const displayType = node.subType ?? node.entityType;
            const theme = WORLD_GRAPH_NODE_THEMES[displayType] ?? WORLD_GRAPH_NODE_THEMES.WorldEntity;
            return (
              <button
                key={node.id}
                type="button"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData("application/reactflow", JSON.stringify(node));
                  event.dataTransfer.effectAllowed = "move";
                }}
                onClick={() => selectNode(node.id)}
                className={cn(
                  "flex items-center justify-between p-2 rounded-lg border shadow-sm transition-all hover:shadow hover:-translate-y-[1px] text-left",
                  theme.wrapper,
                  theme.text,
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn("w-2 h-2 rounded-full shrink-0", theme.iconBg)} />
                  <span className="truncate font-semibold text-xs">{node.name}</span>
                </div>
                <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0", theme.iconBg, theme.text)}>
                  {t(`world.graph.entityTypes.${displayType}`, { defaultValue: displayType })}
                </span>
              </button>
            );
          })}

          {filteredNodes.length === 0 && (
            <div className="flex flex-col items-center justify-center h-28 text-center px-4">
              <LibraryBig size={24} className="text-muted/30 mb-2" />
              <p className="text-xs text-muted font-medium">{t("world.graph.sidebar.noResults")}</p>
              <p className="text-[10px] text-muted/70 mt-1 whitespace-pre-line">
                {t("world.graph.sidebar.noResultsHint")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
