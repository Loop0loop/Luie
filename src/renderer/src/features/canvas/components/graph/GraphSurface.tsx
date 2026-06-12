import { useEffect, useCallback, useMemo, useState, useRef } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  PanOnScrollMode,
  MarkerType,
  type Edge,
  type Node,
  useNodesState,
  useEdgesState
} from "reactflow";
import { useTranslation } from "react-i18next";
import { HelpCircle } from "lucide-react";
import PensiveNode from "./PensiveNode";
import type { GraphNodeData, GraphNodeType } from "../../types/graph";
import { useGraphStore } from "../../stores/graph/graphStore";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { calculateForceLayout } from "../../utils/graphLayout";
import { GRAPH_CONSTELLATION_EDGE_DEFAULTS } from "../../constants/edge";
import { CANVAS_ZOOM_MAX, CANVAS_ZOOM_MIN } from "@renderer/shared/constants/canvasSizing";
import type { WorldGraphData } from "@shared/types";
import {
  EDGE_FALLBACK_OPACITY,
  EDGE_FALLBACK_STROKE_WIDTH,
  EDGE_FOCUS_OPACITY,
  FIT_VIEW_OPTIONS,
  GraphHoverCard,
  GraphLegendModal,
  LAYOUT_CENTER_CHARACTER,
  LAYOUT_CENTER_EVENT,
  LAYOUT_ITERATIONS_CHARACTER,
  LAYOUT_ITERATIONS_EVENT,
  PRO_OPTIONS,
} from "./graphSurfaceParts";

const nodeTypes = {
  pensive: PensiveNode,
};

const toGraphNodeType = (entityType: string): GraphNodeType => {
  if (entityType === "Character") return "character";
  if (entityType === "Faction") return "faction";
  if (entityType === "Event" || entityType === "Scene") return "event";
  if (entityType === "Chapter") return "chapter";
  return "world-entity";
};

const buildGraphSurfaceData = (
  graphData: WorldGraphData | null,
): { sourceNodes: Node<GraphNodeData>[]; sourceEdges: Edge[] } => {
  if (!graphData) return { sourceNodes: [], sourceEdges: [] };

  const nodeNameById = new Map(graphData.nodes.map((node) => [node.id, node.name]));
  const relationshipsByNodeId = new Map<string, NonNullable<GraphNodeData["relationships"]>>();
  for (const edge of graphData.edges) {
    const sourceRelationships = relationshipsByNodeId.get(edge.sourceId) ?? [];
    sourceRelationships.push({
      targetName: nodeNameById.get(edge.targetId) ?? edge.targetId,
      type: edge.relation,
      details: edge.relation,
    });
    relationshipsByNodeId.set(edge.sourceId, sourceRelationships);
  }

  return {
    sourceNodes: graphData.nodes.map((node): Node<GraphNodeData> => ({
      id: node.id,
      type: "pensive",
      position: {
        x: Number.isFinite(node.positionX) ? node.positionX : 0,
        y: Number.isFinite(node.positionY) ? node.positionY : 0,
      },
      data: {
        label: node.name,
        type: toGraphNodeType(node.entityType),
        description: node.description ?? "",
        relatedChapters: [],
        relationships: relationshipsByNodeId.get(node.id) ?? [],
        sourceTexts: [],
      },
    })),
    sourceEdges: graphData.edges.map((edge): Edge => ({
      id: edge.id,
      source: edge.sourceId,
      target: edge.targetId,
      data: {
        label: edge.relation,
        strength: 1,
      },
    })),
  };
};

export default function GraphSurface() {
  const { t } = useTranslation();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

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

  // hoverId에 대응하는 노드 데이터를 실시간 추적하여 호버 플로팅 카드에 공급
  const hoverNode = useMemo(() => {
    if (!hoverId) return null;
    return nodes.find((node) => node.id === hoverId) ?? null;
  }, [hoverId, nodes]);

  // 2. 모드 및 필터 조건에 부합하는 동적 그래프 데이터 파이프라인 (Constellation Monotone Rule)
  const { filteredNodes, filteredEdges } = useMemo(() => {
    // A. 에지 필터링 및 스타일 빌드
    const computedEdges = sourceEdges.map((edge) => {
      const strength = edge.data?.strength ?? 1;
      const isCharacterMode = activeMode === "character";

      const cfg = isCharacterMode 
        ? GRAPH_CONSTELLATION_EDGE_DEFAULTS.character 
        : GRAPH_CONSTELLATION_EDGE_DEFAULTS.event;

      const edgeStyle: React.CSSProperties = {
        stroke: cfg.stroke,
        strokeWidth: strength * cfg.widthMultiplier,
        opacity: cfg.opacityBase + strength * cfg.opacityMultiplier,
      };

      if ("dasharray" in cfg) {
        edgeStyle.strokeDasharray = cfg.dasharray;
      }

      // 엣지 라벨 스타일 정의 (다크 럭셔리 & 피그마 감성)
      const labelStyle: React.CSSProperties = {
        fill: "var(--text-secondary)", // 테마 변수로 교체
        fontSize: 9,
        fontWeight: 700,
        fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)",
        letterSpacing: "-0.01em",
      };

      const labelBgStyle: React.CSSProperties = {
        fill: "var(--bg-panel)", // 하드코딩 블랙 탈피, 테마 변수 적용
        fillOpacity: 0.95,
        stroke: "var(--border-default)", // 테마 테두리
        strokeWidth: 1.2,
        rx: 6, // 둥근 라운딩 처리
        ry: 6,
      };

      return {
        ...edge,
        type: "straight", // 직선 에지로 꼬임 0% 통제
        label: edge.data?.label,
        labelStyle,
        labelBgStyle,
        labelBgPadding: [8, 4] as [number, number],
        animated: !isCharacterMode && strength >= 2,
        markerEnd: isCharacterMode ? undefined : {
          type: MarkerType.ArrowClosed,
          width: cfg.markerSize,
          height: cfg.markerSize,
          color: "currentColor",
        },
        style: edgeStyle,
      };
    });

    // B. 노드 크기 및 별자리 발광 속성 동적 연산
    const computedNodes = sourceNodes.map((node): Node<GraphNodeData> => {
      const degree = computedEdges.filter(
        (edge) => edge.source === node.id || edge.target === node.id,
      ).length;
      const starGrade: "prime" | "major" | "minor" =
        degree >= 3 ? "prime" : degree >= 1 ? "major" : "minor";

      // 특정 캐릭터/사건 빠른 필터 포커싱 시, 대상 노드가 아닌 것들은 감쇠 처리
      let filterFocusedOpacity = 1.0;
      if (selectedFocusNode !== "all") {
        if (node.id !== selectedFocusNode) {
          // 직접적으로 에지 연결되지 않은 노드는 거의 투명화
          const isConnected = computedEdges.some(
            (e) => (e.source === selectedFocusNode && e.target === node.id) ||
                   (e.target === selectedFocusNode && e.source === node.id) ||
                   node.id === selectedFocusNode
          );
          filterFocusedOpacity = isConnected ? 0.95 : 0.15;
        }
      }

      // 캔버스 내 직접 클릭 포커스 격리 (Focus Isolation): 비관련 노드는 0% 투명화 소멸
      let canvasFocusedOpacity = 1.0;
      let isInteractivePointerEvents = true;
      if (focusId) {
        if (node.id !== focusId) {
          const isNeighbor = computedEdges.some(
            (e) => (e.source === focusId && e.target === node.id) ||
                   (e.target === focusId && e.source === node.id)
          );
          canvasFocusedOpacity = isNeighbor ? 0.95 : 0.0;
          isInteractivePointerEvents = isNeighbor;
        }
      }

      return {
        ...node,
        data: {
          ...node.data,
          starGrade,
          opacity: filterFocusedOpacity * canvasFocusedOpacity,
          isInteractive: isInteractivePointerEvents,
          isFocused: false,
        },
      };
    });

    return {
      filteredNodes: computedNodes,
      filteredEdges: computedEdges,
    };
  }, [activeMode, selectedFocusNode, focusId, sourceNodes, sourceEdges]);

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
  useEffect(() => {
    // 1. 노드 포커스 갱신
    setNodes((prevNodes) =>
      prevNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isFocused: node.id === focusId,
        },
      }))
    );

    // 2. 에지 포커스 및 네온 라이팅 효과 동기화
    setEdges((prevEdges) =>
      prevEdges.map((edge) => {
        if (!focusId) {
          // 포커스가 해제된 경우: 원래 스타일 복원
          return {
            ...edge,
            animated: edge.data?.animatedBackup ?? edge.animated,
            style: {
              ...edge.style,
              opacity: edge.data?.opacityBackup ?? edge.style?.opacity ?? EDGE_FALLBACK_OPACITY,
              strokeWidth: edge.data?.strokeWidthBackup ?? edge.style?.strokeWidth ?? EDGE_FALLBACK_STROKE_WIDTH,
              stroke: edge.data?.strokeBackup ?? edge.style?.stroke,
            },
            labelStyle: {
              ...edge.labelStyle,
              opacity: 1.0,
            },
            labelBgStyle: {
              ...edge.labelBgStyle,
              opacity: 1.0,
              stroke: edge.data?.labelBgStrokeBackup ?? edge.labelBgStyle?.stroke,
            }
          };
        }

        // 특정 노드가 포커스된 경우
        const isRelated = edge.source === focusId || edge.target === focusId;
        
        // 백업 상태 저장 (최초 1회)
        const opacityBackup = edge.data?.opacityBackup ?? edge.style?.opacity ?? EDGE_FALLBACK_OPACITY;
        const strokeWidthBackup = edge.data?.strokeWidthBackup ?? edge.style?.strokeWidth ?? EDGE_FALLBACK_STROKE_WIDTH;
        const strokeBackup = edge.data?.strokeBackup ?? edge.style?.stroke ?? "currentColor";
        const animatedBackup = edge.data?.animatedBackup ?? edge.animated ?? false;
        const labelBgStrokeBackup = edge.data?.labelBgStrokeBackup ?? edge.labelBgStyle?.stroke;

        const isCharacterMode = activeMode === "character";
        const relationColor = isCharacterMode ? "rgba(165, 180, 252, 0.95)" : "rgba(248, 113, 113, 0.95)";

        // strokeWidthBackup이 숫자형인지 강제 안전 변환 및 NaN 방지 고도화
        const baseWidth = typeof strokeWidthBackup === "number" ? strokeWidthBackup : (Number(strokeWidthBackup) || EDGE_FALLBACK_STROKE_WIDTH);

        return {
          ...edge,
          data: {
            ...edge.data,
            opacityBackup,
            strokeWidthBackup,
            strokeBackup,
            animatedBackup,
            labelBgStrokeBackup,
          },
          // 관련 에지는 반드시 애니메이션 활성화 (에너지 흐름 선사)
          animated: isRelated ? true : false,
          style: {
            ...edge.style,
            // 관련 에지는 선명하게, 관련 없는 에지는 시야에서 전면 투명 소거
            opacity: isRelated ? EDGE_FOCUS_OPACITY : 0,
            strokeWidth: isRelated ? (baseWidth + 1.2) : baseWidth,
            stroke: isRelated ? relationColor : strokeBackup,
            pointerEvents: isRelated ? "auto" : "none", // 비관련 에지 이벤트 완전 차단
          },
          labelStyle: {
            ...edge.labelStyle,
            opacity: isRelated ? 1.0 : 0,
          },
          labelBgStyle: {
            ...edge.labelBgStyle,
            opacity: isRelated ? 1.0 : 0,
            stroke: isRelated ? relationColor : labelBgStrokeBackup,
          }
        };
      })
    );
  }, [focusId, activeMode, setNodes, setEdges, filteredEdges]);

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

  return (
    <div className="h-full w-full bg-canvas relative overflow-hidden select-none">
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
        fitView
        fitViewOptions={FIT_VIEW_OPTIONS}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
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
          color="var(--border-default)"
          className="opacity-70"
        />
      </ReactFlow>

      {/* 2. ? 범례 보기 플로팅 버튼 */}
      <div className="absolute bottom-6 left-6 z-30">
        <button
          type="button"
          onClick={() => setIsGuideModalOpen(true)}
          className="h-9 w-9 rounded-full bg-panel/90 hover:bg-panel border border-border/40 hover:border-border/80 flex items-center justify-center text-muted hover:text-fg shadow-xl backdrop-blur-md transition-all cursor-pointer"
          title={t("canvas.graph.legend.open", "그래프 범례 보기")}
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
