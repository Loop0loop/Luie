import { CheckCircle, ChevronDown, ChevronRight, XCircle } from "lucide-react";
import type { AnalysisEntityReviewItem } from "./types";

type EntityReviewPanelProps = {
  visible: boolean;
  loading: boolean;
  error: string | null;
  items: AnalysisEntityReviewItem[];
  mutatingEntityId: string | null;
  onToggle: () => void;
  onConfirm: (item: AnalysisEntityReviewItem) => void;
  onReject: (item: AnalysisEntityReviewItem) => void;
};

const mentionRange = (item: AnalysisEntityReviewItem): string => {
  if (item.firstMentionChapterOrder === null || item.lastMentionChapterOrder === null) {
    return "mentions 0";
  }
  if (item.firstMentionChapterOrder === item.lastMentionChapterOrder) {
    return `mentions ${item.mentionCount} · ${item.firstMentionChapterOrder}화`;
  }
  return `mentions ${item.mentionCount} · ${item.firstMentionChapterOrder}-${item.lastMentionChapterOrder}화`;
};

export function EntityReviewPanel({
  visible,
  loading,
  error,
  items,
  mutatingEntityId,
  onToggle,
  onConfirm,
  onReject,
}: EntityReviewPanelProps) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 text-left text-fg"
      >
        <span className="font-medium">검토할 엔티티</span>
        {visible ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {visible && (
        <div className="mt-2 space-y-2">
          {loading ? (
            <div className="text-muted">조회 중...</div>
          ) : error ? (
            <div className="text-danger">⚠️ {error}</div>
          ) : items.length === 0 ? (
            <div className="text-muted">검토할 suggested 엔티티가 없습니다.</div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="rounded border border-border bg-panel/60 p-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-fg/90">{item.canonicalName}</div>
                    <div className="mt-1 text-muted">
                      {item.entityType} · confidence {item.confidence} · {mentionRange(item)}
                    </div>
                  </div>
                  <div className="shrink-0 flex gap-1">
                    <button
                      type="button"
                      onClick={() => onConfirm(item)}
                      disabled={mutatingEntityId === item.id}
                      className="inline-flex h-7 w-7 items-center justify-center rounded border border-border text-muted hover:text-success disabled:opacity-50"
                      title="확정"
                      aria-label={`${item.canonicalName} 확정`}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onReject(item)}
                      disabled={mutatingEntityId === item.id}
                      className="inline-flex h-7 w-7 items-center justify-center rounded border border-border text-muted hover:text-danger disabled:opacity-50"
                      title="거절"
                      aria-label={`${item.canonicalName} 거절`}
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
