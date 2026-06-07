import { ChevronDown, ChevronRight } from "lucide-react";
import type { AnalysisConflictItem } from "./types";

type ConflictQueuePanelProps = {
  visible: boolean;
  loading: boolean;
  error: string | null;
  items: AnalysisConflictItem[];
  onToggle: () => void;
  renderFact: (fact: AnalysisConflictItem["invalidatedFact"]) => string;
};

export function ConflictQueuePanel({
  visible,
  loading,
  error,
  items,
  onToggle,
  renderFact,
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
                <div className="text-muted">
                  무효화한 사실: {renderFact(item.invalidatingFact)}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

