import { useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  ReactFlowProvider,
  SelectionMode,
  type Connection,
  type EdgeChange,
  type Edge,
  type NodeChange,
  type Node,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";
import type { EntityRelation, WorldGraphNode } from "@shared/types";
import { Badge } from "@renderer/components/ui/badge";
import { Button } from "@renderer/components/ui/button";
import { Card, CardContent } from "@renderer/components/ui/card";
import { CanvasTimelinePalette } from "../components/CanvasTimelinePalette";
import { CanvasToolbar } from "../components/CanvasToolbar";
import type { CanvasGraphNodeData } from "../components/CanvasGraphNodeCard";
import {
  CANVAS_EDGE_TYPES,
  CANVAS_NODE_TYPES,
} from "../components/canvasFlowTypes";

type CanvasViewProps = {
  nodes: WorldGraphNode[];
  edges: EntityRelation[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onNodePositionCommit?: (input: { id: string; x: number; y: number }) => void;
  onCreateBlock: () => void;
  onCreateTimelineEvent: () => void;
  onCreateNote: () => void;
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

const buildFlowNodes = (
  nodes: WorldGraphNode[],
  edges: EntityRelation[],
): Node<CanvasGraphNodeData>[] => {
  const relationCountByNodeId = new Map<string, number>();
  edges.forEach((edge) => {
    relationCountByNodeId.set(
      edge.sourceId,
      (relationCountByNodeId.get(edge.sourceId) ?? 0) + 1,
    );
    relationCountByNodeId.set(
      edge.targetId,
      (relationCountByNodeId.get(edge.targetId) ?? 0) + 1,
    );
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

function mergeIncomingNodes(
  currentNodes: Node<CanvasGraphNodeData>[],
  incomingNodes: Node<CanvasGraphNodeData>[],
  lockedNodeId: string | null,
): Node<CanvasGraphNodeData>[] {
  const currentById = new Map(currentNodes.map((node) => [node.id, node]));

  return incomingNodes.map((incomingNode) => {
    const currentNode = currentById.get(incomingNode.id);
    if (!currentNode || incomingNode.id === lockedNodeId) {
      return incomingNode;
    }
    return {
      ...incomingNode,
      position: currentNode.position,
      selected: currentNode.selected,
    };
  });
}

function CanvasFlowSurface({
  graphNodes,
  graphEdges,
  timelineNodes,
  selectedNodeId,
  onSelectNode,
  onNodePositionCommit,
  onCreateBlock,
  onCreateTimelineEvent,
  onCreateNote,
  summary,
}: {
  graphNodes: Node<CanvasGraphNodeData>[];
  graphEdges: Edge[];
  timelineNodes: WorldGraphNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onNodePositionCommit?: (input: { id: string; x: number; y: number }) => void;
  onCreateBlock: () => void;
  onCreateTimelineEvent: () => void;
  onCreateNote: () => void;
  summary: {
    nodeCount: number;
    edgeCount: number;
    hasSelection: boolean;
  };
}) {
  const [nodes, setNodes] = useState<Node<CanvasGraphNodeData>[]>(graphNodes);
  const [edges, setEdges] = useState<Edge[]>(graphEdges);
  const [timelinePaletteOpen, setTimelinePaletteOpen] = useState(false);
  const [isHudVisible, setIsHudVisible] = useState(true);
  const draggingNodeIdRef = useRef<string | null>(null);
  const reactFlow = useReactFlow<CanvasGraphNodeData>();

  useEffect(() => {
    setNodes((currentNodes) =>
      mergeIncomingNodes(currentNodes, graphNodes, draggingNodeIdRef.current),
    );
  }, [graphNodes]);

  useEffect(() => {
    setEdges(graphEdges);
  }, [graphEdges]);

  useEffect(() => {
    setNodes((currentNodes) =>
      {
        const activeNodeId =
          currentNodes.find((node) => node.selected)?.id ?? null;
        if (activeNodeId === selectedNodeId) {
          return currentNodes;
        }
        return currentNodes.map((node) => ({
          ...node,
          selected: node.id === selectedNodeId,
        }));
      },
    );
  }, [selectedNodeId]);

  const handleNodesChange = (changes: NodeChange[]) => {
    setNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
  };

  const handleEdgesChange = (changes: EdgeChange[]) => {
    setEdges((currentEdges) => applyEdgeChanges(changes, currentEdges));
  };

  const handleConnect = (connection: Connection) => {
    setEdges((currentEdges) =>
      addEdge(
        {
          ...connection,
          type: "smoothstep",
          style: {
            stroke: "rgba(255,255,255,0.18)",
            strokeWidth: 1.6,
          },
        },
        currentEdges,
      ),
    );
  };

  return (
    <div className="absolute inset-0">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={CANVAS_NODE_TYPES}
        edgeTypes={CANVAS_EDGE_TYPES}
        minZoom={0.45}
        maxZoom={1.6}
        defaultViewport={{ x: 0, y: 0, zoom: 0.9 }}
        proOptions={{ hideAttribution: true }}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onNodeClick={(_, node) => {
          setIsHudVisible(false);
          onSelectNode(node.id);
        }}
        onPaneClick={() => {
          setIsHudVisible(false);
          onSelectNode(null);
        }}
        onNodeDragStart={(_, node) => {
          draggingNodeIdRef.current = node.id;
        }}
        onNodeDragStop={(_, node) => {
          draggingNodeIdRef.current = null;
          onNodePositionCommit?.({
            id: node.id,
            x: node.position.x,
            y: node.position.y,
          });
        }}
        panOnDrag={[1]}
        panOnScroll
        selectionOnDrag
        selectionMode={SelectionMode.Partial}
        onlyRenderVisibleElements
        zoomOnDoubleClick={false}
        selectNodesOnDrag={false}
        className="bg-[#0f1319]"
      >
        <Background
          color="rgba(255,255,255,0.08)"
          gap={28}
          size={1}
          variant={BackgroundVariant.Dots}
        />
      </ReactFlow>

      {isHudVisible ? (
        <div className="pointer-events-none absolute left-5 top-5 z-10">
          <Card className="w-[280px] border-white/10 bg-[#171b22]/88 text-fg shadow-[0_16px_38px_rgba(0,0,0,0.28)]">
            <CardContent className="space-y-3 pt-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-fg/45">
                    Canvas
                  </p>
                  <p className="mt-1 text-sm font-semibold text-fg">
                    {summary.nodeCount} cards / {summary.edgeCount} links
                  </p>
                </div>
                <Badge variant="outline">
                  {summary.hasSelection ? "selection" : "idle"}
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
                  onClick={() => {
                    void reactFlow.fitView({
                      padding: 0.24,
                      duration: 0,
                    });
                  }}
                >
                  뷰 정리
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="pointer-events-none absolute left-5 top-5 z-10">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="pointer-events-auto border-white/10 bg-[#171b22]/88"
            onClick={() => setIsHudVisible(true)}
          >
            HUD
          </Button>
        </div>
      )}

      <div className="pointer-events-none absolute right-5 top-5 z-10 flex flex-col gap-2">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="pointer-events-auto h-11 w-11 rounded-xl border-white/10 bg-[#171b22]/90"
          onClick={onCreateBlock}
          title="블럭 추가"
        >
          +
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="pointer-events-auto h-11 w-11 rounded-xl border-white/10 bg-[#171b22]/90"
          onClick={() => {
            setTimelinePaletteOpen(true);
          }}
          title="타임라인 팔레트"
        >
          T
        </Button>
      </div>

      <CanvasToolbar
        onCreateBlock={onCreateBlock}
        onOpenTimelinePalette={() => setTimelinePaletteOpen(true)}
        onCreateNote={onCreateNote}
      />

      <CanvasTimelinePalette
        open={timelinePaletteOpen}
        events={timelineNodes}
        onClose={() => setTimelinePaletteOpen(false)}
        onCreateEvent={() => {
          onCreateTimelineEvent();
          setTimelinePaletteOpen(false);
        }}
        onPickEvent={(nodeId) => {
          onSelectNode(nodeId);
        }}
      />
    </div>
  );
}

export function CanvasView({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  onNodePositionCommit,
  onCreateBlock,
  onCreateTimelineEvent,
  onCreateNote,
}: CanvasViewProps) {
  const flowNodes = useMemo(
    () => buildFlowNodes(nodes, edges),
    [edges, nodes],
  );
  const flowEdges = useMemo(() => buildFlowEdges(edges), [edges]);
  const timelineNodes = useMemo(
    () => nodes.filter((node) => node.entityType === "Event"),
    [nodes],
  );
  const summary = useMemo(
    () => ({
      nodeCount: nodes.length,
      edgeCount: edges.length,
      hasSelection: Boolean(selectedNodeId),
    }),
    [edges.length, nodes.length, selectedNodeId],
  );

  return (
    <div className="relative h-full bg-[#0f1319]">
      <ReactFlowProvider>
        <CanvasFlowSurface
          graphNodes={flowNodes}
          graphEdges={flowEdges}
          timelineNodes={timelineNodes}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
          onNodePositionCommit={onNodePositionCommit}
          onCreateBlock={onCreateBlock}
          onCreateTimelineEvent={onCreateTimelineEvent}
          onCreateNote={onCreateNote}
          summary={summary}
        />
      </ReactFlowProvider>

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
