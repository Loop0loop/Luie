import { useCallback, useState } from "react";
import { api } from "@shared/api";
import { useToast } from "@shared/ui/ToastContext";
import type {
  AnalysisEpisodeCalibrationReport,
  AnalysisIntentCalibrationReport,
  AnalysisMemoryEvalReport,
} from "../../shared/types";

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
        setMemoryEvalError(response.error?.message ?? "메모리 평가 실패");
        return;
      }
      setMemoryEvalReport(response.data);
      setShowMemoryEvalReport(true);
      showToast("메모리 평가를 완료했습니다.", "info");
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
          response.error?.message ?? "LLM intent calibration 실패",
        );
        return;
      }
      setIntentCalibrationReport(response.data);
      setShowMemoryEvalReport(true);
      showToast("LLM intent calibration을 완료했습니다.", "info");
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
          response.error?.message ?? "LLM episode calibration 실패",
        );
        return;
      }
      setEpisodeCalibrationReport(response.data);
      setShowMemoryEvalReport(true);
      showToast("LLM episode calibration을 완료했습니다.", "info");
    } finally {
      setMemoryEvalLoading(false);
    }
  }, [projectId, showToast]);

  return {
    showMemoryEvalReport,
    setShowMemoryEvalReport,
    memoryEvalReport,
    intentCalibrationReport,
    episodeCalibrationReport,
    memoryEvalLoading,
    memoryEvalError,
    handleRunMemoryEval,
    handleRunIntentCalibration,
    handleRunEpisodeCalibration,
  };
}
