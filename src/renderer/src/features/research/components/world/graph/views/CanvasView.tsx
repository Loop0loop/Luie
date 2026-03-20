import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useTranslation } from "react-i18next";
import type {
  EntityRelation,
  WorldGraphCanvasBlock,
  WorldGraphCanvasEdge,
  WorldGraphNode,
} from "@shared/types";
import { api } from "@shared/api";
import { useDialog } from "@shared/ui/useDialog";
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
  type AnyCanvasNodeData,
} from "../utils/canvasFlowUtils";
import { persistAutoLayoutNodePositions } from "../utils/autoLayoutPersistence";
import {
  GRAPH_DEFAULT_NODE_COLUMNS,
  GRAPH_DEFAULT_NODE_COLUMN_GAP_PX,
  GRAPH_DEFAULT_NODE_OFFSET_X_PX,
  GRAPH_DEFAULT_NODE_OFFSET_Y_PX,
  GRAPH_DEFAULT_NODE_ROW_GAP_PX,
  GRAPH_FLOW_BACKGROUND_DOT_GAP_PX,
  GRAPH_FLOW_BACKGROUND_DOT_SIZE_PX,
  GRAPH_FLOW_DEFAULT_VIEWPORT,
  GRAPH_FLOW_MAX_ZOOM,
  GRAPH_FLOW_MIN_ZOOM,
  GRAPH_FIT_VIEW_PADDING_CANVAS,
  GRAPH_FIT_VIEW_PADDING_DEFAULT,
  GRAPH_VIEWPORT_CREATE_OFFSET,
  GRAPH_VIEWPORT_FALLBACK_SIZE,
} from "../shared/layout/graphLayoutConstants";
import { GRAPH_CANVAS_DEFAULT_EDGE_COLORS } from "../shared/canvas/graphCanvasConstants";
import { GRAPH_ENTITY_CANVAS_THEME_TOKENS } from "../shared/theme/graphThemeConstants";
import { initializeGraphPerfInstrumentation } from "../shared/instrumentation/graphPerfMetrics";

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
  onAddTimelineBranch?: (
    sourceNodeId: string,
    direction: "up" | "down" | "left" | "right",
  ) => void;
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
  onAutoLayoutApplied,
  onCreateBlock,
  onAddTimelineBranch,
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
  onAutoLayoutApplied?: () => void;
  onCreateBlock: (position?: { x: number; y: number }) => void;
  onAddTimelineBranch?: (
    sourceNodeId: string,
    direction: "up" | "down" | "left" | "right",
  ) => void;
}) {
  const worldTheme = GRAPH_ENTITY_CANVAS_THEME_TOKENS.WorldEntity;
  const eventTheme = GRAPH_ENTITY_CANVAS_THEME_TOKENS.Event;
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
      const width = el?.clientWidth ?? GRAPH_VIEWPORT_FALLBACK_SIZE.width;
      const height = el?.clientHeight ?? GRAPH_VIEWPORT_FALLBACK_SIZE.height;
      return {
        x: (-x + width / 2) / zoom - GRAPH_VIEWPORT_CREATE_OFFSET.x,
        y: (-y + height / 2) / zoom - GRAPH_VIEWPORT_CREATE_OFFSET.y,
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
    onAddTimelineBranch,
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
    onAutoLayoutApplied,
    reactFlow,
  });

  const handleZoomIn = useCallback(() => {
    void reactFlow.zoomIn();
  }, [reactFlow]);

  const handleZoomOut = useCallback(() => {
    void reactFlow.zoomOut();
  }, [reactFlow]);

  const handleFitView = useCallback(() => {
    void reactFlow.fitView({ padding: GRAPH_FIT_VIEW_PADDING_DEFAULT });
  }, [reactFlow]);

  const handleFitCanvas = useCallback(() => {
    void reactFlow.fitView({ padding: GRAPH_FIT_VIEW_PADDING_CANVAS });
  }, [reactFlow]);

  const handleToolbarCreateBlock = useCallback(() => {
    onCreateBlock(resolvePlacementPosition());
  }, [onCreateBlock, resolvePlacementPosition]);

  const handleOpenTimelinePalette = useCallback(() => {
    setTimelinePaletteOpen(true);
  }, []);

  const handleCloseTimelinePalette = useCallback(() => {
    setTimelinePaletteOpen(false);
  }, []);

  const handleCreateTimelineFromPalette = useCallback(() => {
    handleCreateTimelineBlock();
    setTimelinePaletteOpen(false);
  }, [handleCreateTimelineBlock]);

  const handlePickTimelineFromPalette = useCallback(
    (nodeId: string) => {
      handlePickTimelineEvent(nodeId);
      setTimelinePaletteOpen(false);
    },
    [handlePickTimelineEvent],
  );

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
        minZoom={GRAPH_FLOW_MIN_ZOOM}
        maxZoom={GRAPH_FLOW_MAX_ZOOM}
        defaultViewport={GRAPH_FLOW_DEFAULT_VIEWPORT}
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
        className="bg-canvas"
      >
        <Background
          color={worldTheme.glow}
          gap={GRAPH_FLOW_BACKGROUND_DOT_GAP_PX}
          size={GRAPH_FLOW_BACKGROUND_DOT_SIZE_PX}
          variant={BackgroundVariant.Dots}
        />
      </ReactFlow>

      {guideScreenX !== null ? (
        <div
          className="pointer-events-none absolute inset-y-0 z-20 w-px"
          style={{
            left: `${guideScreenX}px`,
            backgroundColor: eventTheme.accent,
            opacity: 0.72,
          }}
        />
      ) : null}
      {guideScreenY !== null ? (
        <div
          className="pointer-events-none absolute inset-x-0 z-20 h-px"
          style={{
            top: `${guideScreenY}px`,
            backgroundColor: eventTheme.accent,
            opacity: 0.72,
          }}
        />
      ) : null}

      <CanvasFlowControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitView={handleFitView}
        onFitCanvas={handleFitCanvas}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      <CanvasToolbar
        onCreateBlock={handleToolbarCreateBlock}
        onOpenTimelinePalette={handleOpenTimelinePalette}
        onCreateNote={handleCreateMemo}
      />

      <CanvasTimelinePalette
        open={timelinePaletteOpen}
        events={timelineNodes}
        onClose={handleCloseTimelinePalette}
        onCreateEvent={handleCreateTimelineFromPalette}
        onPickEvent={handlePickTimelineFromPalette}
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
  const { t } = useTranslation();
  const dialog = useDialog();
  const updateGraphNode = useWorldBuildingStore(
    (state) => state.updateGraphNode,
  );

  useEffect(() => {
    initializeGraphPerfInstrumentation();
  }, []);

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
          : GRAPH_CANVAS_DEFAULT_EDGE_COLORS[0];
      const index = GRAPH_CANVAS_DEFAULT_EDGE_COLORS.indexOf(
        current as (typeof GRAPH_CANVAS_DEFAULT_EDGE_COLORS)[number],
      );
      const nextColor =
        GRAPH_CANVAS_DEFAULT_EDGE_COLORS[
          (Math.max(0, index) + 1) % GRAPH_CANVAS_DEFAULT_EDGE_COLORS.length
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
      nodes,
      onDeleteNode,
      handleCycleGraphNodeColor,
      handleEditGraphNode,
      onAddTimelineBranch,
    ],
  );
  const commitCanvasEdges = useCallback(
    (nextEdges: WorldGraphCanvasEdge[]) => {
      onCanvasEdgesCommit?.(nextEdges);
    },
    [onCanvasEdgesCommit],
  );

  const updateCanvasEdgeRelation = useCallback(
    async (edgeId: string, title: string, message?: string) => {
      const target = canvasEdges.find((edge) => edge.id === edgeId);
      if (!target) {
        return;
      }

      const nextRelation = await dialog.prompt({
        title,
        message,
        defaultValue: target.relation,
        placeholder: target.relation,
      });

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
    [canvasEdges, commitCanvasEdges, dialog],
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
      void updateCanvasEdgeRelation(
        edgeId,
        t("research.graph.canvas.relation.editTitle"),
      );
    },
    [t, updateCanvasEdgeRelation],
  );

  const handleUpdateCanvasEdge = useCallback(
    (edgeId: string) => {
      void updateCanvasEdgeRelation(
        edgeId,
        t("research.graph.canvas.relation.updateTitle"),
        t("research.graph.canvas.relation.updateMessage"),
      );
    },
    [t, updateCanvasEdgeRelation],
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

  const handleAutoLayoutApplied = useCallback(() => {
    if (flowNodes.length === 0) {
      return;
    }

    const COLS = GRAPH_DEFAULT_NODE_COLUMNS;
    const COL_GAP = GRAPH_DEFAULT_NODE_COLUMN_GAP_PX;
    const ROW_GAP = GRAPH_DEFAULT_NODE_ROW_GAP_PX;
    const OFFSET_X = GRAPH_DEFAULT_NODE_OFFSET_X_PX;
    const OFFSET_Y = GRAPH_DEFAULT_NODE_OFFSET_Y_PX;

    const updates = flowNodes.map((node, i) => ({
      id: node.id,
      x: OFFSET_X + (i % COLS) * COL_GAP,
      y: OFFSET_Y + Math.floor(i / COLS) * ROW_GAP,
    }));

    void persistAutoLayoutNodePositions({
      updates,
      onNodePositionCommit,
      onError: (error) => {
        void api.logger.warn("Failed to persist auto-layout node positions", {
          error,
        });
      },
    });
  }, [flowNodes, onNodePositionCommit]);

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
          onAutoLayoutApplied={handleAutoLayoutApplied}
          onCreateBlock={onCreateBlock}
          onAddTimelineBranch={onAddTimelineBranch}
        />
      </ReactFlowProvider>
    </div>
  );
}
