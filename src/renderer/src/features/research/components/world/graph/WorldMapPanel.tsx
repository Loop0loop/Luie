/**
 * WorldMapPanel
 * 우측에서 슬라이드 인되는 위치 트리 뷰
 * Place 노드의 located_in 관계를 파싱해 계층 구조로 표현
 */

import { useMemo, useState, useCallback, memo } from "react";
import { MapPin, ChevronDown, ChevronRight, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@shared/types/utils";
import type { WorldGraphNode, EntityRelation } from "@shared/types";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlaceTreeNode {
    node: WorldGraphNode;
    children: PlaceTreeNode[];
    depth: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildPlaceTree(
    nodes: WorldGraphNode[],
    edges: EntityRelation[],
): PlaceTreeNode[] {
    const placeIds = new Set(
        nodes
            .filter((n) => n.entityType === "Place" || (n.subType === "Place"))
            .map((n) => n.id),
    );

    const placeNodes = nodes.filter((n) => placeIds.has(n.id));

    // located_in 관계에서 parent->child 맵 구축
    const childrenMap = new Map<string, string[]>();
    const hasParent = new Set<string>();

    for (const edge of edges) {
        if (
            edge.relation === "located_in" &&
            placeIds.has(edge.sourceId) &&
            placeIds.has(edge.targetId)
        ) {
            // source가 target 안에 있음: target이 parent
            const siblings = childrenMap.get(edge.targetId) ?? [];
            siblings.push(edge.sourceId);
            childrenMap.set(edge.targetId, siblings);
            hasParent.add(edge.sourceId);
        }
    }

    const nodeMap = new Map(placeNodes.map((n) => [n.id, n]));

    function buildSubtree(id: string, depth: number): PlaceTreeNode | null {
        const node = nodeMap.get(id);
        if (!node) return null;
        const childIds = childrenMap.get(id) ?? [];
        return {
            node,
            children: childIds
                .map((cid) => buildSubtree(cid, depth + 1))
                .filter((n): n is PlaceTreeNode => n !== null),
            depth,
        };
    }

    // 루트 노드 = 부모가 없는 Place 노드들
    const roots = placeNodes
        .filter((n) => !hasParent.has(n.id))
        .map((n) => buildSubtree(n.id, 0))
        .filter((n): n is PlaceTreeNode => n !== null);

    return roots;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface PlaceTreeItemProps {
    treeNode: PlaceTreeNode;
    selectedNodeId: string | null;
    onSelect: (id: string) => void;
}

function PlaceTreeItem({ treeNode, selectedNodeId, onSelect }: PlaceTreeItemProps) {
    const [isOpen, setIsOpen] = useState(true);
    const hasChildren = treeNode.children.length > 0;
    const isSelected = selectedNodeId === treeNode.node.id;

    return (
        <div className="flex flex-col">
            <button
                type="button"
                onClick={() => {
                    onSelect(treeNode.node.id);
                    if (hasChildren) setIsOpen((v) => !v);
                }}
                className={cn(
                    "group flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all text-left w-full",
                    isSelected
                        ? "bg-accent/20 border border-accent/40"
                        : "hover:bg-element/60 border border-transparent",
                )}
                style={{ paddingLeft: `${8 + treeNode.depth * 16}px` }}
            >
                {/* Toggle icon */}
                <span className="shrink-0 text-muted/50">
                    {hasChildren ? (
                        isOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />
                    ) : (
                        <MapPin size={10} />
                    )}
                </span>

                {/* Name */}
                <span className={cn(
                    "text-[13px] truncate font-medium transition-colors",
                    isSelected ? "text-accent" : "text-fg/80 group-hover:text-fg",
                )}>
                    {treeNode.node.name}
                </span>

                {/* Character count badge (how many nodes are located_in here) */}
                {hasChildren && (
                    <span className="ml-auto text-[10px] text-muted/60 shrink-0">
                        {treeNode.children.length}
                    </span>
                )}
            </button>

            {/* Children */}
            {isOpen && hasChildren && (
                <div className="flex flex-col">
                    {treeNode.children.map((child) => (
                        <PlaceTreeItem
                            key={child.node.id}
                            treeNode={child}
                            selectedNodeId={selectedNodeId}
                            onSelect={onSelect}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface WorldMapPanelProps {
    nodes: WorldGraphNode[];
    edges: EntityRelation[];
}

export const WorldMapPanel = memo(function WorldMapPanel({ nodes, edges }: WorldMapPanelProps) {
    const { t } = useTranslation();
    const selectedNodeId = useWorldBuildingStore((s) => s.selectedNodeId);
    const selectNode = useWorldBuildingStore((s) => s.selectNode);

    const placeTree = useMemo(() => buildPlaceTree(nodes, edges), [nodes, edges]);

    const placeCount = useMemo(
        () => nodes.filter((n) => n.entityType === "Place" || n.subType === "Place").length,
        [nodes],
    );

    const handleSelectNode = useCallback(
        (id: string) => {
            selectNode(id);
        },
        [selectNode],
    );

    return (
        <div className="flex flex-col h-full bg-panel/95 border-l border-border/40 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 shrink-0">
                <div className="flex items-center gap-2">
                    <Globe size={13} className="text-accent" />
                    <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
                        {t("world.map.title", { defaultValue: "위치 구조" })}
                    </span>
                    {placeCount > 0 && (
                        <span className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full font-medium">
                            {placeCount}개 장소
                        </span>
                    )}
                </div>
            </div>

            {/* Map Info Badge */}
            <div className="mx-3 mt-3 mb-2 px-3 py-2 rounded-lg bg-element/30 border border-border/30 text-[10px] text-muted/70 leading-relaxed">
                💡 <strong className="text-muted">located_in</strong> 관계로 연결된 Place 노드들의 위치 계층입니다.
                노드를 클릭하면 그래프에서 포커스됩니다.
            </div>

            {/* Tree Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2">
                {placeTree.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 gap-3 text-center px-4">
                        <MapPin size={24} className="text-muted/30" />
                        <div>
                            <p className="text-[13px] font-semibold text-muted">
                                {t("world.map.empty", { defaultValue: "위치 정보가 없습니다" })}
                            </p>
                            <p className="text-[11px] text-muted/60 mt-1 leading-relaxed">
                                {t("world.map.emptyHint", {
                                    defaultValue: "Place 노드를 추가하고\nlocated_in 관계로 연결하세요",
                                })}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-0.5">
                        {placeTree.map((treeNode) => (
                            <PlaceTreeItem
                                key={treeNode.node.id}
                                treeNode={treeNode}
                                selectedNodeId={selectedNodeId}
                                onSelect={handleSelectNode}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Future: Image Pin Map */}
            <div className="px-3 pb-3 pt-2 border-t border-border/30">
                <button
                    type="button"
                    disabled
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-element/30 border border-border/30 border-dashed text-[11px] text-muted/50 cursor-not-allowed"
                >
                    <MapPin size={12} />
                    {t("world.map.imageMapComingSoon", { defaultValue: "이미지 핀 지도 (예정)" })}
                </button>
            </div>
        </div>
    );
});
