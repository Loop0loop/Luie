import { ChevronDown, ChevronRight } from "lucide-react";
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
) {
  if (quotes.length === 0) return null;

  return (
    <div className="mt-1 space-y-1">
      <div className="text-[11px] font-medium text-muted">{title} 근거</div>
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
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 text-left text-fg"
      >
        <span className="font-medium">충돌 큐</span>
        {visible ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {visible && (
        <div className="mt-2 space-y-2">
          {loading ? (
            <div className="text-muted">조회 중...</div>
          ) : error ? (
            <div className="text-danger">⚠️ {error}</div>
          ) : items.length === 0 ? (
            <div className="text-muted">현재 기준에서 충돌 후보가 없습니다.</div>
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
                  무효화: {renderFact(item.invalidatedFact)}
                </div>
                {renderEvidenceQuotes("이전 사실", item.invalidatedFact.evidenceQuotes)}
                <div className="text-muted">
                  무효화한 사실: {renderFact(item.invalidatingFact)}
                </div>
                {renderEvidenceQuotes("신규 사실", item.invalidatingFact.evidenceQuotes)}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => onResolve(item, item.invalidatedFact.id)}
                    disabled={resolvingConflictId === item.conflictId}
                    className="rounded border border-border px-2 py-1 text-[11px] text-muted hover:text-success disabled:opacity-50"
                  >
                    이전 사실 채택
                  </button>
                  <button
                    type="button"
                    onClick={() => onResolve(item, item.invalidatingFact.id)}
                    disabled={resolvingConflictId === item.conflictId}
                    className="rounded border border-border px-2 py-1 text-[11px] text-muted hover:text-success disabled:opacity-50"
                  >
                    신규 사실 채택
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
