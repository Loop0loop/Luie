/**
 * BaseCanvasViewport — shared ReactFlow viewport base component.
 *
 * Extracts 80%+ duplicated logic from CanvasViewport and StaticCanvasViewport.
 * Both wrappers pass differing props (nodeTypes, edgeTypes, projection source, etc.).
 *
 * Differences handled via props:
 *   - nodeTypes / edgeTypes: passed from wrapper (dynamic vs static)
 *   - onNodesChange / onEdgesChange: optional (dynamic viewport has these)
 *   - projection: passed from wrapper (useCanvasProjection vs useStaticProjection)
 *   - nodesDraggable: configurable (false for dynamic, true for static)
 *   - persistPositions: persist node drag positions back to worldBuildingStore (main 동기화)
 *   - extraChildren: optional children rendered inside ReactFlow
 *   - bottomToolbar: optional toolbar rendered outside ReactFlow
 *   - wrapperClassName: outer div className customization
 *   - dataTestId: outer div data-testid customization
 *
 * 데이터 흐름(main 동기화):
 *   projection → buildFlowGraph → 내부 RF 노드 상태(useNodesState).
 *   노드 드래그 종료 시 onNodeDragStop → worldBuildingStore.updateGraphNodePosition →
 *   (world-entity는 IPC updatePosition + replica, 그 외는 canvas replica 문서)로 영속화.
 */

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
} from "reactflow";
import { CANVAS_FIT_VIEW_PADDING, CANVAS_ZOOM_MAX, CANVAS_ZOOM_MIN } from "@renderer/shared/constants/canvasSizing";
import { useCanvasViewStore } from "../../stores";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { type CanvasProjection } from "../../types";
import { buildFlowGraph } from "../../utils";
import { useCanvasSelection } from "../../hooks/useCanvasView";
import { handleSelectionChange, handlePaneClick } from "../../utils/selectionHandlers";

// ─── static config (shared) ───────────────────────────────────────────────────

const DEFAULT_EDGE_OPTIONS = {
  markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
} as const;

const FIT_VIEW_OPTIONS = { padding: CANVAS_FIT_VIEW_PADDING } as const;
const PRO_OPTIONS = { hideAttribution: true } as const;

// ─── props ────────────────────────────────────────────────────────────────────

interface BaseCanvasViewportProps {
  /** Scope/mode-filtered projection from parent hook */
  projection: CanvasProjection;
  /** Node type map from wrapper (dynamic or static) */
  nodeTypes: Record<string, React.ComponentType<NodeProps>>;
  /** Edge type map from wrapper (dynamic or static) */
  edgeTypes: Record<string, React.ComponentType<EdgeProps>>;
  /** Optional nodes change handler (dynamic viewport only) */
  onNodesChange?: (changes: NodeChange[]) => void;
  /** Optional edges change handler (dynamic viewport only) */
  onEdgesChange?: (changes: EdgeChange[]) => void;
  /** Whether nodes are draggable (static=true, dynamic=false) */
  nodesDraggable?: boolean;
  /** 드래그 종료 시 노드 위치를 worldBuildingStore에 영속화할지 (기본 true) */
  persistPositions?: boolean;
  /** Extra children inside ReactFlow (e.g., CanvasFloatingToolbar) */
  extraChildren?: React.ReactNode;
  /** Toolbar outside ReactFlow (e.g., BottomCreateToolbar) */
  bottomToolbar?: React.ReactNode;
  /** Outer wrapper className */
  wrapperClassName?: string;
  /** Outer wrapper data-testid */
  dataTestId?: string;
}

// ─── component ────────────────────────────────────────────────────────────────

export default function BaseCanvasViewport({
  projection,
  nodeTypes,
  edgeTypes,
  onNodesChange,
  onEdgesChange,
  nodesDraggable = true,
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

  const selectedNodeId = selection.kind === "node" ? selection.id : null;

  const flowGraph = useMemo(
    () => buildFlowGraph(projection, selectedNodeId),
    [projection, selectedNodeId],
  );

  // ReactFlow 내부 드래그를 지원하기 위해 controlled 상태로 보관한다.
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(
    flowGraph.nodes,
  );
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(
    flowGraph.edges,
  );

  // projection / 선택 변화로 그래프가 갱신되면 내부 상태를 재동기화한다.
  // 단, 드래그 중 사용자가 옮긴 위치는 보존하기 위해 기존 위치를 우선 계승한다.
  useEffect(() => {
    setNodes((prevNodes) => {
      const prevById = new Map(prevNodes.map((n) => [n.id, n.position]));
      return flowGraph.nodes.map((node) => {
        const prevPos = prevById.get(node.id);
        return prevPos ? { ...node, position: prevPos } : node;
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
        nodesDraggable={nodesDraggable}
        nodesConnectable={false}
        elementsSelectable
        deleteKeyCode={null}
        multiSelectionKeyCode="Shift"
        selectionKeyCode="Shift"
        panOnScroll
        panOnScrollMode={PanOnScrollMode.Free}
        zoomOnScroll={false}
        zoomOnPinch
        zoomOnDoubleClick={false}
        proOptions={PRO_OPTIONS}
        className="bg-canvas"
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
