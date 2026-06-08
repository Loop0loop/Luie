import { ChevronDown, ChevronRight } from "lucide-react";
import type { AnalysisNarrativeSummaryStatus } from "./types";

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
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 text-left text-fg"
      >
        <span className="font-medium">서사 요약</span>
        {visible ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {visible && (
        <div className="mt-2 space-y-2">
          {loading ? (
            <div className="text-muted">조회 중...</div>
          ) : error ? (
            <div className="text-danger">⚠️ {error}</div>
          ) : !status || status.totalCount === 0 ? (
            <div className="text-muted">생성된 hierarchy summary가 없습니다.</div>
          ) : (
            <>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-muted">
                <span>전체 {status.totalCount}</span>
                <span>stale {status.staleCount}</span>
                {byTypeEntries.map(([type, count]) => (
                  <span key={type}>
                    {formatSummaryType(type)} {count}
                  </span>
                ))}
              </div>
              <div className="space-y-1.5">
                {summaries.map((summary) => (
                  <div
                    key={summary.id}
                    className="rounded border border-border bg-panel/60 p-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-fg/90 truncate">
                          {summary.title}
                        </div>
                        <div className="text-muted">
                          {summary.scopeType}:{summary.scopeId ?? "global"} ·{" "}
                          {formatSummaryType(summary.summaryType)}
                        </div>
                      </div>
                      <span
                        className={
                          summary.isStale
                            ? "shrink-0 text-danger"
                            : "shrink-0 text-success"
                        }
                      >
                        {summary.isStale ? "stale" : "fresh"}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
                      <span>근거 {summary.sourceCount}</span>
                      <span>신뢰도 {summary.confidence}%</span>
                      <span>{summary.status}</span>
                    </div>
                    <div className="mt-2 line-clamp-3 text-[11px] leading-5 text-fg/80">
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
