import { ChevronDown, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import type {
  AnalysisConflictItem,
  ConflictReviewFilter,
} from "../../shared/types";

type ConflictQueuePanelProps = {
  visible: boolean;
  loading: boolean;
  error: string | null;
  items: AnalysisConflictItem[];
  reviewFilter: ConflictReviewFilter;
  onChangeReviewFilter: (filter: ConflictReviewFilter) => void;
  onToggle: () => void;
  renderFact: (fact: AnalysisConflictItem["invalidatedFact"]) => string;
  resolvingConflictId: string | null;
  onResolve: (item: AnalysisConflictItem, winnerFactId: string) => void;
  onDefer: (item: AnalysisConflictItem) => void;
};

function renderEvidenceQuotes(
  title: string,
  quotes: AnalysisConflictItem["invalidatedFact"]["evidenceQuotes"],
  t: (key: string, options?: Record<string, string>) => string,
) {
  if (quotes.length === 0) return null;

  return (
    <div className="mt-1 space-y-1">
      <div className="text-[11px] font-medium text-muted">{t("analysis.review.queue.conflict.evidenceQuote", { title })}</div>
      {quotes.map((quote) => (
        <blockquote
          key={quote}
          className="border-l-2 border-border pl-2 text-[11px] leading-relaxed text-muted"
        >
          {quote}
        </blockquote>
      ))}
    </div>
  );
}

export function ConflictQueuePanel({
  visible,
  loading,
  error,
  items,
  reviewFilter,
  onChangeReviewFilter,
  onToggle,
  renderFact,
  resolvingConflictId,
  onResolve,
  onDefer,
}: ConflictQueuePanelProps) {
  const { t } = useTranslation();
  return (
    <div className="rounded-panel border border-border/40 bg-surface/40 dark:bg-surface/20 backdrop-blur-md px-3.5 py-2.5 text-xs shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 text-left text-fg"
      >
        <span className="font-medium">{t("analysis.review.queue.conflict.title")}</span>
        {visible ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {visible && (
        <div className="mt-2 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {(["active", "deferred"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => onChangeReviewFilter(filter)}
                className={`rounded-full border px-3 py-1 text-[11px] transition-[colors,transform] duration-150 active:scale-95 ${
                  reviewFilter === filter
                    ? "border-accent/60 bg-accent/10 text-fg"
                    : "border-border/40 text-muted hover:text-fg hover:bg-surface-hover"
                }`}
              >
                {t(`analysis.review.queue.conflict.filter.${filter}`)}
              </button>
            ))}
          </div>
          {loading ? (
            <div className="text-muted">{t("analysis.review.queue.conflict.loading")}</div>
          ) : error ? (
            <div role="alert" className="text-danger">⚠️ {error}</div>
          ) : items.length === 0 ? (
            <div className="text-muted">{t("analysis.review.queue.conflict.empty")}</div>
          ) : (
            items.map((item) => (
              <div
                key={item.conflictId}
                className="rounded-control border border-border/40 bg-element/40 p-2.5 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-1.5 font-medium text-fg/90">
                  <span>[{item.reason}]</span>
                  <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted">
                    {t(`analysis.review.queue.conflict.status.${item.reviewStatus}`)}
                  </span>
                </div>
                <div className="text-muted">
                  {t("analysis.review.queue.conflict.invalidated", { fact: renderFact(item.invalidatedFact) })}
                </div>
                {renderEvidenceQuotes(t("analysis.review.queue.conflict.priorEvidence"), item.invalidatedFact.evidenceQuotes, t)}
                <div className="text-muted">
                  {t("analysis.review.queue.conflict.invalidating", { fact: renderFact(item.invalidatingFact) })}
                </div>
                {renderEvidenceQuotes(t("analysis.review.queue.conflict.newEvidence"), item.invalidatingFact.evidenceQuotes, t)}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => onResolve(item, item.invalidatedFact.id)}
                    disabled={resolvingConflictId === item.conflictId}
                    className="rounded-control border border-border/40 px-2.5 py-1 text-[11px] text-muted hover:text-success hover:bg-success/5 active:scale-95 transition-[colors,transform] duration-150 disabled:opacity-50"
                  >
                    {t("analysis.review.queue.conflict.acceptPrior")}
                  </button>
                  <button
                    type="button"
                    onClick={() => onResolve(item, item.invalidatingFact.id)}
                    disabled={resolvingConflictId === item.conflictId}
                    className="rounded-control border border-border/40 px-2.5 py-1 text-[11px] text-muted hover:text-success hover:bg-success/5 active:scale-95 transition-[colors,transform] duration-150 disabled:opacity-50"
                  >
                    {t("analysis.review.queue.conflict.acceptNew")}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDefer(item)}
                    disabled={
                      resolvingConflictId === item.conflictId ||
                      item.reviewStatus === "deferred"
                    }
                    className="rounded-control border border-border/40 px-2.5 py-1 text-[11px] text-muted hover:text-fg hover:bg-surface-hover active:scale-95 transition-[colors,transform] duration-150 disabled:opacity-50"
                  >
                    {t("analysis.review.queue.conflict.defer")}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
