import { X, Pin, Database, FileText, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useGraphStore } from "../../stores/graph/graphStore";
import { MOCK_GRAPH_NODES } from "../../constants/graphMockData";
import { cn } from "@shared/types/utils";
import type { GraphRelationship } from "../../types/graph";
import { useToast } from "@shared/ui/ToastContext";

export default function GraphInspector() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { focusId, setFocusId } = useGraphStore();

  // focusId를 기반으로 노드 데이터 조회
  const selectedNode = MOCK_GRAPH_NODES.find((node) => node.id === focusId);
  const data = selectedNode?.data;

  // 노드 타입별 한글 레이블 매핑
  const typeLabels: Record<string, string> = {
    character: "인물",
    event: "사건",
    "world-entity": "세계관 설정",
    faction: "세력",
    chapter: "회차",
  };

  const typeColorClasses: Record<string, string> = {
    character: "bg-accent/15 text-accent border border-accent/25",
    event: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
    "world-entity": "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    faction: "bg-sky-500/10 text-sky-400 border border-sky-500/20",
    chapter: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  };

  const handleAction = (actionName: string) => {
    showToast(
      t("canvas.status.demoNotImplemented", { actionName }),
      "info"
    );
  };

  return (
    <div className="w-72 h-full flex flex-col border-l border-border/30 bg-sidebar/95 backdrop-blur-md text-fg select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/30 px-4 py-3 bg-sidebar/50">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/90">
          {t("canvas.graph.inspector")}
        </h3>
        {focusId && (
          <button
            type="button"
            onClick={() => setFocusId(null)}
            className="rounded p-1 text-muted-foreground/70 transition-colors hover:bg-active hover:text-fg"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar p-4 flex flex-col gap-5">
        {!focusId || !data ? (
          // Empty State
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-12">
            <div className="h-10 w-10 rounded-full bg-active/40 flex items-center justify-center mb-3 text-muted-foreground/50 border border-border/20">
              <Info className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-medium text-fg mb-1">
              {t("canvas.graph.emptyTitle")}
            </h4>
            <p className="text-[11px] text-muted-foreground/75 leading-relaxed max-w-[180px]">
              {t("canvas.graph.emptyDescription")}
            </p>
          </div>
        ) : (
          // Focused Entity State
          <>
            {/* Entity Basic Details */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70">
                  {t("canvas.graph.selectedEntity")}
                </span>
                <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded", typeColorClasses[data.type] || "bg-active text-muted")}>
                  {typeLabels[data.type] || data.type}
                </span>
              </div>
              <h2 className="text-base font-semibold tracking-tight text-fg border-b border-border/20 pb-2">
                {data.label}
              </h2>
              {data.description && (
                <p className="text-xs text-muted-foreground/90 leading-relaxed bg-active/20 p-2.5 rounded border border-border/10">
                  {data.description}
                </p>
              )}
            </div>

            {/* Relations */}
            {data.relationships && data.relationships.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70">
                  {t("canvas.graph.relations")}
                </span>
                <ul className="flex flex-col gap-1.5">
                  {data.relationships.map((rel: GraphRelationship, idx: number) => (
                    <li
                      key={idx}
                      className="flex flex-col gap-1 rounded border border-border/15 bg-active/25 p-2 transition-all hover:bg-active/40"
                    >
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-fg">{rel.targetName}</span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-sidebar border border-border/30 rounded text-muted-foreground">
                          {rel.type}
                        </span>
                      </div>
                      {rel.details && (
                        <span className="text-[10px] text-muted-foreground/80 leading-normal">
                          {rel.details}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Context Source Texts */}
            {data.sourceTexts && data.sourceTexts.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70">
                  {t("canvas.graph.sourceText")}
                </span>
                <div className="flex flex-col gap-2">
                  {data.sourceTexts.map((text: string, idx: number) => (
                    <div
                      key={idx}
                      className="text-[11px] italic text-muted-foreground/85 leading-relaxed bg-sidebar border border-border/20 p-2.5 rounded relative group"
                    >
                      <span className="block mb-1.5">"{text}"</span>
                      <button
                        type="button"
                        onClick={() => handleAction("원고 문맥으로 이동")}
                        className="text-[9px] font-semibold text-accent flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <FileText className="h-3 w-3" />
                        {t("canvas.graph.goToSource")}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions Footer */}
            <div className="flex flex-col gap-2 mt-auto pt-4 border-t border-border/20">
              <button
                type="button"
                onClick={() => handleAction("Canvas에 고정")}
                className="flex w-full items-center justify-center gap-2 rounded border border-border/50 bg-sidebar px-3 py-2 text-xs font-medium text-fg transition-all hover:bg-active"
              >
                <Pin className="h-3.5 w-3.5" />
                {t("canvas.graph.pinToCanvas")}
              </button>
              <button
                type="button"
                onClick={() => handleAction("Memory로 저장")}
                className="flex w-full items-center justify-center gap-2 rounded bg-accent px-3 py-2 text-xs font-medium text-on-accent transition-all hover:bg-accent/90"
              >
                <Database className="h-3.5 w-3.5" />
                {t("canvas.graph.saveToMemory")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
