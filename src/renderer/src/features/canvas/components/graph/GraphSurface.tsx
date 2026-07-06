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

  // Zustand 전체 스토어 구독 결함 해결: 개별 Selector 분리 구독으로 불필요 리렌더링 0% 통제
  const focusId = useGraphStore((state) => state.focusId);
  const setFocusId = useGraphStore((state) => state.setFocusId);
  const hoverId = useGraphStore((state) => state.hoverId);
  const isRightPanelOpen = useUIStore((state) => state.regions?.rightPanel?.open ?? false);

  // 1. Luie 관계 시나리오 필터 상태 구독 (Zustand 스토어 연동)
  const activeMode = useGraphStore((state) => state.activeMode);
  const selectedFocusNode = useGraphStore((state) => state.selectedFocusNode);
  const graphData = useWorldBuildingStore((state) => state.graphData);
  const { sourceNodes, sourceEdges } = useMemo(
    () => buildGraphSurfaceData(graphData),
    [graphData],
  );

  const isEmpty = sourceNodes.length === 0;

  // hoverId에 대응하는 노드 데이터를 실시간 추적하여 호버 플로팅 카드에 공급
  const hoverNode = useMemo(() => {
    if (!hoverId) return null;
    return nodes.find((node) => node.id === hoverId) ?? null;
  }, [hoverId, nodes]);

  // 2. 모드 및 필터 조건에 부합하는 동적 그래프 데이터 파이프라인 (Constellation Monotone Rule)
  const { filteredNodes, filteredEdges } = useGraphDataFiltering({
    sourceNodes,
    sourceEdges,
    activeMode,
    selectedFocusNode,
    focusId,
  });

  // 3. 필터 변경 또는 마운트 시 Force Layout 기동 (모드별 중심점 및 물리력 분기 대응)
  useEffect(() => {
    const layoutCenter = activeMode === "character" ? LAYOUT_CENTER_CHARACTER : LAYOUT_CENTER_EVENT;
    const iterations = activeMode === "character" ? LAYOUT_ITERATIONS_CHARACTER : LAYOUT_ITERATIONS_EVENT;

    // 이전 노드 위치 좌표를 그대로 물려받아 위치 튕김 현상을 완전히 0%로 소멸
    const nodesWithPrevPositions = filteredNodes.map((node) => {
      const prevNode = nodesRef.current.find((n) => n.id === node.id);
      if (prevNode?.position) {
        return {
          ...node,
          position: { ...prevNode.position },
        };
      }
      return node;
    });

    const laidOutNodes = calculateForceLayout(nodesWithPrevPositions, filteredEdges, iterations, layoutCenter);
    
    setNodes(laidOutNodes);
    setEdges(filteredEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredNodes, filteredEdges, setNodes, setEdges]);

  // focusId 상태가 전역으로 변동될 때 노드 및 에지의 focus/강조 상태를 동기화
  useFocusSync({ focusId, setNodes, setEdges });

  // 초기 로딩 시에만 fitView 적용 (노드 변경 시마다 리셋 방지)
  useEffect(() => {
    if (filteredNodes.length > 0 && !hasInitialFitView.current) {
      hasInitialFitView.current = true;
      // 약간의 지연을 주어 노드 렌더링 완료 후 fitView 호출
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
      // 우측 설정 바인더 패널이 닫혀있다면 쑥 열어주기 (최상의 인터랙티브 UX 선사)
      useUIStore.getState().setRegionOpen("rightPanel", true);
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
      {/* React Flow Canvas */}
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
          color="var(--border-default)"
          className="opacity-70"
        />
      </ReactFlow>

      {/* 2. ? 범례 보기 플로팅 버튼 */}
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
        hoverNode={hoverNode}
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
