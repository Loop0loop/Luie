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
  const hoverId = useGraphStore((state) => state.hoverId);
  const isRightPanelOpen = useUIStore((state) => state.regions?.rightPanel?.open ?? false);

  const activeMode = useGraphStore((state) => state.activeMode);
  const selectedFocusNode = useGraphStore((state) => state.selectedFocusNode);
  const graphData = useWorldBuildingStore((state) => state.graphData);
  const { sourceNodes, sourceEdges } = useMemo(
    () => buildGraphSurfaceData(graphData),
    [graphData],
  );

  const isEmpty = sourceNodes.length === 0;

  const hoverNode = useMemo(() => {
    if (!hoverId) return null;
    return nodes.find((node) => node.id === hoverId) ?? null;
  }, [hoverId, nodes]);

  const { filteredNodes, filteredEdges } = useGraphDataFiltering({
    sourceNodes,
    sourceEdges,
    activeMode,
    selectedFocusNode,
    focusId,
  });

  useEffect(() => {
    const layoutCenter = activeMode === "character" ? LAYOUT_CENTER_CHARACTER : LAYOUT_CENTER_EVENT;
    const iterations = activeMode === "character" ? LAYOUT_ITERATIONS_CHARACTER : LAYOUT_ITERATIONS_EVENT;

    // NOTE: filter 변경 시 기존 node 위치를 이어받아 layout jump를 막는다.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- activeMode 변경은 filtered node/edge 변경으로 이미 반영된다.
  }, [filteredNodes, filteredEdges, setNodes, setEdges]);

  useFocusSync({ focusId, setNodes, setEdges });

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
