/**
 * WorldSidebar - 좌측 사이드바
 * 엔티티/관계 필터 + 검색 + 엔티티 라이브러리
 */

import { useCallback } from "react";
import { Search, FilterX, Layers, Share2, LibraryBig, Check, X } from "lucide-react";
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

  const clearSearch = useCallback(() => setFilter({ searchQuery: "" }), [setFilter]);

  const hasActiveFilter = filter.entityTypes.length > 0 || filter.relationKinds.length > 0 || Boolean(filter.searchQuery);

  return (
    <div className="flex h-full flex-col bg-sidebar border-r border-border/80">
      {/* 검색 바 */}
      <div className="p-4 border-b border-border/60 bg-sidebar">
        <div className="group flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-element focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-accent/50 transition-all shadow-sm">
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

      <div className="overflow-y-auto custom-scrollbar flex flex-col gap-6 px-4 py-5 border-b border-border/60">
        {/* 엔티티 타입 필터 */}
        <section className="flex flex-col gap-3">
          <h6 className="text-[11px] font-bold text-muted uppercase tracking-wider flex items-center gap-2">
            <Layers size={12} />
            {t("world.graph.sidebar.entityType")}
          </h6>
          <div className="flex flex-col gap-1">
            {WORLD_ENTITY_TYPES.map((key) => {
              const theme = WORLD_GRAPH_NODE_THEMES[key] ?? WORLD_GRAPH_NODE_THEMES.WorldEntity;
              const isActive = filter.entityTypes.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleEntityType(key)}
                  className={cn(
                    "group flex items-center justify-between px-2.5 py-2 rounded-md border text-left transition-all duration-200",
                    isActive ? "bg-element border-border shadow-sm" : "bg-transparent border-transparent hover:bg-element hover:border-border/50",
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors", isActive ? "bg-accent border-accent text-white" : "border-border bg-sidebar group-hover:border-border")}>
                      {isActive && <Check size={10} strokeWidth={3} />}
                    </div>
                    <span className={cn("text-[13px] truncate", isActive ? "text-fg font-medium" : "text-muted group-hover:text-fg/80")}>
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
        <section className="flex flex-col gap-3">
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
                    "px-3 py-1.5 rounded-md text-[12px] font-medium transition-all duration-200 border",
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
            className="group flex items-center justify-center gap-2 py-2 mt-2 text-xs font-semibold text-muted hover:text-fg rounded-lg border border-border/60 hover:border-border bg-element/50 hover:bg-element transition-all"
          >
            <FilterX size={14} className="group-hover:text-destructive transition-colors" />
            {t("world.graph.sidebar.resetFilters")}
          </button>
        )}
      </div>

      {/* 라이브러리 목록 */}
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

        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3 flex flex-col gap-2">
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
                  "group flex items-center justify-between p-2.5 rounded-lg border border-border/80 bg-sidebar shadow-sm transition-all hover:border-accent/40 hover:shadow-md hover:-translate-y-[1px] text-left",
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={cn("w-2.5 h-2.5 rounded-full shrink-0 shadow-sm", theme.iconBg)} />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate font-semibold text-[13px] text-fg group-hover:text-accent transition-colors">{node.name}</span>
                    <span className="text-[10px] text-muted truncate">{t(`world.graph.entityTypes.${displayType}`, { defaultValue: displayType })}</span>
                  </div>
                </div>
              </button>
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
