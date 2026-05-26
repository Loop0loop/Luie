import { useEffect, useCallback, useMemo } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  PanOnScrollMode,
  MarkerType,
  type Node,
  useNodesState,
  useEdgesState
} from "reactflow";
import PensiveNode from "./PensiveNode";
import type { GraphNodeData } from "../../types/graph";
import { useGraphStore } from "../../stores/graph/graphStore";
import { calculateForceLayout } from "../../utils/graphLayout";
import { MOCK_GRAPH_NODES, MOCK_GRAPH_EDGES } from "../../constants/graphMockData";
import { GRAPH_CORE_CHARACTERS, GRAPH_CORE_EVENTS } from "../../constants/node";
import { GRAPH_CONSTELLATION_EDGE_DEFAULTS } from "../../constants/edge";
import { CANVAS_FIT_VIEW_PADDING, CANVAS_ZOOM_MAX, CANVAS_ZOOM_MIN } from "@shared/constants/canvasSizing";

// React Flow 인라인 객체 오버헤드 0%를 위한 모듈 레벨 상수화 및 ES1st 룰 완비
const PRO_OPTIONS = { hideAttribution: true } as const;
const FIT_VIEW_OPTIONS = { padding: CANVAS_FIT_VIEW_PADDING } as const;

const nodeTypes = {
  pensive: PensiveNode,
};

export default function GraphSurface() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Zustand 전체 스토어 구독 결함 해결: 개별 Selector 분리 구독으로 불필요 리렌더링 0% 통제
  const focusId = useGraphStore((state) => state.focusId);
  const setFocusId = useGraphStore((state) => state.setFocusId);

  // 1. Luie 관계 시나리오 필터 상태 구독 (Zustand 스토어 연동)
  const activeMode = useGraphStore((state) => state.activeMode);
  const selectedChapterFilter = useGraphStore((state) => state.selectedChapterFilter);
  const selectedFocusNode = useGraphStore((state) => state.selectedFocusNode);

  // 2. 모드 및 필터 조건에 부합하는 동적 그래프 데이터 파이프라인 (Constellation Monotone Rule)
  const { filteredNodes, filteredEdges } = useMemo(() => {
    // A. 에지 필터링 및 스타일 빌드
    const computedEdges = MOCK_GRAPH_EDGES.map((edge) => {
      const strength = edge.data?.strength ?? 1;
      const isCharacterMode = activeMode === "character";

      // 챕터 필터가 '초반부(12~13화)' 일 경우, 15화 관련 에지("chapter15", "ambush", "rebels" 연관) 감쇠 처리
      const isEarlyFilter = selectedChapterFilter === "early";
      const is15ChapterRelated = 
        edge.source === GRAPH_CORE_EVENTS.CHAPTER15 || 
        edge.target === GRAPH_CORE_EVENTS.CHAPTER15 || 
        edge.source === GRAPH_CORE_EVENTS.AMBUSH || 
        edge.target === GRAPH_CORE_EVENTS.AMBUSH;
      const filterOpacityMultiplier = isEarlyFilter && is15ChapterRelated ? 0.15 : 1.0;

      const cfg = isCharacterMode 
        ? GRAPH_CONSTELLATION_EDGE_DEFAULTS.character 
        : GRAPH_CONSTELLATION_EDGE_DEFAULTS.event;

      const edgeStyle: React.CSSProperties = {
        stroke: cfg.stroke,
        strokeWidth: strength * cfg.widthMultiplier,
        opacity: (cfg.opacityBase + strength * cfg.opacityMultiplier) * filterOpacityMultiplier,
      };

      if ("dasharray" in cfg) {
        edgeStyle.strokeDasharray = cfg.dasharray;
      }

      // 엣지 라벨 스타일 정의 (다크 럭셔리 & 피그마 감성)
      const labelStyle: React.CSSProperties = {
        fill: "rgba(255, 255, 255, 0.85)", // 세련된 오프화이트 텍스트
        fontSize: 9,
        fontWeight: 700,
        fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)",
        letterSpacing: "-0.01em",
      };

      const labelBgStyle: React.CSSProperties = {
        fill: "rgba(12, 10, 9, 0.95)", // 심오한 다크 백그라운드
        fillOpacity: 0.95,
        stroke: isCharacterMode ? "rgba(165, 180, 252, 0.35)" : "rgba(248, 113, 113, 0.45)", // 테두리 선
        strokeWidth: 1.2,
        rx: 6, // 둥근 라운딩 처리
        ry: 6,
      };

      return {
        ...edge,
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
    const computedNodes = MOCK_GRAPH_NODES.map((node): Node<GraphNodeData> => {
      const isCharacterMode = activeMode === "character";
      const isEarlyFilter = selectedChapterFilter === "early";

      // 챕터 필터에 따른 감쇠 연산
      const is15ChapterRelatedNode = 
        node.id === GRAPH_CORE_EVENTS.CHAPTER15 || 
        node.id === GRAPH_CORE_EVENTS.AMBUSH || 
        node.id === GRAPH_CORE_EVENTS.REBELS;
      const opacity = isEarlyFilter && is15ChapterRelatedNode ? 0.3 : 1.0;

      // 중심 주성 판별 (let 대입문을 삼항 연산자 const로 치환하여 assigned but not used 경고 100% 영구 해결)
      const starGrade: "prime" | "major" | "minor" = isCharacterMode
        ? node.id === GRAPH_CORE_CHARACTERS.JINSEO
          ? "prime"
          : (node.id === GRAPH_CORE_CHARACTERS.SERIN || node.id === "palace" || node.id === GRAPH_CORE_EVENTS.AMBUSH)
            ? "major"
            : "minor"
        : node.id === GRAPH_CORE_EVENTS.AMBUSH
          ? "prime"
          : (node.id === GRAPH_CORE_EVENTS.REBELS || node.id === GRAPH_CORE_CHARACTERS.JINSEO || node.id === GRAPH_CORE_EVENTS.CHAPTER15)
            ? "major"
            : "minor";

      // 특정 캐릭터/사건 빠른 필터 포커싱 시, 대상 노드가 아닌 것들은 감쇠 처리
      let filterFocusedOpacity = 1.0;
      if (selectedFocusNode !== "all") {
        if (node.id !== selectedFocusNode) {
          // 직접적으로 에지 연결되지 않은 노드는 거의 투명화
          const isConnected = MOCK_GRAPH_EDGES.some(
            (e) => (e.source === selectedFocusNode && e.target === node.id) ||
                   (e.target === selectedFocusNode && e.source === node.id) ||
                   node.id === selectedFocusNode
          );
          filterFocusedOpacity = isConnected ? 0.95 : 0.15;
        }
      }

      return {
        ...node,
        data: {
          ...node.data,
          starGrade,
          opacity: opacity * filterFocusedOpacity,
          isFocused: false,
        },
      };
    });

    return {
      filteredNodes: computedNodes,
      filteredEdges: computedEdges,
    };
  }, [activeMode, selectedChapterFilter, selectedFocusNode]);

  // 3. 필터 변경 또는 마운트 시 Force Layout 기동 (모드별 중심점 및 물리력 분기 대응)
  useEffect(() => {
    const layoutCenter = activeMode === "character" ? { x: 280, y: 250 } : { x: 340, y: 280 };
    const iterations = activeMode === "character" ? 75 : 85;

    const laidOutNodes = calculateForceLayout(filteredNodes, filteredEdges, iterations, layoutCenter);
    
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
              opacity: edge.data?.opacityBackup ?? edge.style?.opacity,
              strokeWidth: edge.data?.strokeWidthBackup ?? edge.style?.strokeWidth,
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
        const opacityBackup = edge.data?.opacityBackup ?? edge.style?.opacity ?? 0.6;
        const strokeWidthBackup = edge.data?.strokeWidthBackup ?? edge.style?.strokeWidth ?? 1.5;
        const strokeBackup = edge.data?.strokeBackup ?? edge.style?.stroke ?? "currentColor";
        const animatedBackup = edge.data?.animatedBackup ?? edge.animated ?? false;
        const labelBgStrokeBackup = edge.data?.labelBgStrokeBackup ?? edge.labelBgStyle?.stroke;

        const isCharacterMode = activeMode === "character";
        const relationColor = isCharacterMode ? "rgba(165, 180, 252, 0.95)" : "rgba(248, 113, 113, 0.95)";

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
            // 관련 에지는 선명하게, 관련 없는 에지는 어둠속으로 페이드아웃 (0.05)
            opacity: isRelated ? 0.95 : 0.05,
            strokeWidth: isRelated ? (Number(strokeWidthBackup) + 1.2) : strokeWidthBackup,
            stroke: isRelated ? relationColor : strokeBackup,
          },
          labelStyle: {
            ...edge.labelStyle,
            opacity: isRelated ? 1.0 : 0.05,
          },
          labelBgStyle: {
            ...edge.labelBgStyle,
            opacity: isRelated ? 1.0 : 0.05,
            stroke: isRelated ? relationColor : labelBgStrokeBackup,
          }
        };
      })
    );
  }, [focusId, activeMode, setNodes, setEdges]);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node<GraphNodeData>) => {
      setFocusId(node.id);
    },
    [setFocusId]
  );

  const onPaneClick = useCallback(() => {
    setFocusId(null);
  }, [setFocusId]);

  return (
    <div className="h-full w-full bg-canvas relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
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
          color="currentColor"
          className="text-muted-foreground/25 dark:text-muted-foreground/35"
        />
      </ReactFlow>
    </div>
  );
}
