import { useCallback, useEffect, useMemo } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  MarkerType,
  PanOnScrollMode,
  useNodesState,
  useEdgesState,
  type Node,
  type NodeChange,
  type EdgeChange,
  type OnSelectionChangeParams,
  type NodeProps,
  type EdgeProps,
  type Connection,
} from "reactflow";
import { CANVAS_FIT_VIEW_PADDING, CANVAS_ZOOM_MAX, CANVAS_ZOOM_MIN } from "@renderer/shared/constants/canvasSizing";
import { useCanvasViewStore } from "../../stores";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { type CanvasProjection } from "../../types";
import { buildFlowGraph } from "../../utils";
import { useCanvasSelection } from "../../hooks/useCanvasView";
import { handleSelectionChange, handlePaneClick } from "../../utils/selectionHandlers";
import type { WorldEntitySourceType } from "@shared/types";

const normalizeEntityType = (type: string): WorldEntitySourceType => {
  const t = type.toLowerCase();
  if (t === "place" || t === "concept" || t === "rule" || t === "item" || t === "worldentity") {
    return "WorldEntity";
  }
  return (type.charAt(0).toUpperCase() + type.slice(1)) as WorldEntitySourceType;
};

const DEFAULT_EDGE_OPTIONS = {
  markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
} as const;

const FIT_VIEW_OPTIONS = { padding: CANVAS_FIT_VIEW_PADDING } as const;
const PRO_OPTIONS = { hideAttribution: true } as const;

interface BaseCanvasViewportProps {
  projection: CanvasProjection;
  nodeTypes: Record<string, React.ComponentType<NodeProps>>;
  edgeTypes: Record<string, React.ComponentType<EdgeProps>>;
  onNodesChange?: (changes: NodeChange[]) => void;
  onEdgesChange?: (changes: EdgeChange[]) => void;
  nodesDraggable?: boolean;
  nodesConnectable?: boolean;
  /** drag 종료 위치를 worldBuildingStore에 저장할지 여부. */
  persistPositions?: boolean;
  extraChildren?: React.ReactNode;
  bottomToolbar?: React.ReactNode;
  wrapperClassName?: string;
  dataTestId?: string;
}

export default function BaseCanvasViewport({
  projection,
  nodeTypes,
  edgeTypes,
  onNodesChange,
  onEdgesChange,
  nodesDraggable = true,
  nodesConnectable = true,
  persistPositions = true,
  extraChildren,
  bottomToolbar,
  wrapperClassName = "h-full w-full",
  dataTestId = "canvas-viewport",
}: BaseCanvasViewportProps) {
  const { selection } = useCanvasSelection();
  const selectNode = useCanvasViewStore((s) => s.selectNode);
  const clearSelection = useCanvasViewStore((s) => s.clearSelection);
  const updateGraphNodePosition = useWorldBuildingStore(
    (s) => s.updateGraphNodePosition,
  );
  const createRelation = useWorldBuildingStore((s) => s.createRelation);
  const currentProjectId = useWorldBuildingStore((s) => s.activeProjectId);

  const selectedNodeId = selection.kind === "node" ? selection.id : null;

  const flowGraph = useMemo(
    () => buildFlowGraph(projection, selectedNodeId),
    [projection, selectedNodeId],
  );

  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(
    flowGraph.nodes,
  );
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(
    flowGraph.edges,
  );

  // NOTE: projection 갱신 시에도 drag 위치와 선택 상태는 기존 ReactFlow state에서 계승한다.
  useEffect(() => {
    setNodes((prevNodes) => {
      const prevData = new Map(
        prevNodes.map((n) => [n.id, { position: n.position, selected: n.selected }]),
      );
      return flowGraph.nodes.map((node) => {
        const prev = prevData.get(node.id);
        return prev
          ? {
              ...node,
              position: prev.position,
              selected: prev.selected ?? node.selected,
            }
          : node;
      });
    });
    setEdges(flowGraph.edges);
  }, [flowGraph, setNodes, setEdges]);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChangeInternal(changes);
      onNodesChange?.(changes);
    },
    [onNodesChangeInternal, onNodesChange],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChangeInternal(changes);
      onEdgesChange?.(changes);
    },
    [onEdgesChangeInternal, onEdgesChange],
  );

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (!persistPositions) return;
      void updateGraphNodePosition({
        id: node.id,
        positionX: Math.round(node.position.x),
        positionY: Math.round(node.position.y),
      });
    },
    [persistPositions, updateGraphNodePosition],
  );

  const onSelectionChange = useCallback(
    (params: OnSelectionChangeParams) => {
      handleSelectionChange(params, selectNode, clearSelection);
    },
    [selectNode, clearSelection],
  );

  const onPaneClick = useCallback(() => {
    handlePaneClick(clearSelection);
  }, [clearSelection]);

  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target || !currentProjectId) return;

      const graphNodes = useWorldBuildingStore.getState().graphData?.nodes ?? [];
      const sourceNode = graphNodes.find((n) => n.id === connection.source);
      const targetNode = graphNodes.find((n) => n.id === connection.target);

      if (!sourceNode || !targetNode) return;

      try {
        await createRelation({
          projectId: currentProjectId,
          sourceId: connection.source,
          sourceType: normalizeEntityType(sourceNode.entityType),
          targetId: connection.target,
          targetType: normalizeEntityType(targetNode.entityType),
          relation: "belongs_to",
        });
      } catch {
        // NOTE: worldBuildingStore가 관계 생성 실패를 이미 기록한다.
      }
    },
    [currentProjectId, createRelation],
  );

  return (
    <div className={wrapperClassName} data-testid={dataTestId}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
        minZoom={CANVAS_ZOOM_MIN}
        maxZoom={CANVAS_ZOOM_MAX}
        fitView
        fitViewOptions={FIT_VIEW_OPTIONS}
        onSelectionChange={onSelectionChange}
        onPaneClick={onPaneClick}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        nodesDraggable={nodesDraggable}
        nodesConnectable={nodesConnectable}
        elementsSelectable
        deleteKeyCode={null}
        multiSelectionKeyCode="Shift"
        selectionKeyCode="Shift"
        panOnScroll
        panOnScrollMode={PanOnScrollMode.Free}
        zoomOnScroll
        zoomOnPinch
        zoomOnDoubleClick={false}
        proOptions={PRO_OPTIONS}
        className="bg-app"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.5}
          color="currentColor"
          className="text-muted/25 dark:text-muted/35"
        />
        {extraChildren}
      </ReactFlow>
      {bottomToolbar}
    </div>
  );
}
