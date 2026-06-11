import { ChevronDown, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AnalysisConflictItem } from "../../shared/types";

type ConflictQueuePanelProps = {
  visible: boolean;
  loading: boolean;
  error: string | null;
  items: AnalysisConflictItem[];
  onToggle: () => void;
  renderFact: (fact: AnalysisConflictItem["invalidatedFact"]) => string;
  resolvingConflictId: string | null;
  onResolve: (item: AnalysisConflictItem, winnerFactId: string) => void;
};

function renderEvidenceQuotes(
  title: string,
  quotes: AnalysisConflictItem["invalidatedFact"]["evidenceQuotes"],
  t: (key: string, options?: any) => string,
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
  onToggle,
  renderFact,
  resolvingConflictId,
  onResolve,
}: ConflictQueuePanelProps) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs">
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
          {loading ? (
            <div className="text-muted">{t("analysis.review.queue.conflict.loading")}</div>
          ) : error ? (
            <div className="text-danger">⚠️ {error}</div>
          ) : items.length === 0 ? (
            <div className="text-muted">{t("analysis.review.queue.conflict.empty")}</div>
          ) : (
            items.map((item) => (
              <div
                key={item.conflictId}
                className="rounded border border-border bg-panel/60 p-2"
              >
                <div className="font-medium text-fg/90">
                  [{item.reason}]
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
                    className="rounded border border-border px-2 py-1 text-[11px] text-muted hover:text-success disabled:opacity-50"
                  >
                    {t("analysis.review.queue.conflict.acceptPrior")}
                  </button>
                  <button
                    type="button"
                    onClick={() => onResolve(item, item.invalidatingFact.id)}
                    disabled={resolvingConflictId === item.conflictId}
                    className="rounded border border-border px-2 py-1 text-[11px] text-muted hover:text-success disabled:opacity-50"
                  >
                    {t("analysis.review.queue.conflict.acceptNew")}
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
