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
import { type WorldGraphNode, type EntityRelation, type WorldEntitySourceType, type RelationKind } from "@shared/types";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import type { WorldViewMode } from "@renderer/features/research/stores/worldBuildingStore";

interface WorldGraphCanvasProps {
    nodes: WorldGraphNode[];
    edges: EntityRelation[];
    viewMode: WorldViewMode;
}

// ─── 엔티티 타입별 색상 ──────────────────────────────────────────────────────

const NODE_COLORS: Record<WorldEntitySourceType | string, string> = {
    Character: "#6366f1",   // 보라 - 인물
    Faction: "#f59e0b",     // 주황 - 세력
    Event: "#ef4444",       // 빨강 - 사건
    Place: "#10b981",       // 초록 - 장소
    Concept: "#0ea5e9",     // 파랑 - 개념
    Rule: "#8b5cf6",        // 바이올렛 - 규칙
    Item: "#f97316",        // 오렌지 - 사물
    WorldEntity: "#64748b", // 슬레이트 - 범용
};

const RELATION_LABELS: Record<RelationKind, string> = {
    belongs_to: "소속",
    enemy_of: "적대",
    causes: "원인",
    controls: "통제",
    located_in: "위치",
    violates: "위반",
};

const RELATION_COLORS: Record<RelationKind, string> = {
    belongs_to: "#6366f1",
    enemy_of: "#ef4444",
    causes: "#f59e0b",
    controls: "#8b5cf6",
    located_in: "#10b981",
    violates: "#f97316",
};

// ─── 노드 → React Flow 변환 ──────────────────────────────────────────────────

function toRFNode(graphNode: WorldGraphNode, index: number): Node {
    const subType = graphNode.subType ?? graphNode.entityType;
    const color = NODE_COLORS[subType] ?? NODE_COLORS[graphNode.entityType] ?? "#64748b";
    const importance = (graphNode.attributes?.importance ?? 3) as number;
    const size = 36 + importance * 8; // 44–76px

    return {
        id: graphNode.id,
        position: {
            x: graphNode.positionX !== 0 ? graphNode.positionX : (index % 5) * 160,
            y: graphNode.positionY !== 0 ? graphNode.positionY : Math.floor(index / 5) * 120,
        },
        data: {
            label: graphNode.name,
            subType,
        },
        style: {
            background: color,
            color: "#fff",
            borderRadius: "50%",
            width: size,
            height: size,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: Math.max(9, 12 - graphNode.name.length * 0.3) + "px",
            fontWeight: "600",
            border: `2px solid ${color}`,
            boxShadow: `0 2px 12px ${color}44`,
            textAlign: "center",
            overflow: "hidden",
            padding: "4px",
        },
        type: "default",
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
        style: { stroke: color, strokeWidth: 1.5 },
        animated: rel.relation === "causes" || rel.relation === "controls",
        markerEnd: { type: MarkerType.ArrowClosed, color },
    };
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export function WorldGraphCanvas({ nodes: graphNodes, edges: graphEdges, viewMode }: WorldGraphCanvasProps) {
    const { selectNode, selectEdge, selectedNodeId, updateWorldEntityPosition, createRelation } =
        useWorldBuildingStore();

    const rfNodes = useMemo(() => graphNodes.map(toRFNode), [graphNodes]);
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
            void updateWorldEntityPosition({
                id: node.id,
                positionX: node.position.x,
                positionY: node.position.y,
            });
        },
        [updateWorldEntityPosition],
    );

    // 연결선 새로 그리기
    const onConnect = useCallback(
        (params: Connection) => {
            if (!params.source || !params.target) return;
            // 기본 관계 belongs_to 로 생성 (Inspector에서 변경 가능)
            void createRelation({
                projectId: "", // store 내부에서 projectId를 갖고 있지 않아 서버에서 처리
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
        <div style={{ width: "100%", height: "100%" }}>
            <ReactFlow
                nodes={styledNodes}
                edges={edges}
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
            >
                <Controls />
                <MiniMap
                    nodeColor={(n) => (n.style as Record<string, string>)?.background ?? "#64748b"}
                    style={{ background: "var(--sidebar)" }}
                />
                <Background variant={BackgroundVariant.Dots} gap={20} color="var(--border)" />
            </ReactFlow>
        </div>
    );
}
