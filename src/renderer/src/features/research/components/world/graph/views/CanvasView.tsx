import { useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
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
import { ENTITY_TYPE_CANVAS_THEME } from "../constants";

type CanvasViewProps = {
  nodes: WorldGraphNode[];
  edges: EntityRelation[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onNodePositionCommit?: (input: { id: string; x: number; y: number }) => void;
  onDeleteNode?: (nodeId: string) => void;
  onCreateRelation?: (input: { sourceId: string; targetId: string }) => Promise<void>;
  onDeleteRelation?: (relationId: string) => Promise<void>;
  onCreateBlock: () => void;
  onCreateTimelineEvent: () => void;
  onCreateNote: () => void;
};

type CanvasEdgeData = {
  palette: {
    stroke: string;
    selectedStroke: string;
    glow: string;
  };
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

function readNodeMetaLabel(node: WorldGraphNode): string {
  const attributes =
    node.attributes && typeof node.attributes === "object" && !Array.isArray(node.attributes)
      ? (node.attributes as Record<string, unknown>)
      : null;

  if (node.entityType === "Event") {
    const eventDate = attributes?.date ?? attributes?.time;
    if (typeof eventDate === "string" && eventDate.trim().length > 0) {
      return eventDate;
    }
    return "Timeline";
  }

  if (node.entityType === "Term") {
    const firstTag = Array.isArray(attributes?.tags)
      ? attributes.tags.find((value) => typeof value === "string" && value.trim().length > 0)
      : null;
    if (typeof firstTag === "string") {
      return `#${firstTag}`;
    }
    return "Reference";
  }

  if (typeof node.firstAppearance === "string" && node.firstAppearance.trim().length > 0) {
    return node.firstAppearance.trim();
  }

  return "Canvas";
}

function buildEdgeStyle(
  palette: CanvasEdgeData["palette"],
  selected: boolean,
) {
  const stroke = selected ? palette.selectedStroke : palette.stroke;

  return {
    style: {
      stroke,
      strokeWidth: selected ? 2.35 : 1.8,
      filter: selected ? `drop-shadow(0 0 10px ${palette.glow})` : undefined,
    },
    labelStyle: {
      fill: selected ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.52)",
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.06em",
    },
    labelBgStyle: {
      fill: "rgba(11,14,19,0.92)",
      stroke,
      strokeWidth: 1,
    },
  };
}

function decorateEdges(
  edges: Edge<CanvasEdgeData>[],
  selectedEdgeId: string | null,
): Edge<CanvasEdgeData>[] {
  return edges.map((edge) => {
    const palette =
      edge.data?.palette ?? {
        stroke: "rgba(255,255,255,0.22)",
        selectedStroke: "rgba(255,255,255,0.95)",
        glow: "rgba(255,255,255,0.18)",
      };
    const selected = edge.id === selectedEdgeId;

    return {
      ...edge,
      selected,
      ...buildEdgeStyle(palette, selected),
    };
  });
}

const buildFlowNodes = (
  nodes: WorldGraphNode[],
  edges: EntityRelation[],
  onDeleteNode?: (nodeId: string) => void,
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
      metaLabel: readNodeMetaLabel(node),
      subType: node.subType,
      onDelete: onDeleteNode,
    },
  }));
};

const buildFlowEdges = (
  edges: EntityRelation[],
  nodes: WorldGraphNode[],
): Edge<CanvasEdgeData>[] => {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));

  return edges.map((edge) => {
    const sourceNode = nodesById.get(edge.sourceId);
    const sourceTheme = sourceNode
      ? ENTITY_TYPE_CANVAS_THEME[sourceNode.entityType]
      : ENTITY_TYPE_CANVAS_THEME.WorldEntity;
    const palette = {
      stroke: sourceTheme.edge,
      selectedStroke: sourceTheme.selectedEdge,
      glow: sourceTheme.glow,
    };

    return {
      id: edge.id,
      source: edge.sourceId,
      target: edge.targetId,
      label: edge.relation.replaceAll("_", " "),
      animated: false,
      type: "smoothstep",
      data: { palette },
      interactionWidth: 28,
      labelBgPadding: [10, 4],
      labelBgBorderRadius: 999,
      ...buildEdgeStyle(palette, false),
    };
  });
};

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
  onDeleteNode,
  onCreateRelation,
  onDeleteRelation,
  onCreateBlock,
  onCreateTimelineEvent,
  onCreateNote,
  summary,
}: {
  graphNodes: Node<CanvasGraphNodeData>[];
  graphEdges: Edge<CanvasEdgeData>[];
  timelineNodes: WorldGraphNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onNodePositionCommit?: (input: { id: string; x: number; y: number }) => void;
  onDeleteNode?: (nodeId: string) => void;
  onCreateRelation?: (input: { sourceId: string; targetId: string }) => Promise<void>;
  onDeleteRelation?: (relationId: string) => Promise<void>;
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
  const [edges, setEdges] = useState<Edge<CanvasEdgeData>[]>(graphEdges);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
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
    setEdges(decorateEdges(graphEdges, selectedEdgeId));
  }, [graphEdges, selectedEdgeId]);

  useEffect(() => {
    setNodes((currentNodes) => {
      const activeNodeId =
        currentNodes.find((node) => node.selected)?.id ?? null;
      if (activeNodeId === selectedNodeId) {
        return currentNodes;
      }
      return currentNodes.map((node) => ({
        ...node,
        selected: node.id === selectedNodeId,
      }));
    });
  }, [selectedNodeId]);

  useEffect(() => {
    if (selectedNodeId) {
      setSelectedEdgeId(null);
    }
  }, [selectedNodeId]);

  const handleNodesChange = (changes: NodeChange[]) => {
    setNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
  };

  const handleEdgesChange = (changes: EdgeChange[]) => {
    setEdges((currentEdges) =>
      decorateEdges(applyEdgeChanges(changes, currentEdges), selectedEdgeId),
    );

    const selectedChange = [...changes].reverse().find(
      (change) => change.type === "select",
    );
    if (selectedChange?.type === "select") {
      setSelectedEdgeId(selectedChange.selected ? selectedChange.id : null);
    }
  };

  const handleConnect = (connection: Connection) => {
    if (!connection.source || !connection.target || !onCreateRelation) {
      return;
    }
    void onCreateRelation({
      sourceId: connection.source,
      targetId: connection.target,
    });
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
          setSelectedEdgeId(null);
          onSelectNode(node.id);
        }}
        onEdgeClick={(_, edge) => {
          setIsHudVisible(false);
          setSelectedEdgeId(edge.id);
          onSelectNode(null);
        }}
        onPaneClick={() => {
          setIsHudVisible(false);
          setSelectedEdgeId(null);
          onSelectNode(null);
        }}
        onNodesDelete={(deletedNodes) => {
          deletedNodes.forEach((node) => {
            onDeleteNode?.(node.id);
          });
          setSelectedEdgeId(null);
        }}
        onEdgesDelete={(deletedEdges) => {
          deletedEdges.forEach((edge) => {
            void onDeleteRelation?.(edge.id);
          });
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
        deleteKeyCode={["Backspace", "Delete"]}
        panOnDrag={[2]}
        panOnScroll
        selectionOnDrag
        selectionMode={SelectionMode.Partial}
        onlyRenderVisibleElements
        zoomOnDoubleClick={false}
        selectNodesOnDrag={false}
        nodesConnectable
        className="bg-[#0f1319]"
      >
        <Background
          color="rgba(255,255,255,0.06)"
          gap={30}
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
                  {selectedEdgeId ? "relation" : summary.hasSelection ? "selection" : "idle"}
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
  onDeleteNode,
  onCreateRelation,
  onDeleteRelation,
  onCreateBlock,
  onCreateTimelineEvent,
  onCreateNote,
}: CanvasViewProps) {
  const flowNodes = useMemo(
    () => buildFlowNodes(nodes, edges, onDeleteNode),
    [edges, nodes, onDeleteNode],
  );
  const flowEdges = useMemo(() => buildFlowEdges(edges, nodes), [edges, nodes]);
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
          onDeleteNode={onDeleteNode}
          onCreateRelation={onCreateRelation}
          onDeleteRelation={onDeleteRelation}
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
