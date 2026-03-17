import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  RotateCw,
  RefreshCw,
} from "lucide-react";
import ReactFlow, {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  ReactFlowProvider,
  SelectionMode,
  ConnectionMode,
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
import type { CanvasGraphEdgeData } from "../components/CanvasGraphEdge";
import type { CanvasTimelineBlockData } from "../components/CanvasTimelineBlockNode";
import type { CanvasMemoBlockData } from "../components/CanvasMemoBlockNode";
import {
  CANVAS_EDGE_TYPES,
  CANVAS_NODE_TYPES,
} from "../components/canvasFlowTypes";

type AnyCanvasNodeData =
  | CanvasGraphNodeData
  | CanvasTimelineBlockData
  | CanvasMemoBlockData;

type CanvasViewProps = {
  nodes: WorldGraphNode[];
  edges: EntityRelation[];
  selectedNodeId: string | null;
  autoLayoutTrigger: number;
  onSelectNode: (nodeId: string | null) => void;
  onNodePositionCommit?: (input: { id: string; x: number; y: number }) => void;
  onDeleteNode?: (nodeId: string) => void;
  onCreateRelation?: (input: { sourceId: string; targetId: string }) => Promise<void>;
  onDeleteRelation?: (relationId: string) => Promise<void>;
  onCreateBlock: () => void;
  onAddTimelineBranch?: (sourceNodeId: string) => void;
  onCreateNote: () => void;
};

function readPosition(node: WorldGraphNode, index: number) {
  const fallbackColumn = index % 4;
  const fallbackRow = Math.floor(index / 4);

  return {
    x: Number.isFinite(node.positionX) && node.positionX !== 0 ? node.positionX : 120 + fallbackColumn * 280,
    y: Number.isFinite(node.positionY) && node.positionY !== 0 ? node.positionY : 120 + fallbackRow * 220,
  };
}

function decorateEdges(
  edges: Edge<CanvasGraphEdgeData>[],
  selectedEdgeId: string | null,
): Edge<CanvasGraphEdgeData>[] {
  return edges.map((edge) => ({
    ...edge,
    selected: edge.id === selectedEdgeId,
  }));
}

const buildFlowNodes = (
  nodes: WorldGraphNode[],
  onDeleteNode?: (nodeId: string) => void,
  onAddTimelineBranch?: (sourceNodeId: string) => void,
): Node<CanvasGraphNodeData>[] => {
  return nodes.map((node, index) => ({
    id: node.id,
    type: node.entityType === "Event" ? "canvas-timeline" : "custom-entity",
    draggable: true,
    position: readPosition(node, index),
    data: {
      label: node.name,
      entityType: node.entityType,
      description: node.description?.trim() || "",
      date: (node.attributes as any)?.date || (node.attributes as any)?.time,
      onDelete: onDeleteNode,
      onAddBranch: onAddTimelineBranch,
    },
  }));
};

const buildFlowEdges = (
  edges: EntityRelation[],
  onDeleteRelation?: (id: string) => void,
): Edge<CanvasGraphEdgeData>[] => {
  const palette = {
    stroke: "rgba(255,255,255,0.15)",
    selectedStroke: "rgba(255,255,255,0.6)",
    glow: "rgba(255,255,255,0.05)",
  };

  return edges.map((edge) => ({
    id: edge.id,
    source: edge.sourceId,
    target: edge.targetId,
    label: edge.relation.replaceAll("_", " "),
    type: "canvas-edge",
    data: {
      palette,
      onDelete: onDeleteRelation,
    },
    interactionWidth: 28,
  }));
};

function mergeIncomingNodes(
  currentNodes: Node<AnyCanvasNodeData>[],
  incomingNodes: Node<CanvasGraphNodeData>[],
  lockedNodeId: string | null,
): Node<AnyCanvasNodeData>[] {
  const currentById = new Map(currentNodes.map((node) => [node.id, node]));
  const incomingIds = new Set(incomingNodes.map((n) => n.id));

  const localNodes = currentNodes.filter(
    (n) => n.type === "canvas-timeline" || n.type === "canvas-memo",
  );

  const merged = incomingNodes.map((incomingNode) => {
    const currentNode = currentById.get(incomingNode.id);
    if (!currentNode || incomingNode.id === lockedNodeId) {
      return incomingNode as Node<AnyCanvasNodeData>;
    }
    return {
      ...incomingNode,
      position: currentNode.position,
      selected: currentNode.selected,
    } as Node<AnyCanvasNodeData>;
  });

  const preservedLocals = localNodes.filter((n) => !incomingIds.has(n.id));
  return [...merged, ...preservedLocals];
}

let localNodeCounter = 0;
function generateLocalId(prefix: string) {
  localNodeCounter += 1;
  return `${prefix}-${Date.now()}-${localNodeCounter}`;
}

function CanvasFlowSurface({
  graphNodes,
  graphEdges,
  timelineNodes,
  selectedNodeId,
  autoLayoutTrigger,
  onSelectNode,
  onNodePositionCommit,
  onDeleteNode,
  onCreateRelation,
  onDeleteRelation,
  onCreateBlock,
  summary,
}: {
  graphNodes: Node<CanvasGraphNodeData>[];
  graphEdges: Edge<CanvasGraphEdgeData>[];
  timelineNodes: WorldGraphNode[];
  selectedNodeId: string | null;
  autoLayoutTrigger: number;
  onSelectNode: (nodeId: string | null) => void;
  onNodePositionCommit?: (input: { id: string; x: number; y: number }) => void;
  onDeleteNode?: (nodeId: string) => void;
  onCreateRelation?: (input: {
    sourceId: string;
    targetId: string;
  }) => Promise<void>;
  onDeleteRelation?: (relationId: string) => Promise<void>;
  onCreateBlock: () => void;
  summary: {
    nodeCount: number;
    edgeCount: number;
    hasSelection: boolean;
  };
}) {
  const [nodes, setNodes] = useState<Node<AnyCanvasNodeData>[]>(graphNodes);
  const [edges, setEdges] = useState<Edge<CanvasGraphEdgeData>[]>(graphEdges);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [timelinePaletteOpen, setTimelinePaletteOpen] = useState(false);
  const [isHudVisible, setIsHudVisible] = useState(true);
  const draggingNodeIdRef = useRef<string | null>(null);
  const reactFlow = useReactFlow<AnyCanvasNodeData>();
  const historyRef = useRef<Node<AnyCanvasNodeData>[][]>([]);
  const historyIndexRef = useRef(-1);

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

  useEffect(() => {
    if (autoLayoutTrigger === 0) return;
    const COLS = 4;
    const COL_GAP = 280;
    const ROW_GAP = 220;
    const OFFSET_X = 120;
    const OFFSET_Y = 120;
    setNodes((currentNodes) =>
      currentNodes.map((node, i) => ({
        ...node,
        position: {
          x: OFFSET_X + (i % COLS) * COL_GAP,
          y: OFFSET_Y + Math.floor(i / COLS) * ROW_GAP,
        },
      })),
    );
    setTimeout(() => {
      void reactFlow.fitView({ padding: 0.24, duration: 300 });
    }, 50);
  }, [autoLayoutTrigger, reactFlow]);

  const getViewportCenter = useCallback(() => {
    const { x, y, zoom } = reactFlow.getViewport();
    const el = document.querySelector(".react-flow");
    const width = el?.clientWidth ?? 800;
    const height = el?.clientHeight ?? 600;
    return {
      x: (-x + width / 2) / zoom - 140,
      y: (-y + height / 2) / zoom - 60,
    };
  }, [reactFlow]);

  const pushHistory = useCallback((snapshot: Node<AnyCanvasNodeData>[]) => {
    historyRef.current = historyRef.current.slice(
      0,
      historyIndexRef.current + 1,
    );
    historyRef.current.push(snapshot);
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
    } else {
      historyIndexRef.current += 1;
    }
  }, []);

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const snapshot = historyRef.current[historyIndexRef.current];
    if (snapshot) setNodes(snapshot);
  }, []);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const snapshot = historyRef.current[historyIndexRef.current];
    if (snapshot) setNodes(snapshot);
  }, []);

  const handleDeleteLocalNode = useCallback((id: string) => {
    setNodes((current) => current.filter((n) => n.id !== id));
  }, []);

  const handleMemoDataChange = useCallback(
    (
      id: string,
      patch: Partial<Omit<CanvasMemoBlockData, "onDelete" | "onDataChange">>,
    ) => {
      setNodes((current) =>
        current.map((n) => {
          if (n.id !== id || n.type !== "canvas-memo") return n;
          return {
            ...n,
            data: { ...(n.data as CanvasMemoBlockData), ...patch },
          };
        }),
      );
    },
    [],
  );

  const handleCreateMemo = useCallback(() => {
    const position = getViewportCenter();
    const id = generateLocalId("memo");
    const newNode: Node<CanvasMemoBlockData> = {
      id,
      type: "canvas-memo",
      position,
      draggable: true,
      data: {
        title: "",
        tags: [],
        body: "",
        onDelete: handleDeleteLocalNode,
        onDataChange: handleMemoDataChange,
      },
    };
    setNodes((current) => {
      const next = [...current, newNode];
      pushHistory(next);
      return next;
    });
  }, [
    getViewportCenter,
    handleDeleteLocalNode,
    handleMemoDataChange,
    pushHistory,
  ]);

  const handlePickTimelineEvent = useCallback(
    (nodeId: string) => {
      const source = timelineNodes.find((n) => n.id === nodeId);
      if (!source) return;
      const position = getViewportCenter();
      const id = generateLocalId("timeline");
      const attrs =
        source.attributes &&
        typeof source.attributes === "object" &&
        !Array.isArray(source.attributes)
          ? (source.attributes as Record<string, unknown>)
          : null;
      const date =
        typeof attrs?.date === "string"
          ? attrs.date
          : typeof attrs?.time === "string"
            ? attrs.time
            : undefined;

      const newNode: Node<CanvasTimelineBlockData> = {
        id,
        type: "canvas-timeline",
        position,
        draggable: true,
        data: {
          label: source.name,
          date,
          description: source.description?.trim() ?? undefined,
          onDelete: handleDeleteLocalNode,
        },
      };
      setNodes((current) => [...current, newNode]);
      onSelectNode(null);
    },
    [
      timelineNodes,
      getViewportCenter,
      handleDeleteLocalNode,
      onSelectNode,
      pushHistory,
    ],
  );

  const handleCreateTimelineBlock = useCallback(() => {
    const position = getViewportCenter();
    const id = generateLocalId("timeline");
    const newNode: Node<CanvasTimelineBlockData> = {
      id,
      type: "canvas-timeline",
      position,
      draggable: true,
      data: {
        label: "새 타임라인",
        date: undefined,
        description: undefined,
        onDelete: handleDeleteLocalNode,
      },
    };
    setNodes((current) => {
      const next = [...current, newNode];
      pushHistory(next);
      return next;
    });
  }, [
    getViewportCenter,
    handleDeleteLocalNode,
    pushHistory,
  ]);

  const handleNodesChange = (changes: NodeChange[]) => {
    setNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
  };

  const handleEdgesChange = (changes: EdgeChange[]) => {
    setEdges((currentEdges) =>
      decorateEdges(applyEdgeChanges(changes, currentEdges), selectedEdgeId),
    );

    const selectedChange = [...changes]
      .reverse()
      .find((change) => change.type === "select");
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
            if (node.type === "custom-entity") {
              onDeleteNode?.(node.id);
            }
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
          if (node.type === "custom-entity") {
            onNodePositionCommit?.({
              id: node.id,
              x: node.position.x,
              y: node.position.y,
            });
          }
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
        connectionMode={ConnectionMode.Loose}
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
                  {selectedEdgeId
                    ? "relation"
                    : summary.hasSelection
                      ? "selection"
                      : "idle"}
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

      <div className="pointer-events-none absolute right-4 top-24 z-10 flex flex-col gap-3">
        <div className="pointer-events-auto flex flex-col rounded-xl border border-white/8 bg-[#13171e]/90 shadow-xl backdrop-blur overflow-hidden">
          {[
            { icon: Plus, title: "줌 인", onClick: () => void reactFlow.zoomIn({ duration: 200 }) },
            { icon: Minus, title: "줌 아웃", onClick: () => void reactFlow.zoomOut({ duration: 200 }) },
            { icon: RefreshCw, title: "뷰 맞추기", onClick: () => void reactFlow.fitView({ padding: 0.24, duration: 300 }) },
            { icon: Maximize2, title: "전체 화면", onClick: () => void reactFlow.fitView({ padding: 0.05, duration: 300 }) }
          ].map((ctrl, i) => (
            <button
              key={i}
              type="button"
              className="flex h-10 w-10 items-center justify-center text-fg/45 transition-colors hover:bg-white/5 hover:text-fg/80 border-b border-white/5 last:border-0"
              title={ctrl.title}
              onClick={ctrl.onClick}
            >
              <ctrl.icon className="h-[18px] w-[18px]" />
            </button>
          ))}
        </div>

        <div className="pointer-events-auto flex flex-col rounded-xl border border-white/8 bg-[#13171e]/90 shadow-xl backdrop-blur overflow-hidden">
          {[
            { icon: RotateCcw, title: "실행 취소", onClick: handleUndo },
            { icon: RotateCw, title: "다시 실행", onClick: handleRedo }
          ].map((ctrl, i) => (
            <button
              key={i}
              type="button"
              className="flex h-10 w-10 items-center justify-center text-fg/45 transition-colors hover:bg-white/5 hover:text-fg/80 border-b border-white/5 last:border-0"
              title={ctrl.title}
              onClick={ctrl.onClick}
            >
              <ctrl.icon className="h-[17px] w-[17px]" />
            </button>
          ))}
        </div>
      </div>

      <CanvasToolbar
        onCreateBlock={onCreateBlock}
        onOpenTimelinePalette={() => setTimelinePaletteOpen(true)}
        onCreateNote={handleCreateMemo}
      />

      <CanvasTimelinePalette
        open={timelinePaletteOpen}
        events={timelineNodes}
        onClose={() => setTimelinePaletteOpen(false)}
        onCreateEvent={() => {
          handleCreateTimelineBlock();
          setTimelinePaletteOpen(false);
        }}
        onPickEvent={(nodeId) => {
          handlePickTimelineEvent(nodeId);
          setTimelinePaletteOpen(false);
        }}
      />
    </div>
  );
}

export function CanvasView({
  nodes,
  edges,
  selectedNodeId,
  autoLayoutTrigger,
  onSelectNode,
  onNodePositionCommit,
  onDeleteNode,
  onCreateRelation,
  onDeleteRelation,
  onCreateBlock,
  onAddTimelineBranch,
  onCreateNote: _onCreateNote,
}: CanvasViewProps) {
  const flowNodes = useMemo(
    () => buildFlowNodes(nodes, onDeleteNode, onAddTimelineBranch),
    [nodes, onDeleteNode, onAddTimelineBranch],
  );
  const flowEdges = useMemo(
    () => buildFlowEdges(edges, (id) => void onDeleteRelation?.(id)),
    [edges, onDeleteRelation],
  );
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
          autoLayoutTrigger={autoLayoutTrigger}
          onSelectNode={onSelectNode}
          onNodePositionCommit={onNodePositionCommit}
          onDeleteNode={onDeleteNode}
          onCreateRelation={onCreateRelation}
          onDeleteRelation={onDeleteRelation}
          onCreateBlock={onCreateBlock}
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
