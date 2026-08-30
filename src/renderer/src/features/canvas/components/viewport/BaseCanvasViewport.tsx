import { useCallback, useEffect, useMemo } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  MarkerType,
  PanOnScrollMode,
  SelectionMode,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
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
import { resolveRelationConnection } from "../../utils/connectionGuards";
import { handleSelectionChange, handlePaneClick } from "../../utils/selectionHandlers";

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
  const selectNode = useCanvasViewStore((s) => s.selectNode);
  const clearSelection = useCanvasViewStore((s) => s.clearSelection);
  const updateGraphNodePosition = useWorldBuildingStore(
    (s) => s.updateGraphNodePosition,
  );
  const createRelation = useWorldBuildingStore((s) => s.createRelation);
  const currentProjectId = useWorldBuildingStore((s) => s.activeProjectId);

  // NOTE: 선택 상태는 ReactFlow가 node의 `selected`로 관리한다. 여기서 flowGraph를
  // 선택 id에 의존시키면 노드를 고를 때마다 전체 node/edge 배열이 새로 만들어졌다.
  const flowGraph = useMemo(() => buildFlowGraph(projection), [projection]);

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
      if (!currentProjectId) return;

      const resolved = resolveRelationConnection(
        connection,
        useWorldBuildingStore.getState().graphData,
      );
      if (!resolved.ok) return;

      try {
        await createRelation({
          projectId: currentProjectId,
          sourceId: resolved.source.id,
          // NOTE: graphData의 entityType은 이미 WorldEntitySourceType이다. 문자열을
          // 다시 대문자화해 캐스팅하면 신규 entityType이 생길 때 조용히 깨진다.
          sourceType: resolved.source.entityType,
          targetId: resolved.target.id,
          targetType: resolved.target.entityType,
          relation: "belongs_to",
        });
      } catch {
        // NOTE: worldBuildingStore가 관계 생성 실패를 이미 기록한다.
      }
    },
    [currentProjectId, createRelation],
  );

  const deleteGraphNode = useWorldBuildingStore((s) => s.deleteGraphNode);
  const deleteRelation = useWorldBuildingStore((s) => s.deleteRelation);

  // NOTE: 두 삭제 모두 프로젝트 그래프 문서를 통째로 다시 쓴다(persistGraphDocument).
  // 병렬로 실행하면 각 호출이 자기 시점의 스냅샷을 저장해 마지막 것만 남는다.
  // reduce로 chain을 만들어 loop 안 await 없이 순차 실행을 보장한다.
  const onNodesDelete = useCallback(
    async (deletedNodes: Node[]) => {
      await deletedNodes.reduce<Promise<unknown>>(
        (chain, node) => chain.then(() => deleteGraphNode(node.id)),
        Promise.resolve(),
      );
      clearSelection();
    },
    [deleteGraphNode, clearSelection],
  );

  const onEdgesDelete = useCallback(
    async (deletedEdges: Edge[]) => {
      // NOTE: canvasFlowAdapter가 edge id에 `rel-` 접두사를 붙인다. 그대로 넘기면
      // 존재하지 않는 id로 삭제를 시도해 캔버스에서만 사라지고 저장은 남는다.
      await deletedEdges.reduce<Promise<unknown>>(
        (chain, edge) =>
          chain.then(() => deleteRelation(edge.data?.rawId ?? edge.id)),
        Promise.resolve(),
      );
    },
    [deleteRelation],
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
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        nodesDraggable={nodesDraggable}
        nodesConnectable={nodesConnectable}
        elementsSelectable
        selectionOnDrag
        selectionMode={SelectionMode.Partial}
        panOnDrag={[1, 2]}
        deleteKeyCode={["Backspace", "Delete"]}
        multiSelectionKeyCode={["Shift", "Meta", "Control"]}
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
