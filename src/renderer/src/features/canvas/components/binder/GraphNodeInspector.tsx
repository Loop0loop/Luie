import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Info, BookOpen, Users, Quote, ArrowRight } from "lucide-react";
import { MOCK_GRAPH_NODES } from "../../constants/graphMockData";
import { useGraphStore } from "../../stores/graph/graphStore";

interface GraphNodeInspectorProps {
  nodeId: string;
}

function GraphNodeInspector({ nodeId }: GraphNodeInspectorProps) {
  const { t } = useTranslation();
  const setFocusId = useGraphStore((state) => state.setFocusId);

  const activeNode = useMemo(() => {
    return MOCK_GRAPH_NODES.find((node) => node.id === nodeId) ?? null;
  }, [nodeId]);

  if (!activeNode) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-muted select-none">
        <Info className="h-6 w-6 opacity-30 mb-2" />
        <p className="text-xs">{t("canvas.graph.details.notFound", "설정 정보가 존재하지 않습니다.")}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-panel overflow-hidden">
      {/* 바인더 내부 인스펙터 헤더 - Sidebar.tsx 디자인 통일성 */}
      <div className="flex items-center justify-between px-4.5 py-3.5 border-b border-border/20 bg-element/10 shrink-0">
        <div className="flex items-center gap-2">
          <Info className="h-3.5 w-3.5 text-accent" />
          <span className="text-[11px] font-black tracking-widest text-fg uppercase">
            {t("canvas.graph.details.detailsHeader", "인물 설정 분석지")}
          </span>
        </div>
        <button 
          onClick={() => setFocusId(null)}
          className="text-[10px] text-muted hover:text-fg font-extrabold tracking-tight bg-element border border-border/40 hover:border-border/80 px-2.5 py-1 rounded-md transition-all cursor-pointer"
        >
          {t("canvas.graph.details.deselect", "해제")}
        </button>
      </div>

      {/* 인스펙터 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6.5 scrollbar-thin select-none">
        {/* 인물 기본 요약 */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-black tracking-tight text-fg">{activeNode.data.label}</h2>
            {activeNode.data.type && (
              <span className="text-[9px] uppercase tracking-widest font-black text-accent bg-accent/10 border border-accent/25 px-2 py-0.5 rounded">
                {t(`canvas.node.kind.${activeNode.data.type}` as never, activeNode.data.type)}
              </span>
            )}
          </div>
          {activeNode.data.description && (
            <p className="text-[11.5px] leading-relaxed text-muted break-keep bg-element/20 p-3.5 rounded-xl border border-border/25 shadow-inner select-text">
              {activeNode.data.description}
            </p>
          )}
        </div>

        {/* 캐릭터 관계 매핑 - 피그마 스타일 카드 개편 */}
        {activeNode.data.relationships && activeNode.data.relationships.length > 0 && (
          <div className="flex flex-col gap-3 pt-0.5">
            <div className="flex items-center gap-1.5 border-b border-border/15 pb-2">
              <Users className="h-3.5 w-3.5 text-muted" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted">
                {t("canvas.graph.details.relationships", "얽힌 인물 관계")}
              </span>
            </div>
            <div className="flex flex-col gap-2.5">
              {activeNode.data.relationships.map((rel, index) => (
                <div 
                  key={index} 
                  className="flex flex-col gap-2 p-3 rounded-xl bg-element/10 border border-border/20 hover:border-border/40 hover:bg-element/20 transition-all duration-200"
                >
                  <div className="flex items-center justify-between text-[11px] font-extrabold text-fg">
                    <span className="text-fg">{activeNode.data.label}</span>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-panel text-[9.5px] text-muted border border-border/20 shrink-0 font-bold">
                      <span>{rel.type}</span>
                      <ArrowRight className="h-2.5 w-2.5 text-accent/60" />
                    </div>
                    <span className="text-fg">{rel.targetName}</span>
                  </div>
                  {rel.details && (
                    <span className="text-[9.5px] text-muted pl-2 border-l border-border/20 break-keep font-medium leading-normal">
                      {rel.details}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 연관 등장 회차 - 럭셔리 마이크로 발광 링 효과 */}
        {activeNode.data.relatedChapters && activeNode.data.relatedChapters.length > 0 && (
          <div className="flex flex-col gap-3 pt-0.5">
            <div className="flex items-center gap-1.5 border-b border-border/15 pb-2">
              <BookOpen className="h-3.5 w-3.5 text-muted" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted">
                {t("canvas.graph.details.chapters", "연관 등장 챕터")}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {activeNode.data.relatedChapters.map((chapter, index) => (
                <span 
                  key={index}
                  className="text-[9.5px] font-bold text-fg bg-element/40 border border-border/20 px-2.5 py-1 rounded-full hover:bg-element hover:scale-105 hover:shadow-[0_0_8px_var(--accent-bg)] cursor-default transition-all duration-200"
                >
                  {chapter}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 소설 원문 명대사 스크랩 - 초호화 인장 및 데코 적용 */}
        {activeNode.data.sourceTexts && activeNode.data.sourceTexts.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-border/20 pt-4 mt-1">
            <div className="flex items-center gap-1.5 pb-1">
              <Quote className="h-3.5 w-3.5 text-muted" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted">
                {t("canvas.graph.details.quotes", "본문 묘사 및 인용")}
              </span>
            </div>
            <div className="flex flex-col gap-3.5">
              {activeNode.data.sourceTexts.map((text, index) => (
                <div 
                  key={index}
                  className="relative p-4.5 rounded-xl border border-border/20 bg-gradient-to-br from-element/10 to-element/30 dark:from-element/20 dark:to-element/40 text-fg/90 shadow-sm flex flex-col gap-2 overflow-hidden"
                >
                  <div className="absolute top-0 left-0 bottom-0 w-1 bg-accent/40" />
                  <Quote className="absolute -bottom-2.5 -right-2.5 w-12 h-12 text-fg/5 opacity-5 dark:opacity-10 pointer-events-none" />
                  <p className="text-[10.5px] leading-relaxed italic font-semibold break-keep pl-1.5 select-text relative z-10 text-fg">
                    "{text}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(GraphNodeInspector);
