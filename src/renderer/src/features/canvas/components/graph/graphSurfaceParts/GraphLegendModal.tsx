import type { TFunction } from "i18next";
import { HelpCircle, X } from "lucide-react";

interface GraphLegendModalProps {
  isOpen: boolean;
  onClose: () => void;
  t: TFunction;
}

export function GraphLegendModal({
  isOpen,
  onClose,
  t,
}: GraphLegendModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-panel border border-border/40 w-[400px] rounded-2xl shadow-2xl p-5 flex flex-col gap-4 text-fg relative animate-in zoom-in-95 duration-200 select-none">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4.5 right-4.5 h-6 w-6 rounded-lg hover:bg-muted flex items-center justify-center text-muted hover:text-fg transition-all cursor-pointer border-none bg-transparent"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col gap-0.5 pointer-events-none">
          <h2 className="text-[14px] font-black tracking-tight text-fg uppercase flex items-center gap-2">
            <HelpCircle className="h-4.5 w-4.5 text-accent" />
            {t("canvas.graph.legend.title", "그래프 범례")}
          </h2>
          <p className="text-[9px] text-muted font-semibold uppercase tracking-wider">
            Graph Legend Map
          </p>
        </div>

        <div className="flex flex-col gap-4 mt-1 border-t border-border/20 pt-3">
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted">
              {t("canvas.graph.legend.nodes", "노드 (개체)")}
            </span>
            <div className="grid grid-cols-1 gap-2 pl-0.5">
              <div className="flex items-center gap-2.5 text-[11px] text-fg font-semibold bg-surface/40 p-2 rounded-lg border border-border/10">
                <span className="h-3.5 w-3.5 rounded-full bg-fg border border-border/50 shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
                <span>{t("canvas.graph.legend.node.prime", "핵심 주연 캐릭터")}</span>
              </div>
              <div className="flex items-center gap-2.5 text-[11px] text-fg font-semibold bg-surface/40 p-2 rounded-lg border border-border/10">
                <span className="h-2.5 w-2.5 rounded-full bg-muted/80 border border-border/50" />
                <span>{t("canvas.graph.legend.node.major", "조연 / 연관 세력")}</span>
              </div>
              <div className="flex items-center gap-2.5 text-[11px] text-fg font-semibold bg-surface/40 p-2 rounded-lg border border-border/10">
                <span className="h-2.5 w-2.5 rounded-sm bg-muted/60 border border-border/50" />
                <span>{t("canvas.graph.legend.node.chapter", "집필 회차 (챕터)")}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-border/20 pt-3">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted">
              {t("canvas.graph.legend.edges", "에지 (관계)")}
            </span>
            <div className="grid grid-cols-1 gap-2 pl-0.5">
              <div className="flex items-center gap-2.5 text-[11px] text-fg font-semibold bg-surface/40 p-2 rounded-lg border border-border/10">
                <span className="w-6 border-b border-dashed border-indigo-400" />
                <span>{t("canvas.graph.legend.edge.character", "성간 인물 관계선")}</span>
              </div>
              <div className="flex items-center gap-2.5 text-[11px] text-fg font-semibold bg-surface/40 p-2 rounded-lg border border-border/10">
                <span className="w-6 border-b-2 border-red-400" />
                <span>{t("canvas.graph.legend.edge.event", "인과 관계 수사선 (붉은 실)")}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 mt-1 border-t border-border/20 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="text-[10.5px] font-bold tracking-tight text-on-accent bg-accent hover:bg-accent/90 px-4 py-2 rounded-lg cursor-pointer transition-all border-none"
          >
            {t("canvas.graph.guide.close", "확인")}
          </button>
        </div>
      </div>
    </div>
  );
}
