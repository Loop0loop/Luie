import { CheckCircle, ChevronDown, ChevronRight, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AnalysisEntityReviewItem } from "../../shared/types";

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

const mentionRange = (item: AnalysisEntityReviewItem, t: any): string => {
  if (item.firstMentionChapterOrder === null || item.lastMentionChapterOrder === null) {
    return t("analysis.review.queue.entity.mentionRangeNone");
  }
  if (item.firstMentionChapterOrder === item.lastMentionChapterOrder) {
    return t("analysis.review.queue.entity.mentionRangeSingle", {
      count: item.mentionCount,
      chapter: item.firstMentionChapterOrder,
    });
  }
  return t("analysis.review.queue.entity.mentionRangeRange", {
    count: item.mentionCount,
    start: item.firstMentionChapterOrder,
    end: item.lastMentionChapterOrder,
  });
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
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 text-left text-fg"
      >
        <span className="font-medium">{t("analysis.review.queue.entity.title")}</span>
        {visible ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {visible && (
        <div className="mt-2 space-y-2">
          {loading ? (
            <div className="text-muted">{t("analysis.review.queue.entity.loading")}</div>
          ) : error ? (
            <div className="text-danger">⚠️ {error}</div>
          ) : items.length === 0 ? (
            <div className="text-muted">{t("analysis.review.queue.entity.empty")}</div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="rounded border border-border bg-panel/60 p-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-fg/90">{item.canonicalName}</div>
                    <div className="mt-1 text-muted">
                      {item.entityType} · confidence {item.confidence} · {mentionRange(item, t)}
                    </div>
                  </div>
                  <div className="shrink-0 flex gap-1">
                    <button
                      type="button"
                      onClick={() => onConfirm(item)}
                      disabled={mutatingEntityId === item.id}
                      className="inline-flex h-7 w-7 items-center justify-center rounded border border-border text-muted hover:text-success disabled:opacity-50"
                      title={t("analysis.review.queue.entity.confirm")}
                      aria-label={`${item.canonicalName} ${t("analysis.review.queue.entity.confirm")}`}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onReject(item)}
                      disabled={mutatingEntityId === item.id}
                      className="inline-flex h-7 w-7 items-center justify-center rounded border border-border text-muted hover:text-danger disabled:opacity-50"
                      title={t("analysis.review.queue.entity.reject")}
                      aria-label={`${item.canonicalName} ${t("analysis.review.queue.entity.reject")}`}
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
