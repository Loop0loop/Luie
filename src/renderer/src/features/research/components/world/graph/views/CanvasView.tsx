import { useCallback, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  ReactFlowProvider,
  SelectionMode,
  type ConnectionMode,
  type Edge,
  type Node,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";
import type {
  EntityRelation,
  WorldGraphCanvasBlock,
  WorldGraphCanvasEdge,
  WorldGraphNode,
} from "@shared/types";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { useCanvasBlockEditor } from "../hooks/useCanvasBlockEditor";
import { useCanvasFlowInteractions } from "../hooks/useCanvasFlowInteractions";
import { CanvasFlowControls } from "../components/CanvasFlowControls";
import { CanvasTimelinePalette } from "../components/CanvasTimelinePalette";
import { CanvasToolbar } from "../components/CanvasToolbar";
import type { CanvasGraphEdgeData } from "../components/CanvasGraphEdge";
import type { CanvasGraphNodeData } from "../components/CanvasGraphNodeCard";
import {
  CANVAS_EDGE_TYPES,
  CANVAS_NODE_TYPES,
} from "../components/canvasFlowTypes";
import {
  buildFlowEdges,
  buildFlowNodes,
  CANVAS_EDGE_COLORS,
  type AnyCanvasNodeData,
} from "../utils/canvasFlowUtils";

interface CanvasViewProps {
  nodes: WorldGraphNode[];
  edges: EntityRelation[];
  canvasBlocks: WorldGraphCanvasBlock[];
  canvasEdges: WorldGraphCanvasEdge[];
  selectedNodeId: string | null;
  autoLayoutTrigger: number;
  onSelectNode: (nodeId: string | null) => void;
  onCanvasBlocksCommit?:
    | ((blocks: WorldGraphCanvasBlock[]) => void)
    | ((blocks: WorldGraphCanvasBlock[]) => Promise<void>);
  onCanvasEdgesCommit?:
    | ((edges: WorldGraphCanvasEdge[]) => void)
    | ((edges: WorldGraphCanvasEdge[]) => Promise<void>);
  onNodePositionCommit?: (input: { id: string; x: number; y: number }) => void;
  onDeleteNode?: (nodeId: string) => void;
  onCreateCanvasRelation?: (input: {
    sourceId: string;
    targetId: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
  }) => Promise<void>;
  onDeleteRelation?: (relationId: string) => Promise<void>;
  onCreateBlock: (position?: { x: number; y: number }) => void;
  onAddTimelineBranch?: (sourceNodeId: string) => void;
}


function CanvasFlowSurface({
  graphNodes,
  graphEdges,
  canvasBlocks,
  timelineNodes,
  selectedNodeId,
  autoLayoutTrigger,
  onSelectNode,
  onCanvasBlocksCommit,
  onNodePositionCommit,
  onDeleteNode,
  onConnectNodes,
  onCreateBlock,
}: {
  graphNodes: Node<CanvasGraphNodeData>[];
  graphEdges: Edge<CanvasGraphEdgeData>[];
  canvasBlocks: WorldGraphCanvasBlock[];
  timelineNodes: WorldGraphNode[];
  selectedNodeId: string | null;
  autoLayoutTrigger: number;
  onSelectNode: (nodeId: string | null) => void;
  onCanvasBlocksCommit?: (blocks: WorldGraphCanvasBlock[]) => void;
  onNodePositionCommit?: (input: { id: string; x: number; y: number }) => void;
  onDeleteNode?: (nodeId: string) => void;
  onConnectNodes?: (input: {
    sourceId: string;
    targetId: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
  }) => Promise<void>;
  onCreateBlock: (position?: { x: number; y: number }) => void;
}) {
  const [timelinePaletteOpen, setTimelinePaletteOpen] = useState(false);
  const reactFlow = useReactFlow<AnyCanvasNodeData>();
  const pointerPlacementRef = useRef<{ x: number; y: number } | null>(null);
  const draggingNodeIdRef = useRef<string | null>(null);
  const resolvePlacementPosition = useCallback(() => {
    const screen = pointerPlacementRef.current;
    if (!screen) {
      const viewportReader = reactFlow.getViewport;
      const { x, y, zoom } =
        typeof viewportReader === "function"
          ? viewportReader()
          : { x: 0, y: 0, zoom: 1 };
      const el = document.querySelector(".react-flow");
      const width = el?.clientWidth ?? 800;
      const height = el?.clientHeight ?? 600;
      return {
        x: (-x + width / 2) / zoom - 140,
        y: (-y + height / 2) / zoom - 60,
      };
    }

    const project = reactFlow.screenToFlowPosition;
    if (typeof project === "function") {
      return project(screen);
    }

    return screen;
  }, [reactFlow]);
  const {
    nodes,
    setNodes,
    commitCanvasBlocks,
    handleUndo,
    handleRedo,
    handleCreateMemo,
    handleCreateTimelineBlock,
    handlePickTimelineEvent,
  } = useCanvasBlockEditor({
    graphNodes,
    canvasBlocks,
    timelineNodes,
    onCanvasBlocksCommit,
    onSelectNode,
    resolvePlacementPosition,
    draggingNodeIdRef,
  });
  const {
    edges,
    guideScreenX,
    guideScreenY,
    handleNodesChange,
    handleEdgesChange,
    handleConnect,
    isValidConnection,
    onNodeClick,
    onMoveStart,
    onMoveEnd,
    onEdgeClick,
    onPaneClick,
    onPaneMouseMove,
    onNodesDelete,
    onEdgesDelete,
    onNodeDragStart,
    onNodeDrag,
    onNodeDragStop,
  } = useCanvasFlowInteractions({
    graphNodes,
    graphEdges,
    canvasBlocks,
    selectedNodeId,
    autoLayoutTrigger,
    nodes,
    setNodes,
    commitCanvasBlocks,
    onSelectNode,
    onNodePositionCommit,
    onDeleteNode,
    onConnectNodes,
    reactFlow,
  });

  return (
    <div className="absolute inset-0">
      <style>
        {`
          .react-flow__pane {
            cursor: default !important;
          }
          .react-flow__pane.dragging {
            cursor: grabbing !important;
          }
          .react-flow__node {
            cursor: default !important;
          }
          .react-flow__handle {
            cursor: crosshair !important;
          }
        `}
      </style>
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
        isValidConnection={isValidConnection}
        onNodeClick={onNodeClick}
        onMoveStart={onMoveStart}
        onMoveEnd={onMoveEnd}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onPaneMouseMove={onPaneMouseMove}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        deleteKeyCode={["Backspace", "Delete"]}
        selectionKeyCode="Shift"
        multiSelectionKeyCode={["Meta", "Control"]}
        panOnScroll={true}
        zoomOnScroll={false}
        panOnDrag={[1, 2]}
        selectionOnDrag={true}
        selectionMode={SelectionMode.Partial}
        onlyRenderVisibleElements
        connectionMode={"loose" as ConnectionMode}
        style={{ cursor: "default" }}
        className="bg-[#0f1319]"
      >
        <Background
          color="rgba(255,255,255,0.04)"
          gap={32}
          size={1}
          variant={BackgroundVariant.Dots}
        />
      </ReactFlow>

      {guideScreenX !== null ? (
        <div
          className="pointer-events-none absolute inset-y-0 z-20 w-px bg-amber-400/70"
          style={{ left: `${guideScreenX}px` }}
        />
      ) : null}
      {guideScreenY !== null ? (
        <div
          className="pointer-events-none absolute inset-x-0 z-20 h-px bg-amber-400/70"
          style={{ top: `${guideScreenY}px` }}
        />
      ) : null}

      <CanvasFlowControls
        onZoomIn={() => void reactFlow.zoomIn()}
        onZoomOut={() => void reactFlow.zoomOut()}
        onFitView={() => void reactFlow.fitView({ padding: 0.2 })}
        onFitCanvas={() => void reactFlow.fitView({ padding: 0.05 })}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      <CanvasToolbar
        onCreateBlock={() => onCreateBlock(resolvePlacementPosition())}
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
  canvasBlocks,
  canvasEdges,
  selectedNodeId,
  autoLayoutTrigger,
  onSelectNode,
  onCanvasBlocksCommit,
  onCanvasEdgesCommit,
  onNodePositionCommit,
  onDeleteNode,
  onCreateCanvasRelation,
  onDeleteRelation,
  onCreateBlock,
  onAddTimelineBranch,
}: CanvasViewProps) {
  const updateGraphNode = useWorldBuildingStore(
    (state) => state.updateGraphNode,
  );

  const handleCycleGraphNodeColor = useCallback(
    (nodeId: string) => {
      const node = nodes.find((item) => item.id === nodeId);
      if (!node) {
        return;
      }

      const attributes =
        node.attributes && typeof node.attributes === "object"
          ? (node.attributes as Record<string, unknown>)
          : {};
      const current =
        typeof attributes["canvasColor"] === "string"
          ? (attributes["canvasColor"] as string)
          : CANVAS_EDGE_COLORS[0];
      const index = CANVAS_EDGE_COLORS.indexOf(
        current as (typeof CANVAS_EDGE_COLORS)[number],
      );
      const nextColor =
        CANVAS_EDGE_COLORS[
          (Math.max(0, index) + 1) % CANVAS_EDGE_COLORS.length
        ];

      const payload = {
        ...attributes,
        ["canvasColor"]: nextColor,
      };

      void updateGraphNode({
        id: node.id,
        entityType: node.entityType,
        subType: node.subType,
        name: node.name,
        description: node.description ?? undefined,
        attributes: payload,
      });
    },
    [nodes, updateGraphNode],
  );

  const handleEditGraphNode = useCallback(
    (nodeId: string) => {
      onSelectNode(nodeId);
    },
    [onSelectNode],
  );

  const flowNodes = useMemo(
    () =>
      buildFlowNodes(
        nodes,
        onDeleteNode,
        handleCycleGraphNodeColor,
        handleEditGraphNode,
        onAddTimelineBranch,
      ),
    [
      handleCycleGraphNodeColor,
      handleEditGraphNode,
      nodes,
      onDeleteNode,
      onAddTimelineBranch,
    ],
  );
  const commitCanvasEdges = useCallback(
    (nextEdges: WorldGraphCanvasEdge[]) => {
      onCanvasEdgesCommit?.(nextEdges);
    },
    [onCanvasEdgesCommit],
  );

  const handleDeleteCanvasEdge = useCallback(
    (edgeId: string) => {
      commitCanvasEdges(canvasEdges.filter((edge) => edge.id !== edgeId));
    },
    [canvasEdges, commitCanvasEdges],
  );

  const handleChangeCanvasEdgeColor = useCallback(
    (edgeId: string, nextColor: string) => {
      const nextEdges = canvasEdges.map((edge) => {
        if (edge.id !== edgeId) {
          return edge;
        }

        return {
          ...edge,
          color: nextColor,
        };
      });

      commitCanvasEdges(nextEdges);
    },
    [canvasEdges, commitCanvasEdges],
  );

  const handleChangeCanvasEdgeDirection = useCallback(
    (
      edgeId: string,
      nextDirection: "unidirectional" | "bidirectional" | "none",
    ) => {
      const nextEdges = canvasEdges.map((edge) => {
        if (edge.id !== edgeId) {
          return edge;
        }

        return {
          ...edge,
          direction: nextDirection,
        };
      });

      commitCanvasEdges(nextEdges);
    },
    [canvasEdges, commitCanvasEdges],
  );

  const handleEditCanvasEdgeRelation = useCallback(
    (edgeId: string) => {
      const target = canvasEdges.find((edge) => edge.id === edgeId);
      if (!target) {
        return;
      }

      const nextRelation = window.prompt("관계를 입력하세요", target.relation);
      if (nextRelation === null) {
        return;
      }

      const trimmed = nextRelation.trim();
      if (trimmed.length === 0) {
        return;
      }

      commitCanvasEdges(
        canvasEdges.map((edge) =>
          edge.id === edgeId
            ? {
                ...edge,
                relation: trimmed,
              }
            : edge,
        ),
      );
    },
    [canvasEdges, commitCanvasEdges],
  );

  const handleUpdateCanvasEdge = useCallback(
    (edgeId: string) => {
      const target = canvasEdges.find((edge) => edge.id === edgeId);
      if (!target) {
        return;
      }

      const nextRelation = window.prompt(
        "수정할 관계명을 입력하세요",
        target.relation,
      );
      if (nextRelation === null) {
        return;
      }

      const trimmed = nextRelation.trim();
      if (trimmed.length === 0) {
        return;
      }

      commitCanvasEdges(
        canvasEdges.map((edge) =>
          edge.id === edgeId
            ? {
                ...edge,
                relation: trimmed,
              }
            : edge,
        ),
      );
    },
    [canvasEdges, commitCanvasEdges],
  );

  const flowEdges = useMemo(
    () =>
      buildFlowEdges(edges, canvasEdges, {
        onDeleteRelation: (id) => void onDeleteRelation?.(id),
        onDeleteCanvasEdge: handleDeleteCanvasEdge,
        onChangeCanvasEdgeColor: handleChangeCanvasEdgeColor,
        onChangeCanvasEdgeDirection: handleChangeCanvasEdgeDirection,
        onEditCanvasEdgeRelation: handleEditCanvasEdgeRelation,
        onUpdateCanvasEdge: handleUpdateCanvasEdge,
      }),
    [
      canvasEdges,
      edges,
      handleChangeCanvasEdgeColor,
      handleChangeCanvasEdgeDirection,
      handleDeleteCanvasEdge,
      handleEditCanvasEdgeRelation,
      handleUpdateCanvasEdge,
      onDeleteRelation,
    ],
  );

  const handleConnectNodes = useCallback(
    async ({
      sourceId,
      targetId,
      sourceHandle,
      targetHandle,
    }: {
      sourceId: string;
      targetId: string;
      sourceHandle?: string | null;
      targetHandle?: string | null;
    }) => {
      if (sourceId === targetId) {
        return;
      }

      const normalize = (value?: string | null) => value ?? null;
      const sourceKey = normalize(sourceHandle);
      const targetKey = normalize(targetHandle);
      const existing = canvasEdges.some((edge) => {
        const edgeSourceKey = normalize(edge.sourceHandle);
        const edgeTargetKey = normalize(edge.targetHandle);
        const sameForward =
          edge.sourceId === sourceId &&
          edge.targetId === targetId &&
          edgeSourceKey === sourceKey &&
          edgeTargetKey === targetKey;
        const sameReverse =
          edge.sourceId === targetId &&
          edge.targetId === sourceId &&
          edgeSourceKey === targetKey &&
          edgeTargetKey === sourceKey;
        return sameForward || sameReverse;
      });
      if (existing) {
        return;
      }

      if (onCreateCanvasRelation) {
        await onCreateCanvasRelation({
          sourceId,
          targetId,
          sourceHandle,
          targetHandle,
        });
      }
    },
    [canvasEdges, onCreateCanvasRelation],
  );
  const timelineNodes = useMemo(
    () => nodes.filter((node) => node.entityType === "Event"),
    [nodes],
  );

  return (
    <div className="relative h-full bg-canvas">
      <ReactFlowProvider>
        <CanvasFlowSurface
          graphNodes={flowNodes}
          graphEdges={flowEdges}
          canvasBlocks={canvasBlocks}
          onConnectNodes={handleConnectNodes}
          timelineNodes={timelineNodes}
          selectedNodeId={selectedNodeId}
          autoLayoutTrigger={autoLayoutTrigger}
          onSelectNode={onSelectNode}
          onCanvasBlocksCommit={onCanvasBlocksCommit}
          onNodePositionCommit={onNodePositionCommit}
          onDeleteNode={onDeleteNode}
          onCreateBlock={onCreateBlock}
        />
      </ReactFlowProvider>
    </div>
  );
}
