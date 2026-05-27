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
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-muted-foreground select-none">
        <Info className="h-6 w-6 opacity-30 mb-2" />
        <p className="text-xs">{t("canvas.graph.details.notFound", "설정 정보가 존재하지 않습니다.")}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-panel overflow-hidden">
      {/* 바인더 내부 인스펙터 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/20 bg-muted/10 shrink-0">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-accent" />
          <span className="text-[11px] font-bold tracking-tight text-foreground uppercase">
            {t("canvas.graph.details.detailsHeader", "인물 설정 분석지")}
          </span>
        </div>
        <button 
          onClick={() => setFocusId(null)}
          className="text-[10px] text-muted-foreground hover:text-foreground font-bold tracking-tight bg-muted/40 hover:bg-muted/80 px-2 py-0.5 rounded-md transition-colors border-none cursor-pointer"
        >
          {t("canvas.graph.details.deselect", "해제")}
        </button>
      </div>

      {/* 인스펙터 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5 scrollbar-thin select-none">
        {/* 인물 기본 요약 */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-black tracking-tight text-foreground">{activeNode.data.label}</h2>
            {activeNode.data.type && (
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-indigo-400 bg-indigo-950/40 border border-indigo-800/40 px-2.5 py-0.5 rounded-sm">
                {t(`canvas.node.kind.${activeNode.data.type}` as never, activeNode.data.type)}
              </span>
            )}
          </div>
          {activeNode.data.description && (
            <p className="text-[11.5px] leading-relaxed text-muted-foreground break-keep bg-muted/20 p-3 rounded-lg border border-border/30 select-text">
              {activeNode.data.description}
            </p>
          )}
        </div>

        {/* 캐릭터 관계 매핑 */}
        {activeNode.data.relationships && activeNode.data.relationships.length > 0 && (
          <div className="flex flex-col gap-2.5 pt-1">
            <div className="flex items-center gap-1.5 border-b border-border/20 pb-1">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("canvas.graph.details.relationships", "얽힌 인물 관계")}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {activeNode.data.relationships.map((rel, index) => (
                <div 
                  key={index} 
                  className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-surface/50 border border-border/25 hover:border-border/50 hover:bg-surface/75 transition-all duration-200"
                >
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-foreground">{activeNode.data.label}</span>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-muted/80 text-[9.5px] text-muted-foreground border border-border/20 shrink-0">
                      <span>{rel.type}</span>
                      <ArrowRight className="h-2.5 w-2.5" />
                    </div>
                    <span className="text-foreground">{rel.targetName}</span>
                  </div>
                  {rel.details && (
                    <span className="text-[9.5px] text-muted-foreground pl-1.5 border-l-2 border-border/30 break-keep">
                      {rel.details}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 연관 등장 회차 */}
        {activeNode.data.relatedChapters && activeNode.data.relatedChapters.length > 0 && (
          <div className="flex flex-col gap-2.5 pt-1">
            <div className="flex items-center gap-1.5 border-b border-border/20 pb-1">
              <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("canvas.graph.details.chapters", "연관 등장 챕터")}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {activeNode.data.relatedChapters.map((chapter, index) => (
                <span 
                  key={index}
                  className="text-[9.5px] font-bold text-foreground bg-muted/40 border border-border/30 px-2.5 py-1 rounded-full hover:bg-muted/75 cursor-default transition-all"
                >
                  {chapter}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 소설 원문 명대사 스크랩 */}
        {activeNode.data.sourceTexts && activeNode.data.sourceTexts.length > 0 && (
          <div className="flex flex-col gap-2.5 border-t border-border/20 pt-4 mt-1">
            <div className="flex items-center gap-1.5">
              <Quote className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("canvas.graph.details.quotes", "본문 묘사 및 인용")}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {activeNode.data.sourceTexts.map((text, index) => (
                <div 
                  key={index}
                  className="relative p-4 rounded-lg border border-amber-900/10 bg-amber-950/5 dark:bg-amber-950/10 text-fg/90 shadow-sm flex flex-col gap-1 overflow-hidden"
                >
                  <div className="absolute top-0 left-0 bottom-0 w-1 bg-amber-600/35" />
                  <p className="text-[10.5px] leading-relaxed italic font-medium break-keep pl-2 select-text">
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
