/**
 * WorldGraphCanvas - React Flow 기반 세계관 그래프 캔버스
 * 노드 타입별 스타일링, 엣지 라벨, 드래그 이동, 줌/팬
 */

import { useCallback, useMemo, useEffect } from "react";
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    MarkerType,
    addEdge,
    useNodesState,
    useEdgesState,
    type Node,
    type Edge,
    type Connection,
    type NodeMouseHandler,
    type EdgeMouseHandler,
    BackgroundVariant,
} from "reactflow";
import "reactflow/dist/style.css";
import { type WorldGraphNode, type EntityRelation, type RelationKind } from "@shared/types";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import type { WorldViewMode } from "@renderer/features/research/stores/worldBuildingStore";
import { CustomEntityNode, MINIMAP_COLORS } from "./CustomEntityNode";

const nodeTypes = {
    custom: CustomEntityNode,
};

interface WorldGraphCanvasProps {
    nodes: WorldGraphNode[];
    edges: EntityRelation[];
    viewMode: WorldViewMode;
}

// ─── 엔티티 타입별 색상 (이제 CustomEntityNode 내부에 위임, 여기서는 엣지 렌더에만 일부 사용) ──────────────────────────────────────────────────────

const RELATION_LABELS: Record<RelationKind, string> = {
    belongs_to: "소속",
    enemy_of: "적대",
    causes: "원인",
    controls: "통제",
    located_in: "위치",
    violates: "위반",
};

const RELATION_COLORS: Record<RelationKind, string> = {
    belongs_to: "#c7d2fe", // 연한 색상
    enemy_of: "#fecaca",
    causes: "#fed7aa",
    controls: "#e9d5ff",
    located_in: "#bbf7d0",
    violates: "#fde68a",
};

// ─── 노드 → React Flow 변환 ──────────────────────────────────────────────────

function toRFNode(graphNode: WorldGraphNode, index: number, selectedNodeId: string | null): Node {
    const subType = graphNode.subType ?? graphNode.entityType;
    const importance = (graphNode.attributes?.importance ?? 3) as number;

    return {
        id: graphNode.id,
        position: {
            x: graphNode.positionX !== 0 ? graphNode.positionX : (index % 5) * 160,
            y: graphNode.positionY !== 0 ? graphNode.positionY : Math.floor(index / 5) * 120,
        },
        data: {
            label: graphNode.name,
            subType,
            importance,
        },
        selected: selectedNodeId === graphNode.id,
        type: "custom",
    };
}

// ─── 엣지 → React Flow 변환 ──────────────────────────────────────────────────

function toRFEdge(rel: EntityRelation): Edge {
    const color = RELATION_COLORS[rel.relation] ?? "#94a3b8";
    return {
        id: rel.id,
        source: rel.sourceId,
        target: rel.targetId,
        label: RELATION_LABELS[rel.relation] ?? rel.relation,
        labelStyle: { fontSize: 10, fill: "#94a3b8", fontWeight: 500 },
        labelBgStyle: { fill: "transparent" },
        style: { stroke: color, strokeWidth: 2 },
        animated: rel.relation === "causes" || rel.relation === "controls",
        markerEnd: { type: MarkerType.ArrowClosed, color },
    };
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export function WorldGraphCanvas({ nodes: graphNodes, edges: graphEdges, viewMode }: WorldGraphCanvasProps) {
    const { selectNode, selectEdge, selectedNodeId, updateWorldEntityPosition, createRelation } =
        useWorldBuildingStore();

    const rfNodes = useMemo(() => graphNodes.map((n, i) => toRFNode(n, i, selectedNodeId)), [graphNodes, selectedNodeId]);
    const rfEdges = useMemo(() => graphEdges.map(toRFEdge), [graphEdges]);

    const [nodes, setNodes, onNodesChange] = useNodesState(rfNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(rfEdges);

    // 외부 데이터 변경 동기화
    useEffect(() => {
        setNodes(rfNodes);
    }, [rfNodes, setNodes]);

    useEffect(() => {
        setEdges(rfEdges);
    }, [rfEdges, setEdges]);

    // 노드 드래그 완료 → 위치 저장
    const onNodeDragStop: NodeMouseHandler = useCallback(
        (_, node) => {
            const movedNodeType = graphNodes.find((graphNode) => graphNode.id === node.id)?.entityType;
            if (movedNodeType !== "WorldEntity") {
                return;
            }
            void updateWorldEntityPosition({
                id: node.id,
                positionX: node.position.x,
                positionY: node.position.y,
            });
        },
        [graphNodes, updateWorldEntityPosition],
    );

    // 연결선 새로 그리기
    const onConnect = useCallback(
        (params: Connection) => {
            if (!params.source || !params.target) return;
            // 기본 관계 belongs_to 로 생성 (Inspector에서 변경 가능)
            void createRelation({
                projectId: "",
                sourceId: params.source,
                sourceType: (graphNodes.find((n) => n.id === params.source)?.entityType ?? "Character"),
                targetId: params.target,
                targetType: (graphNodes.find((n) => n.id === params.target)?.entityType ?? "Character"),
                relation: "belongs_to",
            });
            setEdges((eds) => addEdge(params, eds));
        },
        [createRelation, graphNodes, setEdges],
    );

    const onNodeClick: NodeMouseHandler = useCallback(
        (_, node) => selectNode(node.id),
        [selectNode],
    );

    const onEdgeClick: EdgeMouseHandler = useCallback(
        (_, edge) => selectEdge(edge.id),
        [selectEdge],
    );

    const onPaneClick = useCallback(() => {
        selectNode(null);
        selectEdge(null);
    }, [selectNode, selectEdge]);

    // 주인공 중심 모드: 선택된 노드 강조
    const styledNodes = useMemo(() => {
        if (viewMode !== "protagonist" || !selectedNodeId) return nodes;
        return nodes.map((n) => ({
            ...n,
            style: {
                ...n.style,
                opacity: n.id === selectedNodeId ? 1 : 0.3,
            },
        }));
    }, [nodes, viewMode, selectedNodeId]);

    return (
        <div style={{ width: "100%", height: "100%" }} className="bg-app relative">
            <ReactFlow
                nodes={styledNodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeDragStop={onNodeDragStop}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onEdgeClick={onEdgeClick}
                onPaneClick={onPaneClick}
                fitView
                minZoom={0.1}
                maxZoom={2}
                deleteKeyCode={null}
                className="react-flow-premium"
            >
                <Controls
                    className="bg-element/80 backdrop-blur-md border border-border/50 rounded-lg shadow-sm overflow-hidden flex flex-col gap-px fill-muted"
                    showInteractive={false}
                />
                <MiniMap
                    nodeColor={(n) => {
                        const subType = n.data?.subType as string;
                        return MINIMAP_COLORS[subType] ?? MINIMAP_COLORS["WorldEntity"];
                    }}
                    nodeStrokeWidth={3}
                    nodeBorderRadius={4}
                    className="bg-element/50 backdrop-blur-xl border border-border/50 rounded-xl shadow-lg !bottom-6 !right-6 overflow-hidden"
                    maskColor="rgba(0, 0, 0, 0.15)"
                />
                <Background
                    variant={BackgroundVariant.Cross}
                    gap={24}
                    size={2}
                    color="var(--border-default)"
                    className="opacity-40"
                />
            </ReactFlow>
        </div>
    );
}
