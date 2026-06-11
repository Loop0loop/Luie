import { ChevronDown, ChevronRight } from "lucide-react";
import type { AnalysisNarrativeSummaryStatus } from "../../shared/types";

type NarrativeSummaryStatusPanelProps = {
  visible: boolean;
  loading: boolean;
  error: string | null;
  status: AnalysisNarrativeSummaryStatus | null;
  onToggle: () => void;
};

const formatSummaryType = (type: string): string =>
  type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export function NarrativeSummaryStatusPanel({
  visible,
  loading,
  error,
  status,
  onToggle,
}: NarrativeSummaryStatusPanelProps) {
  const summaries = status?.summaries.slice(0, 8) ?? [];
  const byTypeEntries = Object.entries(status?.byType ?? {});

  return (
    <div className="rounded-xl border border-white/15 dark:border-white/5 bg-surface/30 dark:bg-surface/20 backdrop-blur-xl px-3.5 py-2.5 text-xs shadow-lg transition-all duration-300 hover:shadow-xl">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 text-left text-fg/90 hover:text-fg font-medium transition-colors group select-none"
      >
        <span className="font-semibold flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          서사 요약
        </span>
        {visible ? (
          <ChevronDown className="w-4 h-4 text-muted group-hover:text-fg transition-colors" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted group-hover:text-fg transition-colors" />
        )}
      </button>
      {visible && (
        <div className="mt-3.5 space-y-3.5 animate-[fadeIn_0.2s_ease-out]">
          {loading ? (
            <div className="text-muted/80 flex items-center gap-2 py-1">
              <span className="w-2.5 h-2.5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              조회 중...
            </div>
          ) : error ? (
            <div className="text-danger flex items-center gap-1.5 py-1">⚠️ {error}</div>
          ) : !status || status.totalCount === 0 ? (
            <div className="text-muted/80 py-1">생성된 hierarchy summary가 없습니다.</div>
          ) : (
            <>
              <div className="flex flex-wrap gap-x-2 gap-y-1.5 text-neutral-400 font-medium select-none">
                <span className="bg-neutral-800 text-neutral-300 px-2.5 py-0.5 rounded-full text-[9px]">전체 {status.totalCount}</span>
                <span className="bg-neutral-850 text-neutral-400 px-2.5 py-0.5 rounded-full text-[9px] border border-white/5">stale {status.staleCount}</span>
                {byTypeEntries.map(([type, count]) => (
                  <span key={type} className="bg-neutral-800 text-neutral-300 px-2.5 py-0.5 rounded-full text-[9px]">
                    {formatSummaryType(type)} {count}
                  </span>
                ))}
              </div>
              <div className="space-y-2">
                {summaries.map((summary) => (
                  <div
                    key={summary.id}
                    className="rounded-lg border border-white/5 bg-neutral-900/20 p-3 transition-all duration-200 hover:bg-neutral-900/30"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-fg/80 truncate text-[11px]">
                          {summary.title}
                        </div>
                        <div className="text-neutral-500 text-[9px] mt-0.5">
                          {summary.scopeType}:{summary.scopeId ?? "global"} ·{" "}
                          {formatSummaryType(summary.summaryType)}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded border ${
                          summary.isStale
                            ? "bg-neutral-850 text-neutral-400 border-neutral-700/50"
                            : "bg-neutral-800 text-neutral-300 border-neutral-700/30"
                        }`}
                      >
                        {summary.isStale ? "stale" : "fresh"}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-neutral-500 font-medium">
                      <span>근거 {summary.sourceCount}</span>
                      <span>신뢰도 {summary.confidence}%</span>
                      <span>{summary.status}</span>
                    </div>
                    <div className="mt-2 text-[10px] leading-relaxed text-fg/70 border-t border-white/5 pt-2 font-normal">
                      {summary.summary}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
