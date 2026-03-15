import { useMemo, useState } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlowProvider,
  SelectionMode,
  type Edge,
  type Node,
  type Viewport,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";
import type { EntityRelation, WorldGraphNode } from "@shared/types";
import { Badge } from "@renderer/components/ui/badge";
import { Button } from "@renderer/components/ui/button";
import { Card, CardContent } from "@renderer/components/ui/card";
import { CanvasGraphNodeCard, type CanvasGraphNodeData } from "../components/CanvasGraphNodeCard";

type CanvasViewProps = {
  nodes: WorldGraphNode[];
  edges: EntityRelation[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onNodePositionCommit?: (input: { id: string; x: number; y: number }) => void;
};

function readPosition(node: WorldGraphNode, index: number) {
  const fallbackColumn = index % 4;
  const fallbackRow = Math.floor(index / 4);

  return {
    x:
      Number.isFinite(node.positionX) && node.positionX !== 0
        ? node.positionX
        : 120 + fallbackColumn * 280,
    y:
      Number.isFinite(node.positionY) && node.positionY !== 0
        ? node.positionY
        : 120 + fallbackRow * 220,
  };
}

const buildGraphSignature = (
  nodes: WorldGraphNode[],
  edges: EntityRelation[],
  selectedNodeId: string | null,
) =>
  JSON.stringify({
    selectedNodeId,
    nodes: nodes.map((node) => [
      node.id,
      node.name,
      node.description,
      node.entityType,
      node.subType,
      node.positionX,
      node.positionY,
    ]),
    edges: edges.map((edge) => [edge.id, edge.sourceId, edge.targetId, edge.relation]),
  });

const buildFlowNodes = (
  nodes: WorldGraphNode[],
  edges: EntityRelation[],
  selectedNodeId: string | null,
): Node<CanvasGraphNodeData>[] => {
  const relationCountByNodeId = new Map<string, number>();
  edges.forEach((edge) => {
    relationCountByNodeId.set(edge.sourceId, (relationCountByNodeId.get(edge.sourceId) ?? 0) + 1);
    relationCountByNodeId.set(edge.targetId, (relationCountByNodeId.get(edge.targetId) ?? 0) + 1);
  });

  return nodes.map((node, index) => ({
    id: node.id,
    type: "obsidian-card",
    draggable: true,
    position: readPosition(node, index),
    data: {
      label: node.name,
      entityType: node.entityType,
      description: node.description?.trim() ?? "",
      isActive: selectedNodeId === node.id,
      relationCount: relationCountByNodeId.get(node.id) ?? 0,
      subType: node.subType,
    },
  }));
};

const buildFlowEdges = (edges: EntityRelation[]): Edge[] =>
  edges.map((edge) => ({
    id: edge.id,
    source: edge.sourceId,
    target: edge.targetId,
    label: edge.relation,
    animated: false,
    type: "smoothstep",
    style: {
      stroke: "rgba(255,255,255,0.18)",
      strokeWidth: 1.6,
    },
    labelStyle: {
      fill: "rgba(255,255,255,0.46)",
      fontSize: 11,
      fontWeight: 500,
    },
  }));

function CanvasFlowSurface({
  initialNodes,
  initialEdges,
  initialViewport,
  onSelectNode,
  onViewportChange,
  onNodePositionCommit,
}: {
  initialNodes: Node<CanvasGraphNodeData>[];
  initialEdges: Edge[];
  initialViewport: Viewport;
  onSelectNode: (nodeId: string | null) => void;
  onViewportChange: (viewport: Viewport) => void;
  onNodePositionCommit?: (input: { id: string; x: number; y: number }) => void;
}) {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={{ "obsidian-card": CanvasGraphNodeCard }}
      defaultViewport={initialViewport}
      minZoom={0.3}
      maxZoom={1.8}
      fitView
      fitViewOptions={{ padding: 0.18, includeHiddenNodes: false }}
      proOptions={{ hideAttribution: true }}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={(_, node) => onSelectNode(node.id)}
      onPaneClick={() => onSelectNode(null)}
      onMoveEnd={(_, viewport) => onViewportChange(viewport)}
      onNodeDragStop={(_, node) => {
        onNodePositionCommit?.({
          id: node.id,
          x: node.position.x,
          y: node.position.y,
        });
      }}
      panOnDrag
      panOnScroll
      selectionOnDrag
      selectionMode={SelectionMode.Partial}
      className="bg-[#0f1319]"
    >
      <Background
        color="rgba(255,255,255,0.08)"
        gap={28}
        size={1}
        variant={BackgroundVariant.Dots}
      />
      <MiniMap
        pannable
        zoomable
        className="!rounded-xl !border !border-white/10 !bg-[#171b22]"
        nodeColor={(node) =>
          node.data?.isActive ? "rgba(125, 211, 252, 0.8)" : "rgba(255,255,255,0.32)"
        }
      />
      <Controls
        className="!overflow-hidden !rounded-xl !border !border-white/10 !bg-[#171b22] [&>button]:!border-white/10 [&>button]:!bg-transparent [&>button]:!text-white/70"
        showInteractive={false}
      />
    </ReactFlow>
  );
}

export function CanvasView({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  onNodePositionCommit,
}: CanvasViewProps) {
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 0.85 });
  const graphSignature = useMemo(
    () => buildGraphSignature(nodes, edges, selectedNodeId),
    [edges, nodes, selectedNodeId],
  );
  const flowNodes = useMemo(
    () => buildFlowNodes(nodes, edges, selectedNodeId),
    [edges, nodes, selectedNodeId],
  );
  const flowEdges = useMemo(() => buildFlowEdges(edges), [edges]);

  return (
    <div className="relative h-full bg-[#0f1319]">
      <ReactFlowProvider>
        <CanvasFlowSurface
          key={graphSignature}
          initialNodes={flowNodes}
          initialEdges={flowEdges}
          initialViewport={viewport}
          onSelectNode={onSelectNode}
          onViewportChange={setViewport}
          onNodePositionCommit={onNodePositionCommit}
        />
      </ReactFlowProvider>

      <div className="pointer-events-none absolute left-5 top-5 z-10">
        <Card className="w-[320px] border-white/10 bg-[#171b22]/90 text-fg shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur">
          <CardContent className="space-y-3 pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-fg/45">
                  Canvas
                </p>
                <p className="mt-1 text-sm font-semibold text-fg">
                  Obsidian-style graph board
                </p>
              </div>
              <Badge variant="outline">{nodes.length} cards</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{edges.length} links</Badge>
              <Badge variant="outline">
                {selectedNodeId ? "selection active" : "no selection"}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="pointer-events-auto"
                onClick={() => onSelectNode(null)}
              >
                선택 해제
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="pointer-events-auto"
                onClick={() => setViewport({ x: 0, y: 0, zoom: 0.85 })}
              >
                뷰 초기화
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {nodes.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-8">
          <Card className="max-w-xl border-dashed border-white/10 bg-[#171b22]/90 text-center shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur">
            <CardContent className="space-y-3 pt-4">
              <p className="text-lg font-semibold text-fg">Canvas is empty</p>
              <p className="text-sm leading-7 text-fg/65">
                엔티티를 추가하면 Obsidian 스타일 카드 보드가 여기서 시작됩니다.
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
