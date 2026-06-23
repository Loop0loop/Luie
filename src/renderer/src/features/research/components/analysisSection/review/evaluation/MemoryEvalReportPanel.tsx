import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  Play,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type {
  AnalysisEpisodeCalibrationReport,
  AnalysisIntentCalibrationReport,
  AnalysisMemoryEvalReport,
} from "../../shared/types";

type MemoryEvalReportPanelProps = {
  visible: boolean;
  loading: boolean;
  error: string | null;
  report: AnalysisMemoryEvalReport | null;
  intentCalibrationReport: AnalysisIntentCalibrationReport | null;
  episodeCalibrationReport: AnalysisEpisodeCalibrationReport | null;
  onToggle: () => void;
  onRun: () => void;
  onRunIntentCalibration: () => void;
  onRunEpisodeCalibration: () => void;
  pendingFeedbackKey: string | null;
  onRecordAnswerWrong: (item: AnalysisMemoryEvalReport["results"][number]) => void;
  onRecordEvidenceHelpful: (
    item: AnalysisMemoryEvalReport["results"][number],
  ) => void;
};

const formatPercent = (value: number): string => `${Math.round(value * 100)}%`;

export function MemoryEvalReportPanel({
  visible,
  loading,
  error,
  report,
  intentCalibrationReport,
  episodeCalibrationReport,
  onToggle,
  onRun,
  onRunIntentCalibration,
  onRunEpisodeCalibration,
  pendingFeedbackKey,
  onRecordAnswerWrong,
  onRecordEvidenceHelpful,
}: MemoryEvalReportPanelProps) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-2 text-left text-fg"
        >
          {visible ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <BarChart3 className="h-4 w-4 text-muted" />
          <span className="font-medium">{t("analysis.review.evaluation.title")}</span>
        </button>
        <button
          type="button"
          onClick={onRun}
          disabled={loading}
          className="inline-flex h-7 w-7 items-center justify-center rounded border border-border text-muted hover:text-fg disabled:opacity-50"
          title={t("analysis.review.evaluation.runEval")}
          aria-label={t("analysis.review.evaluation.runEval")}
        >
          <Play className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onRunIntentCalibration}
          disabled={loading}
          className="inline-flex h-7 items-center justify-center rounded border border-border px-2 text-[11px] text-muted hover:text-fg disabled:opacity-50"
          title={t("analysis.review.evaluation.intentCalibration")}
          aria-label={t("analysis.review.evaluation.intentCalibration")}
        >
          LLM
        </button>
        <button
          type="button"
          onClick={onRunEpisodeCalibration}
          disabled={loading}
          className="inline-flex h-7 items-center justify-center rounded border border-border px-2 text-[11px] text-muted hover:text-fg disabled:opacity-50"
          title={t("analysis.review.evaluation.episodeCalibration")}
          aria-label={t("analysis.review.evaluation.episodeCalibration")}
        >
          EP
        </button>
      </div>
      {visible && (
        <div className="mt-2 space-y-2">
          {loading ? (
            <div className="text-muted">{t("analysis.review.evaluation.loading")}</div>
          ) : error ? (
            <div className="text-danger">{error}</div>
          ) : report ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <div className="text-muted">cases</div>
                  <div className="text-fg">{report.caseCount}</div>
                </div>
                <div>
                  <div className="text-muted">recall</div>
                  <div className="text-fg">{formatPercent(report.averageContextRecallAtK)}</div>
                </div>
                <div>
                  <div className="text-muted">P0</div>
                  <div className="text-fg">{report.totalP0FailureCount}</div>
                </div>
              </div>
              <div className="max-h-28 overflow-auto rounded border border-border/70">
                {report.results.map((item) => (
                  <div key={item.caseId} className="border-b border-border/60 px-2 py-1 last:border-b-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{item.caseId}</span>
                      <div className="flex shrink-0 items-center gap-1">
                        <span>{formatPercent(item.contextRecallAtK)}</span>
                        <button
                          type="button"
                          onClick={() => onRecordAnswerWrong(item)}
                          disabled={pendingFeedbackKey !== null}
                          className="inline-flex h-6 w-6 items-center justify-center rounded border border-border text-muted hover:text-danger disabled:opacity-50"
                          title={t("analysis.review.evaluation.answerWrong")}
                          aria-label={t("analysis.review.evaluation.answerWrong")}
                        >
                          <ThumbsDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRecordEvidenceHelpful(item)}
                          disabled={pendingFeedbackKey !== null}
                          className="inline-flex h-6 w-6 items-center justify-center rounded border border-border text-muted hover:text-fg disabled:opacity-50"
                          title={t("analysis.review.evaluation.evidenceHelpful")}
                          aria-label={t("analysis.review.evaluation.evidenceHelpful")}
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    {item.p0Failures.length > 0 && (
                      <div className="mt-1 text-danger">{item.p0Failures.join(", ")}</div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-muted">{t("analysis.review.evaluation.empty")}</div>
          )}
          {intentCalibrationReport && (
            <div className="rounded border border-border/70 px-2 py-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">LLM intent calibration</span>
                <span>
                  {intentCalibrationReport.passCount}/{intentCalibrationReport.caseCount}
                </span>
              </div>
              {intentCalibrationReport.failures.length > 0 && (
                <div className="mt-1 max-h-20 overflow-auto text-danger">
                  {intentCalibrationReport.failures.map((failure) => (
                    <div key={`${failure.caseId}-${failure.reason}`}>
                      {failure.caseId}: {failure.reason}
                      {failure.detail ? ` (${failure.detail})` : ""}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {episodeCalibrationReport && (
            <div className="rounded border border-border/70 px-2 py-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">LLM episode calibration</span>
                <span>
                  {episodeCalibrationReport.passCount}/{episodeCalibrationReport.caseCount}
                </span>
              </div>
              {episodeCalibrationReport.failures.length > 0 && (
                <div className="mt-1 max-h-20 overflow-auto text-danger">
                  {episodeCalibrationReport.failures.map((failure) => (
                    <div key={`${failure.caseId}-${failure.reason}`}>
                      {failure.caseId}: {failure.reason}
                      {failure.detail ? ` (${failure.detail})` : ""}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
