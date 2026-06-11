import { CheckCircle, ChevronDown, ChevronRight, XCircle } from "lucide-react";
import type { AnalysisFactReviewItem } from "../../shared/types";

type FactReviewPanelProps = {
  visible: boolean;
  loading: boolean;
  error: string | null;
  items: AnalysisFactReviewItem[];
  mutatingFactId: string | null;
  onToggle: () => void;
  onConfirm: (item: AnalysisFactReviewItem) => void;
  onReject: (item: AnalysisFactReviewItem) => void;
};

const formatFact = (item: AnalysisFactReviewItem): string => {
  const subject = item.subjectEntityName ?? item.subjectEntityId;
  const object = item.objectEntityName ?? item.objectValue ?? item.objectEntityId ?? "";
  return `${subject} -> ${item.predicate}${object ? ` -> ${object}` : ""}`;
};

export function FactReviewPanel({
  visible,
  loading,
  error,
  items,
  mutatingFactId,
  onToggle,
  onConfirm,
  onReject,
}: FactReviewPanelProps) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 text-left text-fg"
      >
        <span className="font-medium">검토할 사실</span>
        {visible ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {visible && (
        <div className="mt-2 space-y-2">
          {loading ? (
            <div className="text-muted">조회 중...</div>
          ) : error ? (
            <div className="text-danger">⚠️ {error}</div>
          ) : items.length === 0 ? (
            <div className="text-muted">검토할 suggested 사실이 없습니다.</div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="rounded border border-border bg-panel/60 p-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-fg/90">{formatFact(item)}</div>
                    <div className="mt-1 text-muted">
                      {item.validFromChapterOrder}화부터 관찰 {item.observedAtChapterOrder}화
                    </div>
                  </div>
                  <div className="shrink-0 flex gap-1">
                    <button
                      type="button"
                      onClick={() => onConfirm(item)}
                      disabled={mutatingFactId === item.id}
                      className="inline-flex h-7 w-7 items-center justify-center rounded border border-border text-muted hover:text-success disabled:opacity-50"
                      title="canonical memory로 승인"
                      aria-label={`${formatFact(item)} canonical memory로 승인`}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onReject(item)}
                      disabled={mutatingFactId === item.id}
                      className="inline-flex h-7 w-7 items-center justify-center rounded border border-border text-muted hover:text-danger disabled:opacity-50"
                      title="거절"
                      aria-label={`${formatFact(item)} 거절`}
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
                  <span>{item.valueType}</span>
                  <span>근거 {item.evidenceCount}</span>
                  <span>신뢰도 {item.confidence}%</span>
                  <span>{item.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
