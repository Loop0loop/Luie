import { useCallback, useEffect, useState } from "react";
import { api } from "@shared/api";
import type {
  AnalysisConflictItem,
  AnalysisEntityAliasReviewItem,
  AnalysisEntityReviewItem,
  AnalysisEpisodeReviewItem,
  AnalysisFactReviewItem,
  AnalysisNarrativeSummaryStatus,
  MemoryScope,
} from "../../shared/types";

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
  const [showNarrativeSummaryStatus, setShowNarrativeSummaryStatus] =
    useState(false);
  const [narrativeSummaryStatus, setNarrativeSummaryStatus] =
    useState<AnalysisNarrativeSummaryStatus | null>(null);
  const [narrativeSummaryStatusLoading, setNarrativeSummaryStatusLoading] =
    useState(false);
  const [narrativeSummaryStatusError, setNarrativeSummaryStatusError] =
    useState<string | null>(null);
  const [showConflictQueue, setShowConflictQueue] = useState(false);
  const [conflictQueueItems, setConflictQueueItems] = useState<
    AnalysisConflictItem[]
  >([]);
  const [conflictQueueLoading, setConflictQueueLoading] = useState(false);
  const [conflictQueueError, setConflictQueueError] = useState<string | null>(
    null,
  );
  const [resolvingConflictId, setResolvingConflictId] = useState<string | null>(
    null,
  );
  const [showFactReviewQueue, setShowFactReviewQueue] = useState(false);
  const [factReviewItems, setFactReviewItems] = useState<
    AnalysisFactReviewItem[]
  >([]);
  const [factReviewLoading, setFactReviewLoading] = useState(false);
  const [factReviewError, setFactReviewError] = useState<string | null>(null);
  const [mutatingFactId, setMutatingFactId] = useState<string | null>(null);
  const [showEpisodeReviewQueue, setShowEpisodeReviewQueue] = useState(false);
  const [episodeReviewItems, setEpisodeReviewItems] = useState<
    AnalysisEpisodeReviewItem[]
  >([]);
  const [episodeReviewLoading, setEpisodeReviewLoading] = useState(false);
  const [episodeReviewError, setEpisodeReviewError] = useState<string | null>(
    null,
  );
  const [mutatingEpisodeId, setMutatingEpisodeId] = useState<string | null>(
    null,
  );
  const [showEntityReviewQueue, setShowEntityReviewQueue] = useState(false);
  const [entityReviewItems, setEntityReviewItems] = useState<
    AnalysisEntityReviewItem[]
  >([]);
  const [entityReviewLoading, setEntityReviewLoading] = useState(false);
  const [entityReviewError, setEntityReviewError] = useState<string | null>(
    null,
  );
  const [mutatingEntityId, setMutatingEntityId] = useState<string | null>(null);
  const [showEntityAliasReviewQueue, setShowEntityAliasReviewQueue] =
    useState(false);
  const [entityAliasReviewItems, setEntityAliasReviewItems] = useState<
    AnalysisEntityAliasReviewItem[]
  >([]);
  const [entityAliasReviewLoading, setEntityAliasReviewLoading] =
    useState(false);
  const [entityAliasReviewError, setEntityAliasReviewError] = useState<
    string | null
  >(null);
  const [mutatingAliasId, setMutatingAliasId] = useState<string | null>(null);

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

  const loadConflictQueue = useCallback(async () => {
    if (!projectId) {
      setConflictQueueItems([]);
      return;
    }

    setConflictQueueLoading(true);
    setConflictQueueError(null);
    try {
      const response = await api.memory.getConflictQueue({
        projectId,
        chapterId,
        includePriorMemory: memoryScope === "with-prior",
      });
      if (!response.success || !response.data) {
        setConflictQueueError(
          response.error?.message ?? "충돌 큐 조회 실패",
        );
        setConflictQueueItems([]);
        return;
      }
      setConflictQueueItems(response.data.items);
    } finally {
      setConflictQueueLoading(false);
    }
  }, [chapterId, memoryScope, projectId]);

  useEffect(() => {
    if (!showConflictQueue) return;
    const timeoutId = window.setTimeout(() => {
      void loadConflictQueue();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadConflictQueue, showConflictQueue]);

  const handleResolveConflict = useCallback(
    async (item: AnalysisConflictItem, winnerFactId: string) => {
      if (!projectId) return;

      setResolvingConflictId(item.conflictId);
      setConflictQueueError(null);
      try {
        const response = await api.memory.resolveFactConflict({
          projectId,
          conflictId: item.conflictId,
          winnerFactId,
        });
        if (!response.success || !response.data?.updated) {
          setConflictQueueError(
            response.error?.message ?? "충돌 해결 실패",
          );
          return;
        }
        await loadConflictQueue();
      } finally {
        setResolvingConflictId(null);
      }
    },
    [loadConflictQueue, projectId],
  );

  const requestRejectReason = useCallback((label: string): string | null => {
    const reason = window.prompt(`${label} 거절 이유를 입력하세요`);
    const trimmed = reason?.trim() ?? "";
    return trimmed.length > 0 ? trimmed : null;
  }, []);

  const loadFactReviewQueue = useCallback(async () => {
    if (!projectId) {
      setFactReviewItems([]);
      return;
    }
    setFactReviewLoading(true);
    setFactReviewError(null);
    try {
      const response = await api.memory.getFactReviewQueue({ projectId });
      if (!response.success || !response.data) {
        setFactReviewError(response.error?.message ?? "사실 검토 큐 조회 실패");
        setFactReviewItems([]);
        return;
      }
      setFactReviewItems(response.data.items);
    } finally {
      setFactReviewLoading(false);
    }
  }, [projectId]);

  const loadEpisodeReviewQueue = useCallback(async () => {
    if (!projectId) {
      setEpisodeReviewItems([]);
      return;
    }
    setEpisodeReviewLoading(true);
    setEpisodeReviewError(null);
    try {
      const response = await api.memory.getEpisodeReviewQueue({ projectId });
      if (!response.success || !response.data) {
        setEpisodeReviewError(
          response.error?.message ?? "에피소드 검토 큐 조회 실패",
        );
        setEpisodeReviewItems([]);
        return;
      }
      setEpisodeReviewItems(response.data.items);
    } finally {
      setEpisodeReviewLoading(false);
    }
  }, [projectId]);

  const loadEntityReviewQueue = useCallback(async () => {
    if (!projectId) {
      setEntityReviewItems([]);
      return;
    }
    setEntityReviewLoading(true);
    setEntityReviewError(null);
    try {
      const response = await api.memory.getEntityReviewQueue({ projectId });
      if (!response.success || !response.data) {
        setEntityReviewError(
          response.error?.message ?? "엔티티 검토 큐 조회 실패",
        );
        setEntityReviewItems([]);
        return;
      }
      setEntityReviewItems(response.data.items);
    } finally {
      setEntityReviewLoading(false);
    }
  }, [projectId]);

  const loadEntityAliasReviewQueue = useCallback(async () => {
    if (!projectId) {
      setEntityAliasReviewItems([]);
      return;
    }
    setEntityAliasReviewLoading(true);
    setEntityAliasReviewError(null);
    try {
      const response = await api.memory.getEntityAliasReviewQueue({ projectId });
      if (!response.success || !response.data) {
        setEntityAliasReviewError(
          response.error?.message ?? "별칭 검토 큐 조회 실패",
        );
        setEntityAliasReviewItems([]);
        return;
      }
      setEntityAliasReviewItems(response.data.items);
    } finally {
      setEntityAliasReviewLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!showFactReviewQueue) return;
    const timeoutId = window.setTimeout(() => {
      void loadFactReviewQueue();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadFactReviewQueue, showFactReviewQueue]);

  useEffect(() => {
    if (!showEpisodeReviewQueue) return;
    const timeoutId = window.setTimeout(() => {
      void loadEpisodeReviewQueue();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadEpisodeReviewQueue, showEpisodeReviewQueue]);

  useEffect(() => {
    if (!showEntityReviewQueue) return;
    const timeoutId = window.setTimeout(() => {
      void loadEntityReviewQueue();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadEntityReviewQueue, showEntityReviewQueue]);

  useEffect(() => {
    if (!showEntityAliasReviewQueue) return;
    const timeoutId = window.setTimeout(() => {
      void loadEntityAliasReviewQueue();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadEntityAliasReviewQueue, showEntityAliasReviewQueue]);

  const handleConfirmFact = useCallback(
    async (item: AnalysisFactReviewItem) => {
      if (!projectId) return;
      setMutatingFactId(item.id);
      setFactReviewError(null);
      try {
        const response = await api.memory.confirmFact({
          projectId,
          factId: item.id,
        });
        if (!response.success || !response.data?.updated) {
          setFactReviewError(response.error?.message ?? "사실 승인 실패");
          return;
        }
        await loadFactReviewQueue();
      } finally {
        setMutatingFactId(null);
      }
    },
    [loadFactReviewQueue, projectId],
  );

  const handleRejectFact = useCallback(
    async (item: AnalysisFactReviewItem) => {
      if (!projectId) return;
      const reason = requestRejectReason("사실");
      if (!reason) return;
      setMutatingFactId(item.id);
      setFactReviewError(null);
      try {
        const response = await api.memory.rejectFact({
          projectId,
          factId: item.id,
          reason,
        });
        if (!response.success || !response.data?.updated) {
          setFactReviewError(response.error?.message ?? "사실 거절 실패");
          return;
        }
        await loadFactReviewQueue();
      } finally {
        setMutatingFactId(null);
      }
    },
    [loadFactReviewQueue, projectId, requestRejectReason],
  );

  const handleConfirmEpisode = useCallback(
    async (item: AnalysisEpisodeReviewItem) => {
      if (!projectId) return;
      setMutatingEpisodeId(item.id);
      setEpisodeReviewError(null);
      try {
        const response = await api.memory.confirmEpisode({
          projectId,
          episodeId: item.id,
        });
        if (!response.success || !response.data?.updated) {
          setEpisodeReviewError(
            response.error?.message ?? "에피소드 승인 실패",
          );
          return;
        }
        await loadEpisodeReviewQueue();
      } finally {
        setMutatingEpisodeId(null);
      }
    },
    [loadEpisodeReviewQueue, projectId],
  );

  const handleRejectEpisode = useCallback(
    async (item: AnalysisEpisodeReviewItem) => {
      if (!projectId) return;
      const reason = requestRejectReason("에피소드");
      if (!reason) return;
      setMutatingEpisodeId(item.id);
      setEpisodeReviewError(null);
      try {
        const response = await api.memory.rejectEpisode({
          projectId,
          episodeId: item.id,
          reason,
        });
        if (!response.success || !response.data?.updated) {
          setEpisodeReviewError(
            response.error?.message ?? "에피소드 거절 실패",
          );
          return;
        }
        await loadEpisodeReviewQueue();
      } finally {
        setMutatingEpisodeId(null);
      }
    },
    [loadEpisodeReviewQueue, projectId, requestRejectReason],
  );

  const handleConfirmEntity = useCallback(
    async (item: AnalysisEntityReviewItem) => {
      if (!projectId) return;
      setMutatingEntityId(item.id);
      setEntityReviewError(null);
      try {
        const response = await api.memory.confirmEntity({
          projectId,
          entityId: item.id,
        });
        if (!response.success || !response.data?.updated) {
          setEntityReviewError(response.error?.message ?? "엔티티 승인 실패");
          return;
        }
        await loadEntityReviewQueue();
      } finally {
        setMutatingEntityId(null);
      }
    },
    [loadEntityReviewQueue, projectId],
  );

  const handleRejectEntity = useCallback(
    async (item: AnalysisEntityReviewItem) => {
      if (!projectId) return;
      const reason = requestRejectReason("엔티티");
      if (!reason) return;
      setMutatingEntityId(item.id);
      setEntityReviewError(null);
      try {
        const response = await api.memory.rejectEntity({
          projectId,
          entityId: item.id,
          reason,
        });
        if (!response.success || !response.data?.updated) {
          setEntityReviewError(response.error?.message ?? "엔티티 거절 실패");
          return;
        }
        await loadEntityReviewQueue();
      } finally {
        setMutatingEntityId(null);
      }
    },
    [loadEntityReviewQueue, projectId, requestRejectReason],
  );

  const handleConfirmEntityAlias = useCallback(
    async (item: AnalysisEntityAliasReviewItem) => {
      if (!projectId) return;
      setMutatingAliasId(item.id);
      setEntityAliasReviewError(null);
      try {
        const response = await api.memory.confirmEntityAlias({
          projectId,
          aliasId: item.id,
        });
        if (!response.success || !response.data?.updated) {
          setEntityAliasReviewError(
            response.error?.message ?? "별칭 승인 실패",
          );
          return;
        }
        await loadEntityAliasReviewQueue();
      } finally {
        setMutatingAliasId(null);
      }
    },
    [loadEntityAliasReviewQueue, projectId],
  );

  const handleRejectEntityAlias = useCallback(
    async (item: AnalysisEntityAliasReviewItem) => {
      if (!projectId) return;
      const reason = requestRejectReason("별칭");
      if (!reason) return;
      setMutatingAliasId(item.id);
      setEntityAliasReviewError(null);
      try {
        const response = await api.memory.rejectEntityAlias({
          projectId,
          aliasId: item.id,
          reason,
        });
        if (!response.success || !response.data?.updated) {
          setEntityAliasReviewError(
            response.error?.message ?? "별칭 거절 실패",
          );
          return;
        }
        await loadEntityAliasReviewQueue();
      } finally {
        setMutatingAliasId(null);
      }
    },
    [loadEntityAliasReviewQueue, projectId, requestRejectReason],
  );

  const handleMergeEntityAlias = useCallback(
    async (item: AnalysisEntityAliasReviewItem, targetEntityId: string) => {
      if (!projectId || !targetEntityId) return;
      setMutatingAliasId(item.id);
      setEntityAliasReviewError(null);
      try {
        const response = await api.memory.mergeEntity({
          projectId,
          sourceEntityId: item.entityId,
          targetEntityId,
        });
        if (!response.success || !response.data?.updated) {
          setEntityAliasReviewError(
            response.error?.message ?? "엔티티 통합 실패",
          );
          return;
        }
        await Promise.all([loadEntityAliasReviewQueue(), loadEntityReviewQueue()]);
      } finally {
        setMutatingAliasId(null);
      }
    },
    [loadEntityAliasReviewQueue, loadEntityReviewQueue, projectId],
  );

  const handleSplitEntityAlias = useCallback(
    async (item: AnalysisEntityAliasReviewItem, canonicalName: string) => {
      if (!projectId || !canonicalName) return;
      setMutatingAliasId(item.id);
      setEntityAliasReviewError(null);
      try {
        const response = await api.memory.splitEntityAlias({
          projectId,
          aliasId: item.id,
          canonicalName,
        });
        if (!response.success || !response.data?.updated) {
          setEntityAliasReviewError(
            response.error?.message ?? "별칭 분리 실패",
          );
          return;
        }
        await Promise.all([loadEntityAliasReviewQueue(), loadEntityReviewQueue()]);
      } finally {
        setMutatingAliasId(null);
      }
    },
    [loadEntityAliasReviewQueue, loadEntityReviewQueue, projectId],
  );

  return {
    showNarrativeSummaryStatus,
    setShowNarrativeSummaryStatus,
    narrativeSummaryStatus,
    narrativeSummaryStatusLoading,
    narrativeSummaryStatusError,
    showConflictQueue,
    setShowConflictQueue,
    conflictQueueItems,
    conflictQueueLoading,
    conflictQueueError,
    resolvingConflictId,
    handleResolveConflict,
    showFactReviewQueue,
    setShowFactReviewQueue,
    factReviewItems,
    factReviewLoading,
    factReviewError,
    mutatingFactId,
    handleConfirmFact,
    handleRejectFact,
    showEpisodeReviewQueue,
    setShowEpisodeReviewQueue,
    episodeReviewItems,
    episodeReviewLoading,
    episodeReviewError,
    mutatingEpisodeId,
    handleConfirmEpisode,
    handleRejectEpisode,
    showEntityReviewQueue,
    setShowEntityReviewQueue,
    entityReviewItems,
    entityReviewLoading,
    entityReviewError,
    mutatingEntityId,
    handleConfirmEntity,
    handleRejectEntity,
    showEntityAliasReviewQueue,
    setShowEntityAliasReviewQueue,
    entityAliasReviewItems,
    entityAliasReviewLoading,
    entityAliasReviewError,
    mutatingAliasId,
    handleConfirmEntityAlias,
    handleRejectEntityAlias,
    handleMergeEntityAlias,
    handleSplitEntityAlias,
  };
}
