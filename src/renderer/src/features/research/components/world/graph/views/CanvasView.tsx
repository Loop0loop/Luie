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
import { cn } from "@renderer/lib/utils";
import { Badge } from "@renderer/components/ui/badge";
import { Button } from "@renderer/components/ui/button";
import { Card, CardContent } from "@renderer/components/ui/card";
import { CanvasTimelinePalette } from "../components/CanvasTimelinePalette";
import { CanvasToolbar } from "../components/CanvasToolbar";
import type { CanvasGraphNodeData } from "../components/CanvasGraphNodeCard";
import type { CanvasGraphEdgeData } from "../components/CanvasGraphEdge";
import {
  CanvasTimelineBlockData,
  TimelineSequenceNode,
} from "../components/CanvasTimelineBlockNode";
import type { CanvasMemoBlockData } from "../components/CanvasMemoBlockNode";
import {
  CANVAS_EDGE_TYPES,
  CANVAS_NODE_TYPES,
} from "../components/canvasFlowTypes";

type AnyCanvasNodeData =
  | CanvasGraphNodeData
  | CanvasTimelineBlockData
  | CanvasMemoBlockData;

interface CanvasViewProps {
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
}

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
    stroke: "rgba(255,255,255,0.12)",
    selectedStroke: "#f59e0b",
    glow: "rgba(245,158,11,0.1)",
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
    interactionWidth: 20,
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
      const activeNodeId = currentNodes.find((node) => node.selected)?.id ?? null;
      if (activeNodeId === selectedNodeId) return currentNodes;
      return currentNodes.map((node) => ({
        ...node,
        selected: node.id === selectedNodeId,
      }));
    });
  }, [selectedNodeId]);

  useEffect(() => {
    if (selectedNodeId) setSelectedEdgeId(null);
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
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
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

  const handleMemoDataChange = useCallback((id: string, patch: Partial<Omit<CanvasMemoBlockData, "onDelete" | "onDataChange">>) => {
    setNodes((current) =>
      current.map((n) => {
        if (n.id !== id || n.type !== "canvas-memo") return n;
        return { ...n, data: { ...(n.data as CanvasMemoBlockData), ...patch } };
      }),
    );
  }, []);

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
  }, [getViewportCenter, handleDeleteLocalNode, handleMemoDataChange, pushHistory]);

  const handleUpdateTimelineSequence = useCallback((nodeId: string, nextSequence: TimelineSequenceNode[]) => {
    setNodes((current) => current.map(node => {
      if (node.id !== nodeId || node.type !== "canvas-timeline") return node;
      return { ...node, data: { ...node.data, sequence: nextSequence } };
    }));
  }, []);

  const handlePickTimelineEvent = useCallback((nodeId: string) => {
    const source = timelineNodes.find((n) => n.id === nodeId);
    if (!source) return;
    const position = getViewportCenter();
    const id = generateLocalId("timeline");
    
    const newNode: Node<CanvasTimelineBlockData> = {
      id,
      type: "canvas-timeline",
      position,
      draggable: true,
      data: {
        label: source.name,
        sequence: [{ id: `seq-${Date.now()}`, content: source.name, isHeld: false, topBranches: [], bottomBranches: [] }],
        onDelete: handleDeleteLocalNode,
        onUpdateSequence: handleUpdateTimelineSequence,
      },
    };
    setNodes((current) => [...current, newNode]);
    onSelectNode(null);
  }, [timelineNodes, getViewportCenter, handleDeleteLocalNode, handleUpdateTimelineSequence, onSelectNode]);

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
        sequence: [{ id: `seq-${Date.now()}`, content: "여정의 시작", isHeld: false, topBranches: [], bottomBranches: [] }],
        onDelete: handleDeleteLocalNode,
        onUpdateSequence: handleUpdateTimelineSequence,
      },
    };
    setNodes((current) => {
      const next = [...current, newNode];
      pushHistory(next);
      return next;
    });
  }, [getViewportCenter, handleDeleteLocalNode, handleUpdateTimelineSequence, pushHistory]);

  const handleNodesChange = (changes: NodeChange[]) => setNodes((currentNodes) => applyNodeChanges(changes, currentNodes));

  const handleEdgesChange = (changes: EdgeChange[]) => {
    setEdges((currentEdges) => decorateEdges(applyEdgeChanges(changes, currentEdges), selectedEdgeId));
    const selectedChange = [...changes].reverse().find((change) => change.type === "select");
    if (selectedChange?.type === "select") {
      setSelectedEdgeId(selectedChange.selected ? selectedChange.id : null);
    }
  };

  const handleConnect = (connection: Connection) => {
    if (!connection.source || !connection.target || !onCreateRelation) return;
    void onCreateRelation({ sourceId: connection.source, targetId: connection.target });
  };

  return (
    <div className="absolute inset-0">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={CANVAS_NODE_TYPES}
        edgeTypes={CANVAS_EDGE_TYPES}
        minZoom={0.4}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.85 }}
        proOptions={{ hideAttribution: true }}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onNodeClick={(_, node) => {
          setIsHudVisible(false);
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
            if (node.type === "custom-entity") onDeleteNode?.(node.id);
          });
          setSelectedEdgeId(null);
        }}
        onEdgesDelete={(deletedEdges) => {
          deletedEdges.forEach((edge) => void onDeleteRelation?.(edge.id));
        }}
        onNodeDragStart={(_, node) => { draggingNodeIdRef.current = node.id; }}
        onNodeDragStop={(_, node) => {
          draggingNodeIdRef.current = null;
          if (node.type === "custom-entity") {
            onNodePositionCommit?.({ id: node.id, x: node.position.x, y: node.position.y });
          }
        }}
        deleteKeyCode={["Backspace", "Delete"]}
        panOnDrag={[2]}
        panOnScroll
        selectionOnDrag
        selectionMode={SelectionMode.Partial}
        connectionMode={ConnectionMode.Loose}
        className="bg-[#0f1319]"
      >
        <Background color="rgba(255,255,255,0.04)" gap={32} size={1} variant={BackgroundVariant.Dots} />
      </ReactFlow>

      {/* HUD - VS Code Inspired */}
      <div className={cn(
        "absolute left-6 top-6 z-10 transition-all duration-300",
        !isHudVisible && "opacity-0 pointer-events-none -translate-y-2"
      )}>
        <Card className="w-64 border-white/5 bg-background/80 shadow-2xl backdrop-blur-xl">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-500 border-amber-500/20">
                Explorer
              </Badge>
              <span className="text-[10px] text-muted-foreground font-medium">
                {summary.nodeCount} nodes / {summary.edgeCount} links
              </span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" className="flex-1 h-8 text-xs font-bold" onClick={() => onSelectNode(null)}>
                Clear Selection
              </Button>
              <Button size="sm" variant="outline" className="flex-1 h-8 text-xs font-bold border-white/10" onClick={() => void reactFlow.fitView({ padding: 0.2 })}>
                Reset View
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control Bar - High Quality Minimalist */}
      <div className="absolute right-6 top-6 z-10 flex flex-col gap-3">
        <div className="flex flex-col overflow-hidden border border-white/10 rounded-xl bg-background/80 shadow-2xl backdrop-blur-xl">
          {[
            { icon: Plus, title: "Zoom In", onClick: () => void reactFlow.zoomIn() },
            { icon: Minus, title: "Zoom Out", onClick: () => void reactFlow.zoomOut() },
            { icon: RefreshCw, title: "Fit View", onClick: () => void reactFlow.fitView({ padding: 0.2 }) },
            { icon: Maximize2, title: "Full Screen", onClick: () => void reactFlow.fitView({ padding: 0.05 }) }
          ].map((ctrl, i) => (
            <button
              key={i}
              type="button"
              className="flex items-center justify-center w-10 h-10 transition-colors border-b last:border-0 border-white/5 text-muted-foreground hover:text-foreground hover:bg-white/5"
              title={ctrl.title}
              onClick={ctrl.onClick}
            >
              <ctrl.icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        <div className="flex flex-col overflow-hidden border border-white/10 rounded-xl bg-background/80 shadow-2xl backdrop-blur-xl">
          {[
            { icon: RotateCcw, title: "Undo", onClick: handleUndo },
            { icon: RotateCw, title: "Redo", onClick: handleRedo }
          ].map((ctrl, i) => (
            <button
              key={i}
              type="button"
              className="flex items-center justify-center w-10 h-10 transition-colors border-b last:border-0 border-white/5 text-muted-foreground hover:text-foreground hover:bg-white/5"
              title={ctrl.title}
              onClick={ctrl.onClick}
            >
              <ctrl.icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      <CanvasToolbar onCreateBlock={onCreateBlock} onOpenTimelinePalette={() => setTimelinePaletteOpen(true)} onCreateNote={handleCreateMemo} />

      <CanvasTimelinePalette
        open={timelinePaletteOpen}
        events={timelineNodes}
        onClose={() => setTimelinePaletteOpen(false)}
        onCreateEvent={() => { handleCreateTimelineBlock(); setTimelinePaletteOpen(false); }}
        onPickEvent={(nodeId) => { handlePickTimelineEvent(nodeId); setTimelinePaletteOpen(false); }}
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
  const flowNodes = useMemo(() => buildFlowNodes(nodes, onDeleteNode, onAddTimelineBranch), [nodes, onDeleteNode, onAddTimelineBranch]);
  const flowEdges = useMemo(() => buildFlowEdges(edges, (id) => void onDeleteRelation?.(id)), [edges, onDeleteRelation]);
  const timelineNodes = useMemo(() => nodes.filter((node) => node.entityType === "Event"), [nodes]);
  const summary = useMemo(() => ({
    nodeCount: nodes.length,
    edgeCount: edges.length,
    hasSelection: Boolean(selectedNodeId),
  }), [edges.length, nodes.length, selectedNodeId]);

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

      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none">
          <Card className="max-w-md text-center border-dashed border-white/10 bg-background/60 backdrop-blur-xl shadow-2xl">
            <CardContent className="pt-6 space-y-4">
              <p className="text-xl font-black tracking-tight text-foreground/80">Canvas is Ready</p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Add your first entity to start building your world.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
