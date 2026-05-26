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
import { 
  Info, 
  BookOpen, 
  Users, 
  HelpCircle, 
  ChevronDown, 
  Layers, 
  Quote, 
  ArrowRight 
} from "lucide-react";
import PensiveNode from "./PensiveNode";
import type { GraphNodeData } from "../../types/graph";
import { useGraphStore } from "../../stores/graph/graphStore";
import { calculateForceLayout } from "../../utils/graphLayout";
import { MOCK_GRAPH_NODES, MOCK_GRAPH_EDGES } from "../../constants/graphMockData";
import { GRAPH_CORE_CHARACTERS, GRAPH_CORE_EVENTS } from "../../constants/node";
import { GRAPH_CONSTELLATION_EDGE_DEFAULTS } from "../../constants/edge";
import { CANVAS_FIT_VIEW_PADDING, CANVAS_ZOOM_MAX, CANVAS_ZOOM_MIN } from "@shared/constants/canvasSizing";
import { cn } from "@shared/types/utils";

// React Flow 인라인 객체 오버헤드 0%를 위한 모듈 레벨 상수화 및 ES1st 룰 완비
const PRO_OPTIONS = { hideAttribution: true } as const;
const FIT_VIEW_OPTIONS = { padding: CANVAS_FIT_VIEW_PADDING } as const;

const nodeTypes = {
  pensive: PensiveNode,
};

export default function GraphSurface() {
  const { t } = useTranslation();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLegendOpen, setIsLegendOpen] = useState(true);

  // Zustand 전체 스토어 구독 결함 해결: 개별 Selector 분리 구독으로 불필요 리렌더링 0% 통제
  const focusId = useGraphStore((state) => state.focusId);
  const setFocusId = useGraphStore((state) => state.setFocusId);
  const hoverId = useGraphStore((state) => state.hoverId);

  // 1. Luie 관계 시나리오 필터 상태 구독 (Zustand 스토어 연동)
  const activeMode = useGraphStore((state) => state.activeMode);
  const selectedChapterFilter = useGraphStore((state) => state.selectedChapterFilter);
  const selectedFocusNode = useGraphStore((state) => state.selectedFocusNode);

  // 호버 또는 클릭(포커스)된 노드를 실시간으로 계산 (원거리 역스케일 디스플레이용)
  const activeNodeId = focusId || hoverId;
  const activeNode = useMemo(() => {
    if (!activeNodeId) return null;
    return MOCK_GRAPH_NODES.find((node) => node.id === activeNodeId);
  }, [activeNodeId]);

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
    <div className="h-full w-full bg-canvas relative overflow-hidden select-none">
      {/* 1. Onboarding Header (좌측 상단 타이틀 & 캡션) */}
      <div className="absolute top-6 left-6 z-30 pointer-events-none max-w-[500px] flex flex-col gap-1.5 transition-all duration-300">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-foreground/10 border border-foreground/15 flex items-center justify-center text-foreground shadow-[0_0_15px_rgba(255,255,255,0.05)]">
            <Layers className="h-4 w-4" />
          </div>
          <h1 className="text-[16px] font-black tracking-tight text-foreground uppercase flex items-center">
            {t("canvas.graph.title", "월드 네비게이터")}
            <span className="ml-2 text-[9px] tracking-widest font-normal text-muted-foreground bg-muted-foreground/10 border border-muted-foreground/20 px-2 py-0.5 rounded-full uppercase shrink-0">
              World Navigator
            </span>
          </h1>
        </div>
        <p className="text-[11px] font-medium leading-relaxed text-muted-foreground break-keep pl-9.5 select-text">
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
          isLegendOpen ? "w-[240px]" : "w-[44px] h-[40px] items-center justify-center cursor-pointer hover:bg-background/95"
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
            
            <div className="p-3.5 flex flex-col gap-3">
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
          <HelpCircle className="h-4.5 w-4.5 text-muted-foreground" title={t("canvas.graph.legend.open", "범례 열기")} />
        )}
      </div>

      {/* 3. Absolute Details Detective Inspector Panel (우측 고정 수사 메모 인스펙터) */}
      <div 
        className={cn(
          "absolute top-6 right-6 bottom-6 z-30 w-[300px] pointer-events-auto rounded-2xl border border-border/40 bg-background/85 backdrop-blur-lg shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex flex-col transition-all duration-300 transform",
          activeNode 
            ? "translate-x-0 opacity-100 scale-100" 
            : "translate-x-12 opacity-0 scale-95 pointer-events-none"
        )}
      >
        {activeNode && (
          <>
            {/* 인스펙터 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/20 bg-muted/20">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span className="text-[11px] font-bold tracking-tight text-foreground uppercase">
                  {t("canvas.graph.inspector.title", "설정 수사 정보")}
                </span>
              </div>
              {focusId && (
                <button 
                  onClick={() => setFocusId(null)}
                  className="text-[10px] text-muted-foreground hover:text-foreground font-bold tracking-tight bg-muted/30 hover:bg-muted/70 px-2 py-0.5 rounded-md transition-colors"
                >
                  {t("canvas.graph.inspector.deselect", "해제")}
                </button>
              )}
            </div>

            {/* 인스펙터 스크롤 영역 */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scrollbar-thin">
              {/* 인물 프로필 요약 */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <h2 className="text-[15px] font-black tracking-tight text-foreground">{activeNode.data.label}</h2>
                  {activeNode.data.type && (
                    <span className="text-[9px] uppercase tracking-wider font-extrabold text-indigo-400 bg-indigo-950/40 border border-indigo-800/40 px-2 py-0.5 rounded-sm">
                      {t(`canvas.node.kind.${activeNode.data.type}` as never, activeNode.data.type)}
                    </span>
                  )}
                </div>
                {activeNode.data.description && (
                  <p className="text-[11px] leading-relaxed text-muted-foreground break-keep bg-muted/10 p-2.5 rounded-lg border border-border/20 select-text">
                    {activeNode.data.description}
                  </p>
                )}
              </div>

              {/* 캐릭터 간의 세부 관계도 매핑 */}
              {activeNode.data.relationships && activeNode.data.relationships.length > 0 && (
                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                      {t("canvas.graph.inspector.relationships", "얽힌 인물 관계")}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5 pl-0.5">
                    {activeNode.data.relationships.map((rel, index) => (
                      <div 
                        key={index} 
                        className="flex flex-col gap-0.5 p-2 rounded-lg bg-surface/40 border border-border/20 hover:border-border/30 hover:bg-surface/60 transition-all duration-200"
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className="text-foreground">{activeNode.data.label}</span>
                          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/65 text-[9px] text-muted-foreground border border-border/20 shrink-0">
                            <span>{rel.type}</span>
                            <ArrowRight className="h-2.5 w-2.5" />
                          </div>
                          <span className="text-foreground">{rel.targetName}</span>
                        </div>
                        {rel.details && (
                          <span className="text-[9px] text-muted-foreground mt-1 pl-1 border-l-2 border-border/25 break-keep">
                            {rel.details}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 연관 등장 회차 리스트 */}
              {activeNode.data.relatedChapters && activeNode.data.relatedChapters.length > 0 && (
                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                      {t("canvas.graph.inspector.chapters", "연관 등장 챕터")}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pl-0.5">
                    {activeNode.data.relatedChapters.map((chapter, index) => (
                      <span 
                        key={index}
                        className="text-[9px] font-bold text-foreground bg-muted/30 border border-border/25 px-2 py-0.5 rounded-full hover:bg-muted/65 cursor-default transition-all"
                      >
                        {chapter}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 소설 원문 / 명대사 (Source Texts 인쇄) */}
              {activeNode.data.sourceTexts && activeNode.data.sourceTexts.length > 0 && (
                <div className="flex flex-col gap-2 border-t border-border/20 pt-3 mt-1">
                  <div className="flex items-center gap-1.5">
                    <Quote className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                      {t("canvas.graph.inspector.quotes", "본문 묘사 및 인용")}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2.5 pl-0.5">
                    {activeNode.data.sourceTexts.map((text, index) => (
                      <div 
                        key={index}
                        className="relative p-3 rounded-lg border border-amber-900/10 bg-amber-950/5 dark:bg-amber-950/10 text-fg/90 shadow-sm flex flex-col gap-1 overflow-hidden"
                      >
                        {/* 수사 자료 양식지 디자인의 수려한 가로 보더 데코 */}
                        <div className="absolute top-0 left-0 bottom-0 w-1 bg-amber-600/35" />
                        <p className="text-[10px] leading-relaxed italic font-medium break-keep pl-1.5 select-text">
                          "{text}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
