/**
 * ChapterSummarySection — 챕터 AI 요약 섹션
 */

import type { TFunction } from "i18next";
import { Sparkles, RefreshCw } from "lucide-react";
import { cn } from "@shared/types/utils";

interface ChapterSummarySectionProps {
  loading: boolean;
  summary: string | null;
  generating: boolean;
  onGenerate: () => void;
  t: TFunction;
}

export function ChapterSummarySection({
  loading,
  summary,
  generating,
  onGenerate,
  t,
}: ChapterSummarySectionProps) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-1.5">
        <Sparkles className="h-4 w-4 text-muted" />
        <h4 className="text-xs font-semibold text-fg/80">
          {t("canvas.graph.episode")}
        </h4>
      </div>
      {loading ? (
        <p className="text-xs text-muted italic">
          {t("canvas.status.loading")}
        </p>
      ) : summary ? (
        <div className="space-y-1 text-xs leading-relaxed text-fg/70">
          {summary.split("\n").map((line, idx) => (
            <p key={`${line}-${idx}`} className="flex gap-1.5">
              <span className="shrink-0 text-accent/60">•</span>
              <span>{line}</span>
            </p>
          ))}
        </div>
      ) : (
        <div className="py-2 text-center">
          <p className="mb-2 text-xs text-muted">
            {t("canvas.status.empty")}
          </p>
          <button
            type="button"
            disabled={generating}
            onClick={onGenerate}
            className="inline-flex items-center gap-1.5 rounded bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-fg hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3 w-3", generating && "animate-spin")} />
            <span>
              {generating ? t("canvas.status.loading") : t("canvas.graph.aiSync")}
            </span>
          </button>
        </div>
      )}
    </section>
  );
}
