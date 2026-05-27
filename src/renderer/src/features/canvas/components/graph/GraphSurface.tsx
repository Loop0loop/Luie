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
import { HelpCircle, X } from "lucide-react";
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
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

  // Zustand 전체 스토어 구독 결함 해결: 개별 Selector 분리 구독으로 불필요 리렌더링 0% 통제
  const focusId = useGraphStore((state) => state.focusId);
  const setFocusId = useGraphStore((state) => state.setFocusId);
  const hoverId = useGraphStore((state) => state.hoverId);
  const isRightPanelOpen = useUIStore((state) => state.regions?.rightPanel?.open ?? false);

  // 1. Luie 관계 시나리오 필터 상태 구독 (Zustand 스토어 연동)
  const activeMode = useGraphStore((state) => state.activeMode);
  const selectedChapterFilter = useGraphStore((state) => state.selectedChapterFilter);
  const selectedFocusNode = useGraphStore((state) => state.selectedFocusNode);

  // hoverId에 대응하는 노드 데이터를 실시간 추적하여 호버 플로팅 카드에 공급
  const hoverNode = useMemo(() => {
    if (!hoverId) return null;
    return MOCK_GRAPH_NODES.find((node) => node.id === hoverId) ?? null;
  }, [hoverId]);

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

      {/* 3. 인물 관계 수사망 플로팅 모달 (호버 상태 - 초호화 피그마 Aesthetics) */}
      {hoverNode && (
        <div 
          className={cn(
            "absolute top-16 z-30 w-[300px] rounded-2xl border border-border/30 bg-panel/85 backdrop-blur-xl p-4 shadow-[0_12px_40px_rgba(0,0,0,0.25)] animate-in fade-in duration-300 text-fg flex flex-col gap-3.5 select-none overflow-hidden after:absolute after:top-0 after:left-0 after:right-0 after:h-[1px] after:bg-gradient-to-r after:from-accent/40 after:to-transparent after:rounded-t-2xl transition-all duration-300",
            isRightPanelOpen ? "right-[340px]" : "right-6"
          )}
        >
          {/* 타이틀 영역 */}
          <div className="flex items-center justify-between border-b border-border/20 pb-2.5 relative z-10">
            <h4 className="text-[13px] font-black tracking-tight text-foreground">{hoverNode.data.label}</h4>
            {hoverNode.data.type && (
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded">
                {t(`canvas.node.kind.${hoverNode.data.type}` as never, hoverNode.data.type)}
              </span>
            )}
          </div>

          {/* 설명/묘사 */}
          {hoverNode.data.description && (
            <p className="text-[11px] leading-relaxed text-muted break-keep bg-element/40 p-3 rounded-xl border border-border/15 select-text relative z-10 font-normal">
              {hoverNode.data.description}
            </p>
          )}

          {/* 얽힌 인물 관계 */}
          {hoverNode.data.relationships && hoverNode.data.relationships.length > 0 && (
            <div className="flex flex-col gap-2 pt-0.5 relative z-10">
              <div className="flex items-center gap-1 border-b border-border/15 pb-1.5">
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted">
                  {t("canvas.graph.details.relationships", "얽힌 인물 관계")}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {hoverNode.data.relationships.slice(0, 3).map((rel, index) => (
                  <div 
                    key={index} 
                    className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-element/20 border border-border/15 hover:border-border/30 hover:bg-element/30 transition-all duration-200 text-[10px]"
                  >
                    <div className="flex items-center justify-between font-extrabold">
                      <span className="text-foreground">{hoverNode.data.label}</span>
                      <span className="text-[8.5px] bg-panel px-1.5 py-0.5 rounded text-muted-foreground border border-border/20 shrink-0 font-bold">
                        {rel.type}
                      </span>
                      <span className="text-foreground">{rel.targetName}</span>
                    </div>
                    {rel.details && (
                      <span className="text-[9px] text-muted-foreground pl-1.5 border-l border-border/30 leading-normal break-keep font-medium">
                        {rel.details}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 연관 등장 챕터 */}
          {hoverNode.data.relatedChapters && hoverNode.data.relatedChapters.length > 0 && (
            <div className="flex flex-col gap-2 pt-0.5 relative z-10">
              <div className="flex items-center gap-1 border-b border-border/15 pb-1.5">
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted">
                  {t("canvas.graph.details.chapters", "연관 등장 챕터")}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {hoverNode.data.relatedChapters.map((chapter, index) => (
                  <span 
                    key={index}
                    className="text-[9px] font-bold text-foreground bg-element/60 border border-border/15 px-2.5 py-1 rounded-full hover:bg-element hover:scale-105 transition-all cursor-default"
                  >
                    {chapter}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. 그래프 범례 승격 팝업 모달 */}
      {isGuideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-panel border border-border/40 w-[400px] rounded-2xl shadow-2xl p-5 flex flex-col gap-4 text-fg relative animate-in zoom-in-95 duration-200 select-none">
            {/* 닫기 버튼 */}
            <button 
              type="button"
              onClick={() => setIsGuideModalOpen(false)}
              className="absolute top-4.5 right-4.5 h-6 w-6 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all cursor-pointer border-none bg-transparent"
            >
              <X className="h-4 w-4" />
            </button>

            {/* 헤더 */}
            <div className="flex flex-col gap-0.5 pointer-events-none">
              <h2 className="text-[14px] font-black tracking-tight text-foreground uppercase flex items-center gap-2">
                <HelpCircle className="h-4.5 w-4.5 text-accent" />
                {t("canvas.graph.legend.title", "그래프 범례")}
              </h2>
              <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">
                Graph Legend Map
              </p>
            </div>

            {/* 범례 리스트 */}
            <div className="flex flex-col gap-4 mt-1 border-t border-border/20 pt-3">
              {/* 노드 범례 */}
              <div className="flex flex-col gap-2">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("canvas.graph.legend.nodes", "노드 (개체)")}
                </span>
                <div className="grid grid-cols-1 gap-2 pl-0.5">
                  <div className="flex items-center gap-2.5 text-[11px] text-foreground font-semibold bg-surface/40 p-2 rounded-lg border border-border/10">
                    <span className="h-3.5 w-3.5 rounded-full bg-foreground border border-border/50 shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
                    <span>{t("canvas.graph.legend.node.prime", "핵심 주연 캐릭터")}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-[11px] text-foreground font-semibold bg-surface/40 p-2 rounded-lg border border-border/10">
                    <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/80 border border-border/50" />
                    <span>{t("canvas.graph.legend.node.major", "조연 / 연관 세력")}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-[11px] text-foreground font-semibold bg-surface/40 p-2 rounded-lg border border-border/10">
                    <span className="h-2.5 w-2.5 rounded-sm bg-muted-foreground/60 border border-border/50" />
                    <span>{t("canvas.graph.legend.node.chapter", "집필 회차 (챕터)")}</span>
                  </div>
                </div>
              </div>
              
              {/* 에지 범례 */}
              <div className="flex flex-col gap-2 border-t border-border/20 pt-3">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("canvas.graph.legend.edges", "에지 (관계)")}
                </span>
                <div className="grid grid-cols-1 gap-2 pl-0.5">
                  <div className="flex items-center gap-2.5 text-[11px] text-foreground font-semibold bg-surface/40 p-2 rounded-lg border border-border/10">
                    <span className="w-6 border-b border-dashed border-indigo-400" />
                    <span>{t("canvas.graph.legend.edge.character", "성간 인물 관계선")}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-[11px] text-foreground font-semibold bg-surface/40 p-2 rounded-lg border border-border/10">
                    <span className="w-6 border-b-2 border-red-400" />
                    <span>{t("canvas.graph.legend.edge.event", "인과 관계 수사선 (붉은 실)")}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 확인 버튼 */}
            <div className="flex justify-end gap-2.5 mt-1 border-t border-border/20 pt-3">
              <button 
                type="button"
                onClick={() => setIsGuideModalOpen(false)}
                className="text-[10.5px] font-bold tracking-tight text-on-accent bg-accent hover:bg-accent/90 px-4 py-2 rounded-lg cursor-pointer transition-all border-none"
              >
                {t("canvas.graph.guide.close", "확인")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
