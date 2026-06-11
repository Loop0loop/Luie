import {
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock3,
  Wrench,
  XCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type {
  AnalysisStaleEvidenceReviewAction,
  AnalysisStaleEvidenceReviewItem,
} from "../../shared/types";

type StaleEvidenceReviewPanelProps = {
  visible: boolean;
  loading: boolean;
  error: string | null;
  items: AnalysisStaleEvidenceReviewItem[];
  mutatingStaleEvidenceId: string | null;
  repairing: boolean;
  onToggle: () => void;
  onAction: (
    item: AnalysisStaleEvidenceReviewItem,
    action: AnalysisStaleEvidenceReviewAction,
  ) => void;
  onRepair: () => void;
};

const formatOwner = (item: AnalysisStaleEvidenceReviewItem): string =>
  `${item.ownerTitle}${item.chapterOrder !== null ? ` · ${item.chapterOrder}화` : ""}`;

export function StaleEvidenceReviewPanel({
  visible,
  loading,
  error,
  items,
  mutatingStaleEvidenceId,
  repairing,
  onToggle,
  onAction,
  onRepair,
}: StaleEvidenceReviewPanelProps) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onToggle}
          className="min-w-0 flex flex-1 items-center justify-between gap-2 text-left text-fg"
        >
          <span className="font-medium">
            {t("analysis.review.queue.staleEvidence.title")}
          </span>
          {visible ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={onRepair}
          disabled={repairing}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border border-border text-muted hover:text-accent disabled:opacity-50"
          title={t("analysis.review.queue.staleEvidence.repair")}
          aria-label={t("analysis.review.queue.staleEvidence.repair")}
        >
          <Wrench className="h-4 w-4" />
        </button>
      </div>
      {visible && (
        <div className="mt-2 space-y-2">
          {loading ? (
            <div className="text-muted">{t("analysis.review.queue.staleEvidence.loading")}</div>
          ) : error ? (
            <div className="text-danger">⚠️ {error}</div>
          ) : items.length === 0 ? (
            <div className="text-muted">{t("analysis.review.queue.staleEvidence.empty")}</div>
          ) : (
            items.map((item) => (
              <div
                key={`${item.kind}:${item.id}`}
                className="rounded border border-border bg-panel/60 p-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-fg/90">{formatOwner(item)}</div>
                    <div className="mt-1 line-clamp-2 text-muted">{item.quote}</div>
                  </div>
                  <div className="shrink-0 flex gap-1">
                    <button
                      type="button"
                      onClick={() => onAction(item, "defer")}
                      disabled={repairing || mutatingStaleEvidenceId === item.id}
                      className="inline-flex h-7 w-7 items-center justify-center rounded border border-border text-muted hover:text-warning disabled:opacity-50"
                      title={t("analysis.review.queue.staleEvidence.defer")}
                      aria-label={`${formatOwner(item)} ${t("analysis.review.queue.staleEvidence.defer")}`}
                    >
                      <Clock3 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onAction(item, "reject")}
                      disabled={repairing || mutatingStaleEvidenceId === item.id}
                      className="inline-flex h-7 w-7 items-center justify-center rounded border border-border text-muted hover:text-danger disabled:opacity-50"
                      title={t("analysis.review.queue.staleEvidence.reject")}
                      aria-label={`${formatOwner(item)} ${t("analysis.review.queue.staleEvidence.reject")}`}
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onAction(item, "resolve")}
                      disabled={repairing || mutatingStaleEvidenceId === item.id}
                      className="inline-flex h-7 w-7 items-center justify-center rounded border border-border text-muted hover:text-success disabled:opacity-50"
                      title={t("analysis.review.queue.staleEvidence.resolve")}
                      aria-label={`${formatOwner(item)} ${t("analysis.review.queue.staleEvidence.resolve")}`}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
                  <span>{item.kind}</span>
                  <span>{t(`analysis.review.queue.staleEvidence.reason.${item.reason}`)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
