import { useEffect, useCallback, useMemo, useState, useRef } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  PanOnScrollMode,
  type Node,
  useNodesState,
  useEdgesState,
  useReactFlow
} from "reactflow";
import { useTranslation } from "react-i18next";
import { HelpCircle } from "lucide-react";
import PensiveNode from "./PensiveNode";
import type { GraphNodeData } from "../../types/graph";
import { useGraphStore } from "../../stores/graph/graphStore";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { calculateForceLayout } from "../../utils/graphLayout";
import { buildGraphSurfaceData } from "../../utils/graphSurfaceData";
import { CANVAS_ZOOM_MAX, CANVAS_ZOOM_MIN } from "@renderer/shared/constants/canvasSizing";
import {
  FIT_VIEW_OPTIONS,
  GraphHoverCard,
  GraphLegendModal,
  LAYOUT_CENTER_CHARACTER,
  LAYOUT_CENTER_EVENT,
  LAYOUT_ITERATIONS_CHARACTER,
  LAYOUT_ITERATIONS_EVENT,
  PRO_OPTIONS,
  useGraphDataFiltering,
  useFocusSync,
} from "./graphSurfaceParts";

const nodeTypes = {
  pensive: PensiveNode,
};

export default function GraphSurface() {
  const { t } = useTranslation();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const { fitView } = useReactFlow();
  const hasInitialFitView = useRef(false);

  const nodesRef = useRef(nodes);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  const focusId = useGraphStore((state) => state.focusId);
  const setFocusId = useGraphStore((state) => state.setFocusId);
  const isRightPanelOpen = useUIStore((state) => state.regions?.rightPanel?.open ?? false);

  const activeMode = useGraphStore((state) => state.activeMode);
  const selectedFocusNode = useGraphStore((state) => state.selectedFocusNode);
  const graphData = useWorldBuildingStore((state) => state.graphData);
  const { sourceNodes, sourceEdges } = useMemo(
    () => buildGraphSurfaceData(graphData),
    [graphData],
  );

  const isEmpty = sourceNodes.length === 0;

  const focusedNode = useMemo(() => {
    if (!focusId) return null;
    return nodes.find((node) => node.id === focusId) ?? null;
  }, [focusId, nodes]);

  const { filteredNodes, filteredEdges, adjacency, topologySignature } =
    useGraphDataFiltering({
      sourceNodes,
      sourceEdges,
      activeMode,
      selectedFocusNode,
    });

  // NOTE: force layout은 반복 횟수 × 노드² 비용이다. node를 클릭할 때(focusId 변경)까지
  // 다시 돌면 큰 그래프에서 클릭이 수백 ms 멈춘다. 구성이 실제로 바뀔 때만 계산하고,
  // 최신 node/edge는 ref로 읽어 dependency에서 뺀다. 이 effect는 아래 layout effect보다
  // 먼저 선언돼 있어야 같은 commit에서 최신 값이 먼저 반영된다.
  const graphDataRef = useRef({ filteredNodes, filteredEdges });
  useEffect(() => {
    graphDataRef.current = { filteredNodes, filteredEdges };
  }, [filteredNodes, filteredEdges]);

  useEffect(() => {
    const { filteredNodes: latestNodes, filteredEdges: latestEdges } =
      graphDataRef.current;
    const isCharacterMode = activeMode === "character";
    const layoutCenter = isCharacterMode ? LAYOUT_CENTER_CHARACTER : LAYOUT_CENTER_EVENT;
    const iterations = isCharacterMode ? LAYOUT_ITERATIONS_CHARACTER : LAYOUT_ITERATIONS_EVENT;

    // NOTE: filter 변경 시 기존 node 위치를 이어받아 layout jump를 막는다.
    const prevPositions = new Map(
      nodesRef.current.map((node) => [node.id, node.position]),
    );
    const nodesWithPrevPositions = latestNodes.map((node) => {
      const prevPosition = prevPositions.get(node.id);
      return prevPosition ? { ...node, position: { ...prevPosition } } : node;
    });

    const laidOutNodes = calculateForceLayout(nodesWithPrevPositions, latestEdges, iterations, layoutCenter);

    setNodes(laidOutNodes);
    setEdges(latestEdges);
    // NOTE: activeMode는 topologySignature에 이미 포함되어 함께만 바뀐다. layout 상수를
    // 고르려고 값만 읽는다.
  }, [activeMode, topologySignature, setNodes, setEdges]);

  // NOTE: 구성(id 집합)은 그대로인데 node data만 바뀐 경우 — 별 등급, 필터 투명도.
  // force layout을 다시 돌리지 않고 위치를 유지한 채 data만 갈아끼운다. 실제로 바뀐 게
  // 없으면 같은 배열을 돌려 리렌더를 막는다.
  useEffect(() => {
    setNodes((prevNodes) => {
      const nextDataById = new Map(
        filteredNodes.map((node) => [node.id, node.data]),
      );
      let changed = false;
      const nextNodes = prevNodes.map((node) => {
        const nextData = nextDataById.get(node.id);
        if (!nextData || nextData === node.data) return node;
        changed = true;
        return { ...node, data: nextData };
      });
      return changed ? nextNodes : prevNodes;
    });
  }, [filteredNodes, setNodes]);

  // NOTE: edge 내용(관계명 등)이 바뀌면 갈아끼운다. node data 갱신과 분리해야 하는 이유는
  // edge를 교체하면 focus로 입혀둔 style이 지워지기 때문이다. edge가 바뀔 때는 adjacency
  // identity도 함께 바뀌어 아래 useFocusSync가 같은 commit에서 다시 입히지만, 필터만
  // 바뀐 경우에는 useFocusSync가 재실행되지 않으므로 edge를 건드리면 안 된다.
  useEffect(() => {
    setEdges(filteredEdges);
  }, [filteredEdges, setEdges]);

  useFocusSync({
    focusId,
    adjacency,
    topologySignature,
    setNodes,
    setEdges,
  });

  useEffect(() => {
    if (filteredNodes.length > 0 && !hasInitialFitView.current) {
      hasInitialFitView.current = true;
      // NOTE: node render가 끝난 뒤 최초 한 번만 fitView를 적용한다.
      const timeoutId = setTimeout(() => {
        fitView({ padding: 0.2, duration: 200 });
      }, 100);
      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [filteredNodes, fitView]);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node<GraphNodeData>) => {
      setFocusId(node.id);
    },
    [setFocusId]
  );

  const onPaneClick = useCallback(() => {
    setFocusId(null);
  }, [setFocusId]);

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setNodes((prevNodes) =>
        prevNodes.map((n) => (n.id === node.id ? { ...n, position: { ...node.position } } : n))
      );
    },
    [setNodes]
  );

  if (isEmpty) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-app">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface">
            <HelpCircle className="h-6 w-6 text-muted" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-fg">
              {t("canvas.graph.empty.title", "그래프 데이터가 없습니다")}
            </p>
            <p className="text-xs text-muted">
              {t(
                "canvas.graph.empty.description",
                "캐릭터, 사건, 단체 등을 추가하면 관계 그래프가 생성됩니다."
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-app relative overflow-hidden select-none">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        minZoom={CANVAS_ZOOM_MIN}
        maxZoom={CANVAS_ZOOM_MAX}
        fitViewOptions={FIT_VIEW_OPTIONS}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
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
          color="var(--canvas-grid)"
          className="opacity-70"
        />
      </ReactFlow>

      <div className="absolute bottom-6 left-6 z-30">
        <button
          type="button"
          onClick={() => setIsGuideModalOpen(true)}
          className="h-9 w-9 rounded-full bg-panel hover:bg-panel border border-border/40 hover:border-border/80 flex items-center justify-center text-muted hover:text-fg shadow-panel transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          title={t("canvas.graph.legend.open", "그래프 범례 보기")}
          aria-label={t("canvas.graph.legend.open", "그래프 범례 보기")}
        >
          <HelpCircle className="h-4.5 w-4.5" />
        </button>
      </div>

      <GraphHoverCard
        hoverNode={focusedNode}
        isRightPanelOpen={isRightPanelOpen}
        t={t}
      />

      <GraphLegendModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        t={t}
      />
    </div>
  );
}
