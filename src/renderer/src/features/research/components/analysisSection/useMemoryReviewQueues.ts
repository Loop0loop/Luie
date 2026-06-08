import { useEffect, useState } from "react";
import { api } from "@shared/api";
import type {
  AnalysisConflictItem,
  AnalysisEntityAliasReviewItem,
  AnalysisEntityReviewItem,
  AnalysisEpisodeReviewItem,
  AnalysisFactReviewItem,
  AnalysisNarrativeSummaryStatus,
  MemoryScope,
} from "./types";

type UseMemoryReviewQueuesInput = {
  projectId?: string;
  chapterId?: string;
  memoryScope: MemoryScope;
};

export function useMemoryReviewQueues({
  projectId,
  chapterId,
  memoryScope,
}: UseMemoryReviewQueuesInput) {
  const [showConflictQueue, setShowConflictQueue] = useState(false);
  const [conflictItems, setConflictItems] = useState<AnalysisConflictItem[]>(
    [],
  );
  const [conflictLoading, setConflictLoading] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [showEpisodeReview, setShowEpisodeReview] = useState(false);
  const [episodeReviewItems, setEpisodeReviewItems] = useState<
    AnalysisEpisodeReviewItem[]
  >([]);
  const [episodeReviewLoading, setEpisodeReviewLoading] = useState(false);
  const [episodeReviewError, setEpisodeReviewError] = useState<string | null>(
    null,
  );
  const [showFactReview, setShowFactReview] = useState(false);
  const [factReviewItems, setFactReviewItems] = useState<
    AnalysisFactReviewItem[]
  >([]);
  const [factReviewLoading, setFactReviewLoading] = useState(false);
  const [factReviewError, setFactReviewError] = useState<string | null>(null);
  const [showEntityReview, setShowEntityReview] = useState(false);
  const [entityReviewItems, setEntityReviewItems] = useState<
    AnalysisEntityReviewItem[]
  >([]);
  const [entityReviewLoading, setEntityReviewLoading] = useState(false);
  const [entityReviewError, setEntityReviewError] = useState<string | null>(
    null,
  );
  const [showEntityAliasReview, setShowEntityAliasReview] = useState(false);
  const [entityAliasReviewItems, setEntityAliasReviewItems] = useState<
    AnalysisEntityAliasReviewItem[]
  >([]);
  const [entityAliasReviewLoading, setEntityAliasReviewLoading] =
    useState(false);
  const [entityAliasReviewError, setEntityAliasReviewError] = useState<
    string | null
  >(null);
  const [showNarrativeSummaryStatus, setShowNarrativeSummaryStatus] =
    useState(false);
  const [narrativeSummaryStatus, setNarrativeSummaryStatus] =
    useState<AnalysisNarrativeSummaryStatus | null>(null);
  const [narrativeSummaryStatusLoading, setNarrativeSummaryStatusLoading] =
    useState(false);
  const [narrativeSummaryStatusError, setNarrativeSummaryStatusError] =
    useState<string | null>(null);

  useEffect(() => {
    if (!showConflictQueue || !projectId) return;
    let cancelled = false;
    void (async () => {
      setConflictLoading(true);
      setConflictError(null);
      try {
        const response = await api.memory.getConflictQueue({
          projectId,
          chapterId,
          includePriorMemory: memoryScope === "with-prior",
          limit: 20,
        });
        if (cancelled) return;
        if (!response.success || !response.data) {
          setConflictError(response.error?.message ?? "충돌 큐 조회 실패");
          setConflictItems([]);
          return;
        }
        setConflictItems(response.data.items);
      } finally {
        if (!cancelled) setConflictLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chapterId, projectId, memoryScope, showConflictQueue]);

  useEffect(() => {
    if (!showEpisodeReview || !projectId) return;
    let cancelled = false;
    void (async () => {
      setEpisodeReviewLoading(true);
      setEpisodeReviewError(null);
      try {
        const response = await api.memory.getEpisodeReviewQueue({
          projectId,
          limit: 20,
        });
        if (cancelled) return;
        if (!response.success || !response.data) {
          setEpisodeReviewError(
            response.error?.message ?? "에피소드 검토 큐 조회 실패",
          );
          setEpisodeReviewItems([]);
          return;
        }
        setEpisodeReviewItems(response.data.items);
      } finally {
        if (!cancelled) setEpisodeReviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, showEpisodeReview]);

  useEffect(() => {
    if (!showFactReview || !projectId) return;
    let cancelled = false;
    void (async () => {
      setFactReviewLoading(true);
      setFactReviewError(null);
      try {
        const response = await api.memory.getFactReviewQueue({
          projectId,
          limit: 20,
        });
        if (cancelled) return;
        if (!response.success || !response.data) {
          setFactReviewError(
            response.error?.message ?? "사실 검토 큐 조회 실패",
          );
          setFactReviewItems([]);
          return;
        }
        setFactReviewItems(response.data.items);
      } finally {
        if (!cancelled) setFactReviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, showFactReview]);

  useEffect(() => {
    if (!showEntityAliasReview || !projectId) return;
    let cancelled = false;
    void (async () => {
      setEntityAliasReviewLoading(true);
      setEntityAliasReviewError(null);
      try {
        const response = await api.memory.getEntityAliasReviewQueue({
          projectId,
          limit: 20,
        });
        if (cancelled) return;
        if (!response.success || !response.data) {
          setEntityAliasReviewError(
            response.error?.message ?? "별칭 검토 큐 조회 실패",
          );
          setEntityAliasReviewItems([]);
          return;
        }
        setEntityAliasReviewItems(response.data.items);
      } finally {
        if (!cancelled) setEntityAliasReviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, showEntityAliasReview]);

  useEffect(() => {
    if (!showEntityReview || !projectId) return;
    let cancelled = false;
    void (async () => {
      setEntityReviewLoading(true);
      setEntityReviewError(null);
      try {
        const response = await api.memory.getEntityReviewQueue({
          projectId,
          limit: 20,
        });
        if (cancelled) return;
        if (!response.success || !response.data) {
          setEntityReviewError(
            response.error?.message ?? "엔티티 검토 큐 조회 실패",
          );
          setEntityReviewItems([]);
          return;
        }
        setEntityReviewItems(response.data.items);
      } finally {
        if (!cancelled) setEntityReviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, showEntityReview]);

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
    showConflictQueue,
    setShowConflictQueue,
    conflictItems,
    setConflictItems,
    conflictLoading,
    conflictError,
    showEpisodeReview,
    setShowEpisodeReview,
    episodeReviewItems,
    setEpisodeReviewItems,
    episodeReviewLoading,
    episodeReviewError,
    showFactReview,
    setShowFactReview,
    factReviewItems,
    setFactReviewItems,
    factReviewLoading,
    factReviewError,
    showEntityReview,
    setShowEntityReview,
    entityReviewItems,
    setEntityReviewItems,
    entityReviewLoading,
    entityReviewError,
    showEntityAliasReview,
    setShowEntityAliasReview,
    entityAliasReviewItems,
    setEntityAliasReviewItems,
    entityAliasReviewLoading,
    entityAliasReviewError,
    showNarrativeSummaryStatus,
    setShowNarrativeSummaryStatus,
    narrativeSummaryStatus,
    narrativeSummaryStatusLoading,
    narrativeSummaryStatusError,
  };
}
