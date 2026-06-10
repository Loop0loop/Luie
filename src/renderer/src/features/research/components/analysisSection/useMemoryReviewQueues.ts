import { useEffect, useState } from "react";
import { api } from "@shared/api";
import type {
  AnalysisNarrativeSummaryStatus,
} from "./types";

type UseMemoryReviewQueuesInput = {
  projectId?: string;
  chapterId?: string;
};

export function useMemoryReviewQueues({
  projectId,
}: UseMemoryReviewQueuesInput) {
  const [showNarrativeSummaryStatus, setShowNarrativeSummaryStatus] =
    useState(false);
  const [narrativeSummaryStatus, setNarrativeSummaryStatus] =
    useState<AnalysisNarrativeSummaryStatus | null>(null);
  const [narrativeSummaryStatusLoading, setNarrativeSummaryStatusLoading] =
    useState(false);
  const [narrativeSummaryStatusError, setNarrativeSummaryStatusError] =
    useState<string | null>(null);

  useEffect(() => {
    if (!showNarrativeSummaryStatus || !projectId) return;
    let cancelled = false;
    void (async () => {
      setNarrativeSummaryStatusLoading(true);
      setNarrativeSummaryStatusError(null);
      try {
        const response = await api.memory.getNarrativeSummaryStatus(projectId);
        if (cancelled) return;
        if (!response.success || !response.data) {
          setNarrativeSummaryStatusError(
            response.error?.message ?? "서사 요약 상태 조회 실패",
          );
          setNarrativeSummaryStatus(null);
          return;
        }
        setNarrativeSummaryStatus(response.data);
      } finally {
        if (!cancelled) setNarrativeSummaryStatusLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, showNarrativeSummaryStatus]);

  return {
    showNarrativeSummaryStatus,
    setShowNarrativeSummaryStatus,
    narrativeSummaryStatus,
    narrativeSummaryStatusLoading,
    narrativeSummaryStatusError,
  };
}
