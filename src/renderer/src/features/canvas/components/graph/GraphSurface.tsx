import { useEffect, useCallback, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  PanOnScrollMode,
  MarkerType,
  type Node,
  useNodesState,
  useEdgesState
} from "reactflow";
import { useTranslation } from "react-i18next";
import { HelpCircle, ChevronDown, Layers, X } from "lucide-react";
import PensiveNode from "./PensiveNode";
import type { GraphNodeData } from "../../types/graph";
import { useGraphStore } from "../../stores/graph/graphStore";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { calculateForceLayout } from "../../utils/graphLayout";
import { MOCK_GRAPH_NODES, MOCK_GRAPH_EDGES } from "../../constants/graphMockData";
import { GRAPH_CORE_CHARACTERS, GRAPH_CORE_EVENTS } from "../../constants/node";
import { GRAPH_CONSTELLATION_EDGE_DEFAULTS } from "../../constants/edge";
import { CANVAS_FIT_VIEW_PADDING, CANVAS_ZOOM_MAX, CANVAS_ZOOM_MIN } from "@shared/constants/canvasSizing";
import { cn } from "@shared/types/utils";

// React Flow 인라인 객체 오버헤드 0%를 위한 모듈 레벨 상수화 및 ES1st 룰 완비
const PRO_OPTIONS = { hideAttribution: true } as const;
const FIT_VIEW_OPTIONS = { padding: CANVAS_FIT_VIEW_PADDING } as const;

// 하드코딩 매직 넘버 방지를 위한 모듈 수준 레이아웃 및 엣지 스타일 상수 정의
const LAYOUT_CENTER_CHARACTER = { x: 280, y: 250 } as const;
const LAYOUT_CENTER_EVENT = { x: 340, y: 280 } as const;
const LAYOUT_ITERATIONS_CHARACTER = 75 as const;
const LAYOUT_ITERATIONS_EVENT = 85 as const;

const EDGE_FALLBACK_OPACITY = 0.6 as const;
const EDGE_FALLBACK_STROKE_WIDTH = 1.5 as const;
const EDGE_FOCUS_OPACITY = 0.95 as const;
const EDGE_UNFOCUS_OPACITY = 0.05 as const;

const nodeTypes = {
  pensive: PensiveNode,
};

export default function GraphSurface() {
  const { t } = useTranslation();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLegendOpen, setIsLegendOpen] = useState(true);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

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
    const layoutCenter = activeMode === "character" ? LAYOUT_CENTER_CHARACTER : LAYOUT_CENTER_EVENT;
    const iterations = activeMode === "character" ? LAYOUT_ITERATIONS_CHARACTER : LAYOUT_ITERATIONS_EVENT;

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
            // 관련 에지는 선명하게, 관련 없는 에지는 어둠속으로 페이드아웃
            opacity: isRelated ? EDGE_FOCUS_OPACITY : EDGE_UNFOCUS_OPACITY,
            strokeWidth: isRelated ? (baseWidth + 1.2) : baseWidth,
            stroke: isRelated ? relationColor : strokeBackup,
          },
          labelStyle: {
            ...edge.labelStyle,
            opacity: isRelated ? 1.0 : EDGE_UNFOCUS_OPACITY,
          },
          labelBgStyle: {
            ...edge.labelBgStyle,
            opacity: isRelated ? 1.0 : EDGE_UNFOCUS_OPACITY,
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

  return (
    <div className="h-full w-full bg-canvas relative overflow-hidden select-none">
      {/* 1. Onboarding Header (좌측 상단 타이틀 & 캡션) */}
      <div className="absolute top-6 left-6 z-30 max-w-[500px] flex flex-col gap-1.5 transition-all duration-300">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-foreground/10 border border-foreground/15 flex items-center justify-center text-foreground shadow-[0_0_15px_rgba(255,255,255,0.05)] pointer-events-none">
            <Layers className="h-4 w-4" />
          </div>
          <h1 className="text-[16px] font-black tracking-tight text-foreground uppercase flex items-center pointer-events-none">
            {t("canvas.graph.title", "월드 네비게이터")}
            <span className="ml-2 text-[9px] tracking-widest font-normal text-muted-foreground bg-muted-foreground/10 border border-muted-foreground/20 px-2 py-0.5 rounded-full uppercase shrink-0">
              World Navigator
            </span>
          </h1>
          <button 
            onClick={() => setIsGuideModalOpen(true)}
            className="h-5 w-5 rounded-full bg-foreground/10 border border-foreground/15 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/25 transition-all cursor-pointer border-none shadow-[0_0_10px_rgba(255,255,255,0.02)]"
            title={t("canvas.graph.legend.open", "사용 설명서 열기")}
          >
            <HelpCircle className="h-3 w-3" />
          </button>
        </div>
        <p className="text-[11px] font-medium leading-relaxed text-muted-foreground break-keep pl-9.5 select-text pointer-events-none">
          {t("canvas.graph.subtitle", "소설 속 인물들의 인적 관계망과 챕터별 핵심 사건의 인과관계를 밤하늘의 별자리와 수사 칠판 테마로 입체 시각화하는 작가 전용 내비게이터입니다.")}
        </p>
      </div>

      {/* React Flow Canvas */}
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

      {/* 2. Interactive Legend Panel (좌측 하단 접이식 범례) */}
      <div 
        className={cn(
          "absolute bottom-6 left-6 z-30 transition-all duration-300 flex flex-col rounded-xl border border-border/40 bg-background/80 backdrop-blur-md shadow-2xl shadow-black/40 overflow-hidden",
          isLegendOpen ? "w-[240px] h-[216px]" : "w-[240px] h-[40px] cursor-pointer hover:bg-background/95"
        )}
        onClick={() => !isLegendOpen && setIsLegendOpen(true)}
      >
        {isLegendOpen ? (
          <>
            <div className="flex items-center justify-between px-3.5 py-2 border-b border-border/20 bg-muted/20">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px] font-black tracking-tight text-foreground">
                  {t("canvas.graph.legend.title", "그래프 범례")}
                </span>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLegendOpen(false);
                }}
                className="h-5 w-5 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
            
            <div className={cn(
              "p-3.5 flex flex-col gap-3 transition-all duration-300 origin-top",
              isLegendOpen ? "opacity-100 scale-y-100" : "opacity-0 scale-y-90 pointer-events-none h-0 overflow-hidden"
            )}>
              {/* 노드 범례 */}
              <div className="flex flex-col gap-2">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{t("canvas.graph.legend.nodes", "노드 (개체)")}</span>
                <div className="grid grid-cols-1 gap-1.5 pl-0.5">
                  <div className="flex items-center gap-2 text-[10px] text-foreground font-semibold">
                    <span className="h-3 w-3 rounded-full bg-foreground border border-border/50 shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
                    <span>{t("canvas.graph.legend.node.prime", "핵심 주연 캐릭터")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-foreground font-semibold">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/80 border border-border/50" />
                    <span>{t("canvas.graph.legend.node.major", "조연 / 연관 세력")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-foreground font-semibold">
                    <span className="h-2 w-2 rounded-sm bg-muted-foreground/60 border border-border/50" />
                    <span>{t("canvas.graph.legend.node.chapter", "집필 회차 (챕터)")}</span>
                  </div>
                </div>
              </div>
              
              {/* 에지 범례 */}
              <div className="flex flex-col gap-2 border-t border-border/20 pt-2.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{t("canvas.graph.legend.edges", "에지 (관계)")}</span>
                <div className="flex flex-col gap-1.5 pl-0.5">
                  <div className="flex items-center gap-2 text-[10px] text-foreground font-semibold">
                    <span className="w-6 border-b border-dashed border-indigo-300/60" />
                    <span>{t("canvas.graph.legend.edge.character", "성간 인물 관계선")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-foreground font-semibold">
                    <span className="w-6 border-b-2 border-red-400/60" />
                    <span>{t("canvas.graph.legend.edge.event", "인과 관계 수사선 (붉은 실)")}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <span title={t("canvas.graph.legend.open", "범례 열기")} className="inline-flex cursor-pointer items-center justify-center w-full h-full">
            <HelpCircle className="h-4.5 w-4.5 text-muted-foreground" />
          </span>
        )}
      </div>

      {/* 3. Nebula Constellation Guide Modal (대형 반투명 다크 글래스모피즘 가이드 팝업 모달) */}
      {isGuideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-background/95 border border-border/40 w-[500px] rounded-2xl shadow-2xl p-6 flex flex-col gap-5 select-text text-fg relative animate-in zoom-in-95 duration-200">
            {/* 닫기 단추 */}
            <button 
              onClick={() => setIsGuideModalOpen(false)}
              className="absolute top-5.5 right-5.5 h-6.5 w-6.5 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all cursor-pointer border-none bg-transparent"
            >
              <X className="h-4 w-4" />
            </button>

            {/* 가이드 헤더 */}
            <div className="flex flex-col gap-1 pr-8 pointer-events-none">
              <h2 className="text-[15px] font-black tracking-tight text-foreground uppercase flex items-center gap-2">
                <Layers className="h-4.5 w-4.5 text-accent" />
                {t("canvas.graph.guideTitle", "월드 네비게이터 사용법")}
              </h2>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                World Navigator Guide Map
              </p>
            </div>

            {/* 설명 카드 영역 (수사판 단서지 디자인) */}
            <div className="flex flex-col gap-3.5 mt-1">
              {/* 항목 1 */}
              <div className="flex gap-3.5 p-3.5 rounded-xl border border-border/20 bg-muted/10 pointer-events-none">
                <span className="h-5.5 w-5.5 shrink-0 rounded-full bg-foreground/10 border border-foreground/15 flex items-center justify-center text-[10px] font-black text-foreground shadow-sm">
                  1
                </span>
                <div className="flex flex-col gap-1">
                  <h4 className="text-[11px] font-extrabold text-foreground">{t("canvas.graph.guide.step1Title", "별자리 인물 관계도 (Character Constellation)")}</h4>
                  <p className="text-[10px] text-muted-foreground leading-relaxed break-keep">
                    {t("canvas.graph.guide.step1Desc", "주인공 '진서' 노드를 거성으로 삼아 인물들 간의 성간 연계를 밤하늘의 별자리 형태로 표현합니다. 각 노드의 등급에 따라 Halos 광배 효과가 다채롭게 빛납니다.")}
                  </p>
                </div>
              </div>

              {/* 항목 2 */}
              <div className="flex gap-3.5 p-3.5 rounded-xl border border-border/20 bg-muted/10 pointer-events-none">
                <span className="h-5.5 w-5.5 shrink-0 rounded-full bg-foreground/10 border border-foreground/15 flex items-center justify-center text-[10px] font-black text-foreground shadow-sm">
                  2
                </span>
                <div className="flex flex-col gap-1">
                  <h4 className="text-[11px] font-extrabold text-foreground">{t("canvas.graph.guide.step2Title", "인과관계 수사선 (Investigation Red Thread)")}</h4>
                  <p className="text-[10px] text-muted-foreground leading-relaxed break-keep">
                    {t("canvas.graph.guide.step2Desc", "마차 습격 사건과 같은 핵심 복선을 기준으로 전후 원인과 파급 사건들을 '붉은 실' 형태의 수사선으로 그리며, 실시간 화살표 흐름 애니메이션으로 개연성 충돌을 사전에 적발합니다.")}
                  </p>
                </div>
              </div>

              {/* 항목 3 */}
              <div className="flex gap-3.5 p-3.5 rounded-xl border border-border/20 bg-muted/10 pointer-events-none">
                <span className="h-5.5 w-5.5 shrink-0 rounded-full bg-foreground/10 border border-foreground/15 flex items-center justify-center text-[10px] font-black text-foreground shadow-sm">
                  3
                </span>
                <div className="flex flex-col gap-1">
                  <h4 className="text-[11px] font-extrabold text-foreground">{t("canvas.graph.guide.step3Title", "스마트 바인더 상세 연동 (Binder Details Integration)")}</h4>
                  <p className="text-[10px] text-muted-foreground leading-relaxed break-keep">
                    {t("canvas.graph.guide.step3Desc", "캔버스의 특정 노드를 클릭하면 복잡한 툴팁이 닫히며 우측 바인더 패널 내에 전용 '인물 설정 분석지'가 쓱 미끄러져 열립니다. 원고 본문 명대사 스크랩과 연관 챕터를 방해 없이 가독성 높게 추적 가능합니다.")}
                  </p>
                </div>
              </div>
            </div>

            {/* 가이드 하단 단추 */}
            <div className="flex justify-end gap-2.5 mt-1 border-t border-border/20 pt-4">
              <button 
                onClick={() => setIsGuideModalOpen(false)}
                className="text-[10.5px] font-black tracking-tight text-on-accent bg-accent hover:bg-accent/90 px-4 py-2 rounded-lg cursor-pointer transition-all border-none"
              >
                {t("canvas.graph.guide.close", "탐색 시작")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
