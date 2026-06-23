import { i18n } from "@renderer/i18n";
import { useCallback, useState } from "react";
import { api } from "@shared/api";
import { useToast } from "@shared/ui/ToastContext";
import type {
  AnalysisEpisodeCalibrationReport,
  AnalysisIntentCalibrationReport,
  AnalysisMemoryEvalReport,
} from "../../shared/types";
import type {
  MemoryEvalFeedbackKind,
  MemoryEvalScoreResult,
} from "@shared/types";

type UseMemoryEvalPanelInput = {
  projectId?: string;
};

export function useMemoryEvalPanel({ projectId }: UseMemoryEvalPanelInput) {
  const [showMemoryEvalReport, setShowMemoryEvalReport] = useState(false);
  const [memoryEvalReport, setMemoryEvalReport] =
    useState<AnalysisMemoryEvalReport | null>(null);
  const [intentCalibrationReport, setIntentCalibrationReport] =
    useState<AnalysisIntentCalibrationReport | null>(null);
  const [episodeCalibrationReport, setEpisodeCalibrationReport] =
    useState<AnalysisEpisodeCalibrationReport | null>(null);
  const [memoryEvalLoading, setMemoryEvalLoading] = useState(false);
  const [memoryEvalError, setMemoryEvalError] = useState<string | null>(null);
  const [pendingFeedbackKey, setPendingFeedbackKey] = useState<string | null>(
    null,
  );
  const { showToast } = useToast();

  const handleRunMemoryEval = useCallback(async () => {
    if (!projectId) return;
    setMemoryEvalLoading(true);
    setMemoryEvalError(null);
    try {
      const response = await api.memoryAdmin.runEvalSuite({
        projectId,
        label: "analysis-panel",
        topK: 5,
      });
      if (!response.success || !response.data) {
        setMemoryEvalError(response.error?.message ?? i18n.t("analysis.review.evaluation.evalError"));
        return;
      }
      setMemoryEvalReport(response.data);
      setShowMemoryEvalReport(true);
      showToast(i18n.t("analysis.review.evaluation.evalComplete"), "info");
    } finally {
      setMemoryEvalLoading(false);
    }
  }, [projectId, showToast]);

  const handleRunIntentCalibration = useCallback(async () => {
    if (!projectId) return;
    setMemoryEvalLoading(true);
    setMemoryEvalError(null);
    try {
      const response = await api.memoryAdmin.runIntentCalibration({
        projectId,
        useLlm: true,
      });
      if (!response.success || !response.data) {
        setMemoryEvalError(
          response.error?.message ?? i18n.t("analysis.review.evaluation.intentError"),
        );
        return;
      }
      setIntentCalibrationReport(response.data);
      setShowMemoryEvalReport(true);
      showToast(i18n.t("analysis.review.evaluation.intentComplete"), "info");
    } finally {
      setMemoryEvalLoading(false);
    }
  }, [projectId, showToast]);

  const handleRunEpisodeCalibration = useCallback(async () => {
    if (!projectId) return;
    setMemoryEvalLoading(true);
    setMemoryEvalError(null);
    try {
      const response = await api.memoryAdmin.runEpisodeCalibration({
        projectId,
      });
      if (!response.success || !response.data) {
        setMemoryEvalError(
          response.error?.message ?? i18n.t("analysis.review.evaluation.episodeError"),
        );
        return;
      }
      setEpisodeCalibrationReport(response.data);
      setShowMemoryEvalReport(true);
      showToast(i18n.t("analysis.review.evaluation.episodeComplete"), "info");
    } finally {
      setMemoryEvalLoading(false);
    }
  }, [projectId, showToast]);

  const recordFeedback = useCallback(
    async (item: MemoryEvalScoreResult, feedbackKind: MemoryEvalFeedbackKind) => {
      if (!projectId) return;
      const feedbackKey = `${feedbackKind}:${item.caseId}`;
      setPendingFeedbackKey(feedbackKey);
      setMemoryEvalError(null);
      try {
        const response = await api.memoryAdmin.recordEvalFeedback({
          projectId,
          runId: memoryEvalReport?.runId,
          caseId: item.caseId,
          feedbackKind,
          question: item.question,
          answer: item.answer,
          evidence: item.retrievedEvidence,
          createEvalCaseCandidate: feedbackKind === "answer_wrong",
        });
        if (!response.success) {
          setMemoryEvalError(
            response.error?.message ??
              i18n.t("analysis.review.evaluation.feedbackError"),
          );
          return;
        }
        showToast(
          i18n.t("analysis.review.evaluation.feedbackRecorded"),
          "info",
        );
      } finally {
        setPendingFeedbackKey(null);
      }
    },
    [memoryEvalReport?.runId, projectId, showToast],
  );

  const handleRecordAnswerWrong = useCallback(
    (item: MemoryEvalScoreResult) => recordFeedback(item, "answer_wrong"),
    [recordFeedback],
  );

  const handleRecordEvidenceHelpful = useCallback(
    (item: MemoryEvalScoreResult) => recordFeedback(item, "evidence_helpful"),
    [recordFeedback],
  );

  return {
    showMemoryEvalReport,
    setShowMemoryEvalReport,
    memoryEvalReport,
    intentCalibrationReport,
    episodeCalibrationReport,
    memoryEvalLoading,
    memoryEvalError,
    pendingFeedbackKey,
    handleRunMemoryEval,
    handleRunIntentCalibration,
    handleRunEpisodeCalibration,
    handleRecordAnswerWrong,
    handleRecordEvidenceHelpful,
  };
}
