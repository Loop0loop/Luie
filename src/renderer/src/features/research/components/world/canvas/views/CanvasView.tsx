import { useCallback, useMemo } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  ConnectionMode,
  MiniMap,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "reactflow";
import "reactflow/dist/style.css";
import type { WorldGraphNode, WorldGraphCanvasBlock, WorldGraphCanvasEdge } from "@shared/types";
import {
  GRAPH_CANVAS_FLOW_MIN_ZOOM,
  GRAPH_CANVAS_FLOW_MAX_ZOOM,
  GRAPH_CANVAS_FLOW_DEFAULT_VIEWPORT,
  GRAPH_CANVAS_BG_DOT_GAP_PX,
  GRAPH_CANVAS_BG_DOT_SIZE_PX,
  GRAPH_CANVAS_FIT_VIEW_PADDING,
} from "../shared";
import { GRAPH_ENTITY_CANVAS_THEME_TOKENS } from "../shared/theme/graphThemeConstants";
import { EntityNode } from "../components/nodes/EntityNode";
import { MemoNode } from "../components/nodes/MemoNode";
import { CanvasEdge } from "../components/edges/CanvasEdge";
import { CanvasToolbar } from "../components/toolbar/CanvasToolbar";
import { useCanvasInteractions } from "../hooks/useCanvasInteractions";
import type { WorldEntitySourceType } from "@shared/types";

const NODE_TYPES = { entityNode: EntityNode, memoNode: MemoNode };
const EDGE_TYPES = { canvasEdge: CanvasEdge };

function buildFlowNodes(graphNodes: WorldGraphNode[], canvasBlocks: WorldGraphCanvasBlock[]): Node[] {
  const entityNodes: Node[] = graphNodes.map((n) => ({
    id: n.id,
    type: "entityNode",
    position: { x: n.positionX ?? 0, y: n.positionY ?? 0 },
    data: {
      label: n.name,
      entityType: n.entityType as WorldEntitySourceType,
      description: n.description ?? undefined,
    },
  }));

  const memoNodes: Node[] = canvasBlocks
    .filter((b) => b.type === "memo")
    .map((b) => ({
      id: b.id,
      type: "memoNode",
      position: { x: b.positionX ?? 0, y: b.positionY ?? 0 },
      data: { content: b.data.body ?? "" },
    }));

  return [...entityNodes, ...memoNodes];
}

function buildFlowEdges(canvasEdges: WorldGraphCanvasEdge[]): Edge[] {
  return canvasEdges.map((e) => ({
    id: e.id,
    source: e.sourceId,
    target: e.targetId,
    type: "canvasEdge",
    data: { label: e.relation || undefined, color: e.color ?? undefined },
  }));
}

interface CanvasViewInnerProps {
  graphNodes: WorldGraphNode[];
  canvasBlocks: WorldGraphCanvasBlock[];
  canvasEdges: WorldGraphCanvasEdge[];
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onCreateEntity: (entityType: WorldEntitySourceType) => void;
  onCreateMemo: () => void;
  onUpdateNodePosition: (id: string, x: number, y: number) => void;
  onUpdateEdges: (edges: WorldGraphCanvasEdge[]) => void;
}

function CanvasViewInner({
  graphNodes,
  canvasBlocks,
  canvasEdges,
  onSelectNode,
  onCreateEntity,
  onCreateMemo,
  onUpdateNodePosition,
}: CanvasViewInnerProps) {
  const initialNodes = useMemo(() => buildFlowNodes(graphNodes, canvasBlocks), [graphNodes, canvasBlocks]);
  const initialEdges = useMemo(() => buildFlowEdges(canvasEdges), [canvasEdges]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const { handleConnect, handleFitView, handleAutoLayout, isAutoLayoutRunning } =
    useCanvasInteractions(nodes, edges, onNodesChange as never, onEdgesChange as never);

  const handleNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onUpdateNodePosition(node.id, node.position.x, node.position.y);
    },
    [onUpdateNodePosition],
  );

  const miniMapNodeColor = useCallback((node: Node) => {
    const entityType = node.data?.entityType as WorldEntitySourceType | undefined;
    if (!entityType) return "rgba(255,255,255,0.08)";
    return GRAPH_ENTITY_CANVAS_THEME_TOKENS[entityType]?.accent ?? "rgba(255,255,255,0.08)";
  }, []);

  return (
    <div className="relative h-full w-full">
      <CanvasToolbar
        onCreateEntity={onCreateEntity}
        onCreateMemo={onCreateMemo}
        onAutoLayout={handleAutoLayout}
        onFitView={handleFitView}
      />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeDragStop={handleNodeDragStop}
        onNodeClick={(_, node) => onSelectNode(node.id)}
        onPaneClick={() => onSelectNode(null)}
        connectionMode={ConnectionMode.Loose}
        minZoom={GRAPH_CANVAS_FLOW_MIN_ZOOM}
        maxZoom={GRAPH_CANVAS_FLOW_MAX_ZOOM}
        defaultViewport={GRAPH_CANVAS_FLOW_DEFAULT_VIEWPORT}
        deleteKeyCode="Delete"
        fitView
        fitViewOptions={{ padding: GRAPH_CANVAS_FIT_VIEW_PADDING }}
        proOptions={{ hideAttribution: true }}
        className="bg-app"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={GRAPH_CANVAS_BG_DOT_GAP_PX}
          size={GRAPH_CANVAS_BG_DOT_SIZE_PX}
          color="rgba(255,255,255,0.06)"
        />
        <MiniMap
          nodeColor={miniMapNodeColor}
          maskColor="rgba(0,0,0,0.4)"
          className="!rounded-xl !border !border-border/30 !bg-panel/80 !backdrop-blur-sm"
          position="bottom-right"
        />
      </ReactFlow>

      {isAutoLayoutRunning && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rounded-lg border border-border/40 bg-panel/90 px-3 py-1.5 text-[12px] text-muted backdrop-blur-sm">
            Laying out…
          </span>
        </div>
      )}
    </div>
  );
}

export function CanvasView(props: CanvasViewInnerProps) {
  return (
    <ReactFlowProvider>
      <CanvasViewInner {...props} />
    </ReactFlowProvider>
  );
}
