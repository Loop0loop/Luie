import { CheckCircle, ChevronDown, ChevronRight, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AnalysisEpisodeReviewItem } from "../../shared/types";

type EpisodeReviewPanelProps = {
  visible: boolean;
  loading: boolean;
  error: string | null;
  items: AnalysisEpisodeReviewItem[];
  mutatingEpisodeId: string | null;
  onToggle: () => void;
  onConfirm: (item: AnalysisEpisodeReviewItem) => void;
  onReject: (item: AnalysisEpisodeReviewItem) => void;
};

const formatConfidence = (confidence: number): string =>
  `${Math.round(confidence * 100)}%`;

export function EpisodeReviewPanel({
  visible,
  loading,
  error,
  items,
  mutatingEpisodeId,
  onToggle,
  onConfirm,
  onReject,
}: EpisodeReviewPanelProps) {
  const { t } = useTranslation();
  return (
    <div className="rounded-panel border border-border bg-surface px-3 py-2 text-xs">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 text-left text-fg"
      >
        <span className="font-medium">{t("analysis.review.queue.episode.title")}</span>
        {visible ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {visible && (
        <div className="mt-2 space-y-2">
          {loading ? (
            <div className="text-muted">{t("analysis.review.queue.episode.loading")}</div>
          ) : error ? (
            <div className="text-danger">⚠️ {error}</div>
          ) : items.length === 0 ? (
            <div className="text-muted">{t("analysis.review.queue.episode.empty")}</div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="rounded border border-border bg-panel/60 p-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-fg/90">{item.title}</div>
                    <div className="mt-1 text-muted">{item.summary}</div>
                  </div>
                  <div className="shrink-0 flex gap-1">
                    <button
                      type="button"
                      onClick={() => onConfirm(item)}
                      disabled={mutatingEpisodeId === item.id}
                      className="inline-flex h-7 w-7 items-center justify-center rounded border border-border text-muted hover:text-success disabled:opacity-50"
                      title={t("analysis.review.queue.episode.confirm")}
                      aria-label={`${item.title} ${t("analysis.review.queue.episode.confirm")}`}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onReject(item)}
                      disabled={mutatingEpisodeId === item.id}
                      className="inline-flex h-7 w-7 items-center justify-center rounded border border-border text-muted hover:text-danger disabled:opacity-50"
                      title={t("analysis.review.queue.episode.reject")}
                      aria-label={`${item.title} ${t("analysis.review.queue.episode.reject")}`}
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
                  <span>{item.episodeType}</span>
                  <span>{t("analysis.review.queue.episode.evidenceCount", { count: item.evidenceCount })}</span>
                  <span>{t("analysis.review.queue.episode.confidence", { percent: formatConfidence(item.confidence) })}</span>
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
