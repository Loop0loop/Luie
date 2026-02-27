/**
 * WorldSidebar - 좌측 사이드바
 * 엔티티 타입/관계 필터 + 검색
 */

import { useCallback, useMemo } from "react";
import { Search, FilterX, Layers, Share2, LibraryBig, Check } from "lucide-react";
import { cn } from "@shared/types/utils";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import type { RelationKind } from "@shared/types";

import { NODE_THEMES } from "./CustomEntityNode";

const ENTITY_TYPES: { key: string; label: string }[] = [
    { key: "Character", label: "인물" },
    { key: "Faction", label: "세력" },
    { key: "Event", label: "사건" },
    { key: "Place", label: "장소" },
    { key: "Concept", label: "개념" },
    { key: "Rule", label: "규칙" },
    { key: "Item", label: "사물" },
    { key: "Term", label: "기타 용어" },
];

const RELATION_KINDS: { key: RelationKind; label: string }[] = [
    { key: "belongs_to", label: "소속" },
    { key: "enemy_of", label: "적대" },
    { key: "causes", label: "원인" },
    { key: "controls", label: "통제" },
    { key: "located_in", label: "위치" },
    { key: "violates", label: "위반" },
];

import { useFilteredGraph } from "@renderer/features/research/stores/worldBuildingStore";

export function WorldSidebar() {
    const { filter, setFilter, resetFilter, graphData, selectNode } = useWorldBuildingStore();
    const { nodes: filteredNodes } = useFilteredGraph();

    const nodeCount = useMemo(() => graphData?.nodes.length ?? 0, [graphData]);
    const edgeCount = useMemo(() => graphData?.edges.length ?? 0, [graphData]);

    const onSearchChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => setFilter({ searchQuery: e.target.value }),
        [setFilter],
    );

    const toggleEntityType = useCallback(
        (entityType: string) => {
            setFilter({
                entityTypes: filter.entityTypes.includes(entityType)
                    ? filter.entityTypes.filter((t) => t !== entityType)
                    : [...filter.entityTypes, entityType],
            });
        },
        [filter.entityTypes, setFilter],
    );

    const toggleRelationKind = useCallback(
        (kind: RelationKind) => {
            setFilter({
                relationKinds: filter.relationKinds.includes(kind)
                    ? filter.relationKinds.filter((k) => k !== kind)
                    : [...filter.relationKinds, kind],
            });
        },
        [filter.relationKinds, setFilter],
    );

    return (
        <div className="flex flex-col h-full bg-sidebar/40 backdrop-blur-3xl font-sans overflow-hidden border-r border-border/40 pb-2">
            {/* 상단 헤더 영역 (요약 + 검색) */}
            <div className="p-4 pb-2 shrink-0 border-b border-border/40 bg-sidebar/60">
                <div className="flex items-center justify-between text-[10px] font-bold text-muted uppercase tracking-widest mb-3">
                    <span className="flex items-center gap-1.5"><Layers size={10} /> {nodeCount} Entities</span>
                    <span className="flex items-center gap-1.5"><Share2 size={10} /> {edgeCount} Relations</span>
                </div>

                <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-border/60 bg-element/50 focus-within:bg-element hover:border-border transition-all shadow-sm">
                    <Search size={14} className="text-muted" />
                    <input
                        type="text"
                        placeholder="엔티티 검색 (이름, 내용...)"
                        value={filter.searchQuery}
                        onChange={onSearchChange}
                        className="flex-1 min-w-0 bg-transparent border-none text-xs text-fg outline-none placeholder:text-muted/60"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4 flex flex-col gap-6">

                {/* 엔티티 유형 필터 */}
                <section className="flex flex-col gap-2 shrink-0">
                    <div className="flex items-center justify-between px-1">
                        <h6 className="text-[11px] font-bold text-fg/80 flex items-center gap-1.5">
                            <Layers size={12} className="text-muted" /> 엔티티 유형
                        </h6>
                        {filter.entityTypes.length > 0 && (
                            <span className="text-[9px] bg-accent/10 focus:outline-none text-accent px-1.5 py-0.5 rounded font-bold">
                                {filter.entityTypes.length} Active
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                        {ENTITY_TYPES.map(({ key, label }) => {
                            const theme = NODE_THEMES[key] ?? NODE_THEMES["WorldEntity"];
                            const isActive = filter.entityTypes.includes(key);
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => toggleEntityType(key)}
                                    className={cn(
                                        "flex items-center justify-between px-2.5 py-2 rounded-lg border text-left transition-all duration-200 group",
                                        isActive
                                            ? "bg-element border-border shadow-sm"
                                            : "bg-transparent border-transparent hover:bg-element/50"
                                    )}
                                >
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <span className={cn("w-2 h-2 rounded-full shrink-0 shadow-sm", theme.iconBg)} />
                                        <span className={cn("text-xs font-medium truncate", isActive ? "text-fg" : "text-muted group-hover:text-fg/80")}>
                                            {label}
                                        </span>
                                    </div>
                                    {isActive && <Check size={12} className="text-accent shrink-0 ml-1" />}
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* 관계 종류 필터 */}
                <section className="flex flex-col gap-2 shrink-0">
                    <div className="flex items-center justify-between px-1">
                        <h6 className="text-[11px] font-bold text-fg/80 flex items-center gap-1.5">
                            <Share2 size={12} className="text-muted" /> 관계 유형
                        </h6>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {RELATION_KINDS.map(({ key, label }) => {
                            const isActive = filter.relationKinds.includes(key);
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => toggleRelationKind(key)}
                                    className={cn(
                                        "px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 border",
                                        isActive
                                            ? "bg-accent/10 border-accent/20 text-accent shadow-sm"
                                            : "bg-transparent border-border/40 text-muted hover:bg-element hover:text-fg"
                                    )}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* 필터 초기화 */}
                {(filter.entityTypes.length > 0 || filter.relationKinds.length > 0 || filter.searchQuery) && (
                    <button
                        type="button"
                        onClick={resetFilter}
                        className="flex items-center justify-center gap-2 mx-1 py-2 text-xs font-bold text-muted hover:text-fg hover:bg-element-hover rounded-lg border border-border/40 hover:border-border transition-all cursor-pointer shrink-0"
                    >
                        <FilterX size={14} />
                        모든 필터 초기화
                    </button>
                )}
            </div>

            {/* 엔티티 라이브러리 목록 */}
            <div className="flex-1 min-h-0 bg-sidebar/80 flex flex-col pt-3 border-t border-border/40 shrink-0 basis-1/3">
                <div className="flex items-center justify-between px-4 mb-2">
                    <h6 className="text-xs font-bold text-fg flex items-center gap-1.5">
                        <LibraryBig size={14} className="text-muted" />
                        라이브러리
                    </h6>
                    <span className="text-[10px] font-bold text-muted bg-element px-1.5 py-0.5 rounded-md">
                        {filteredNodes.length} 개
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-1.5 custom-scrollbar">
                    {filteredNodes.map((node) => {
                        const displayType = node.subType ?? node.entityType;
                        const theme = NODE_THEMES[displayType] ?? NODE_THEMES["WorldEntity"];

                        return (
                            <div
                                key={node.id}
                                draggable
                                onDragStart={(e) => {
                                    e.dataTransfer.setData("application/reactflow", JSON.stringify(node));
                                    e.dataTransfer.effectAllowed = "move";
                                }}
                                onClick={() => selectNode(node.id)}
                                className={cn(
                                    "flex items-center justify-between p-2 rounded-lg cursor-grab active:cursor-grabbing border shadow-sm transition-all hover:shadow hover:-translate-y-[1px] shrink-0 group",
                                    theme.wrapper, theme.text
                                )}
                            >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className={cn("w-2 h-2 rounded-full shrink-0", theme.iconBg)} />
                                    <span className="truncate font-semibold text-xs tracking-tight">{node.name}</span>
                                </div>
                                <span className={cn(
                                    "text-[9px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap shrink-0 opacity-80 group-hover:opacity-100 transition-opacity",
                                    theme.iconBg, theme.text
                                )}>
                                    {ENTITY_TYPES.find((t) => t.key === displayType)?.label ?? displayType}
                                </span>
                            </div>
                        );
                    })}

                    {filteredNodes.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-24 text-center px-4">
                            <LibraryBig size={24} className="text-muted/30 mb-2" />
                            <p className="text-xs text-muted font-medium">검색 결과가 없습니다</p>
                            <p className="text-[10px] text-muted/70 mt-1">다른 필터를 선택하거나<br />검색어를 변경해보세요</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
