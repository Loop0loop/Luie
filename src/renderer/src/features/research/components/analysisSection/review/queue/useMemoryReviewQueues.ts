import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { useAnalysisStore } from "@renderer/features/research/stores/analysisStore";
import type {
  AnalysisConflictItem,
  AnalysisEntityAliasReviewItem,
  AnalysisEntityReviewItem,
  AnalysisEpisodeReviewItem,
  AnalysisFactReviewItem,
  AnalysisStaleEvidenceReviewAction,
  AnalysisStaleEvidenceReviewItem,
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
  const { t } = useTranslation();

  const {
    showNarrativeSummaryStatus,
    setShowNarrativeSummaryStatus,
    narrativeSummaryStatus,
    narrativeSummaryStatusLoading,
    narrativeSummaryStatusError,
    loadNarrativeSummaryStatus,

    showConflictQueue,
    setShowConflictQueue,
    conflictQueueItems,
    conflictQueueLoading,
    conflictQueueError,
    resolvingConflictId,
    loadConflictQueue,
    handleResolveConflict,
    handleDeferConflict,

    showFactReviewQueue,
    setShowFactReviewQueue,
    factReviewItems,
    factReviewLoading,
    factReviewError,
    mutatingFactId,
    loadFactReviewQueue,
    handleConfirmFact,
    handleRejectFact,

    showEpisodeReviewQueue,
    setShowEpisodeReviewQueue,
    episodeReviewItems,
    episodeReviewLoading,
    episodeReviewError,
    mutatingEpisodeId,
    loadEpisodeReviewQueue,
    handleConfirmEpisode,
    handleRejectEpisode,

    showEntityReviewQueue,
    setShowEntityReviewQueue,
    entityReviewItems,
    entityReviewLoading,
    entityReviewError,
    mutatingEntityId,
    loadEntityReviewQueue,
    handleConfirmEntity,
    handleRejectEntity,

    showEntityAliasReviewQueue,
    setShowEntityAliasReviewQueue,
    entityAliasReviewItems,
    entityAliasReviewLoading,
    entityAliasReviewError,
    mutatingAliasId,
    loadEntityAliasReviewQueue,
    handleConfirmEntityAlias,
    handleRejectEntityAlias,
    handleMergeEntityAlias,
    handleSplitEntityAlias,

    showStaleEvidenceReviewQueue,
    setShowStaleEvidenceReviewQueue,
    staleEvidenceReviewItems,
    staleEvidenceReviewLoading,
    staleEvidenceReviewError,
    mutatingStaleEvidenceId,
    repairingStaleEvidenceLinks,
    loadStaleEvidenceReviewQueue,
    handleReviewStaleEvidence,
    handleRepairStaleEvidence,
  } = useAnalysisStore(
    useShallow((state) => ({
      showNarrativeSummaryStatus: state.showNarrativeSummaryStatus,
      setShowNarrativeSummaryStatus: state.setShowNarrativeSummaryStatus,
      narrativeSummaryStatus: state.narrativeSummaryStatus,
      narrativeSummaryStatusLoading: state.narrativeSummaryStatusLoading,
      narrativeSummaryStatusError: state.narrativeSummaryStatusError,
      loadNarrativeSummaryStatus: state.loadNarrativeSummaryStatus,

      showConflictQueue: state.showConflictQueue,
      setShowConflictQueue: state.setShowConflictQueue,
      conflictQueueItems: state.conflictQueueItems,
      conflictQueueLoading: state.conflictQueueLoading,
      conflictQueueError: state.conflictQueueError,
      resolvingConflictId: state.resolvingConflictId,
      loadConflictQueue: state.loadConflictQueue,
      handleResolveConflict: state.handleResolveConflict,
      handleDeferConflict: state.handleDeferConflict,

      showFactReviewQueue: state.showFactReviewQueue,
      setShowFactReviewQueue: state.setShowFactReviewQueue,
      factReviewItems: state.factReviewItems,
      factReviewLoading: state.factReviewLoading,
      factReviewError: state.factReviewError,
      mutatingFactId: state.mutatingFactId,
      loadFactReviewQueue: state.loadFactReviewQueue,
      handleConfirmFact: state.handleConfirmFact,
      handleRejectFact: state.handleRejectFact,

      showEpisodeReviewQueue: state.showEpisodeReviewQueue,
      setShowEpisodeReviewQueue: state.setShowEpisodeReviewQueue,
      episodeReviewItems: state.episodeReviewItems,
      episodeReviewLoading: state.episodeReviewLoading,
      episodeReviewError: state.episodeReviewError,
      mutatingEpisodeId: state.mutatingEpisodeId,
      loadEpisodeReviewQueue: state.loadEpisodeReviewQueue,
      handleConfirmEpisode: state.handleConfirmEpisode,
      handleRejectEpisode: state.handleRejectEpisode,

      showEntityReviewQueue: state.showEntityReviewQueue,
      setShowEntityReviewQueue: state.setShowEntityReviewQueue,
      entityReviewItems: state.entityReviewItems,
      entityReviewLoading: state.entityReviewLoading,
      entityReviewError: state.entityReviewError,
      mutatingEntityId: state.mutatingEntityId,
      loadEntityReviewQueue: state.loadEntityReviewQueue,
      handleConfirmEntity: state.handleConfirmEntity,
      handleRejectEntity: state.handleRejectEntity,

      showEntityAliasReviewQueue: state.showEntityAliasReviewQueue,
      setShowEntityAliasReviewQueue: state.setShowEntityAliasReviewQueue,
      entityAliasReviewItems: state.entityAliasReviewItems,
      entityAliasReviewLoading: state.entityAliasReviewLoading,
      entityAliasReviewError: state.entityAliasReviewError,
      mutatingAliasId: state.mutatingAliasId,
      loadEntityAliasReviewQueue: state.loadEntityAliasReviewQueue,
      handleConfirmEntityAlias: state.handleConfirmEntityAlias,
      handleRejectEntityAlias: state.handleRejectEntityAlias,
      handleMergeEntityAlias: state.handleMergeEntityAlias,
      handleSplitEntityAlias: state.handleSplitEntityAlias,

      showStaleEvidenceReviewQueue: state.showStaleEvidenceReviewQueue,
      setShowStaleEvidenceReviewQueue: state.setShowStaleEvidenceReviewQueue,
      staleEvidenceReviewItems: state.staleEvidenceReviewItems,
      staleEvidenceReviewLoading: state.staleEvidenceReviewLoading,
      staleEvidenceReviewError: state.staleEvidenceReviewError,
      mutatingStaleEvidenceId: state.mutatingStaleEvidenceId,
      repairingStaleEvidenceLinks: state.repairingStaleEvidenceLinks,
      loadStaleEvidenceReviewQueue: state.loadStaleEvidenceReviewQueue,
      handleReviewStaleEvidence: state.handleReviewStaleEvidence,
      handleRepairStaleEvidence: state.handleRepairStaleEvidence,
    }))
  );

  useEffect(() => {
    if (!showNarrativeSummaryStatus || !projectId) return;
    void loadNarrativeSummaryStatus(projectId);
  }, [projectId, showNarrativeSummaryStatus, loadNarrativeSummaryStatus]);

  useEffect(() => {
    if (!showConflictQueue || !projectId) return;
    void loadConflictQueue(projectId, chapterId, memoryScope);
  }, [projectId, chapterId, memoryScope, showConflictQueue, loadConflictQueue]);

  useEffect(() => {
    if (!showFactReviewQueue || !projectId) return;
    void loadFactReviewQueue(projectId);
  }, [projectId, showFactReviewQueue, loadFactReviewQueue]);

  useEffect(() => {
    if (!showEpisodeReviewQueue || !projectId) return;
    void loadEpisodeReviewQueue(projectId);
  }, [projectId, showEpisodeReviewQueue, loadEpisodeReviewQueue]);

  useEffect(() => {
    if (!showEntityReviewQueue || !projectId) return;
    void loadEntityReviewQueue(projectId);
  }, [projectId, showEntityReviewQueue, loadEntityReviewQueue]);

  useEffect(() => {
    if (!showEntityAliasReviewQueue || !projectId) return;
    void loadEntityAliasReviewQueue(projectId);
  }, [projectId, showEntityAliasReviewQueue, loadEntityAliasReviewQueue]);

  useEffect(() => {
    if (!showStaleEvidenceReviewQueue || !projectId) return;
    void loadStaleEvidenceReviewQueue(projectId);
  }, [projectId, showStaleEvidenceReviewQueue, loadStaleEvidenceReviewQueue]);

  const requestRejectReason = useCallback(
    (type: "fact" | "episode" | "entity" | "alias"): string | null => {
      const promptMessage = t(`analysis.review.queue.${type}.rejectReasonPrompt`);
      const reason = window.prompt(promptMessage);
      const trimmed = reason?.trim() ?? "";
      return trimmed.length > 0 ? trimmed : null;
    },
    [t],
  );

  const requestStaleEvidenceNote = useCallback(
    (action: AnalysisStaleEvidenceReviewAction): string | null => {
      const promptMessage = t(
        `analysis.review.queue.staleEvidence.${action}ReasonPrompt`,
      );
      const reason = window.prompt(promptMessage);
      const trimmed = reason?.trim() ?? "";
      return trimmed.length > 0 ? trimmed : null;
    },
    [t],
  );

  const onResolveConflict = useCallback(
    async (item: AnalysisConflictItem, winnerFactId: string) => {
      if (!projectId) return;
      await handleResolveConflict(projectId, item, winnerFactId);
      await loadConflictQueue(projectId, chapterId, memoryScope);
    },
    [projectId, chapterId, memoryScope, handleResolveConflict, loadConflictQueue],
  );

  const onDeferConflict = useCallback(
    (item: AnalysisConflictItem) => {
      handleDeferConflict(item);
    },
    [handleDeferConflict],
  );

  const onConfirmFact = useCallback(
    async (item: AnalysisFactReviewItem) => {
      if (!projectId) return;
      await handleConfirmFact(projectId, item);
    },
    [projectId, handleConfirmFact],
  );

  const onRejectFact = useCallback(
    async (item: AnalysisFactReviewItem) => {
      if (!projectId) return;
      const reason = requestRejectReason("fact");
      if (!reason) return;
      await handleRejectFact(projectId, item, reason);
    },
    [projectId, handleRejectFact, requestRejectReason],
  );

  const onConfirmEpisode = useCallback(
    async (item: AnalysisEpisodeReviewItem) => {
      if (!projectId) return;
      await handleConfirmEpisode(projectId, item);
    },
    [projectId, handleConfirmEpisode],
  );

  const onRejectEpisode = useCallback(
    async (item: AnalysisEpisodeReviewItem) => {
      if (!projectId) return;
      const reason = requestRejectReason("episode");
      if (!reason) return;
      await handleRejectEpisode(projectId, item, reason);
    },
    [projectId, handleRejectEpisode, requestRejectReason],
  );

  const onConfirmEntity = useCallback(
    async (item: AnalysisEntityReviewItem) => {
      if (!projectId) return;
      await handleConfirmEntity(projectId, item);
    },
    [projectId, handleConfirmEntity],
  );

  const onRejectEntity = useCallback(
    async (item: AnalysisEntityReviewItem) => {
      if (!projectId) return;
      const reason = requestRejectReason("entity");
      if (!reason) return;
      await handleRejectEntity(projectId, item, reason);
    },
    [projectId, handleRejectEntity, requestRejectReason],
  );

  const onConfirmEntityAlias = useCallback(
    async (item: AnalysisEntityAliasReviewItem) => {
      if (!projectId) return;
      await handleConfirmEntityAlias(projectId, item);
    },
    [projectId, handleConfirmEntityAlias],
  );

  const onRejectEntityAlias = useCallback(
    async (item: AnalysisEntityAliasReviewItem) => {
      if (!projectId) return;
      const reason = requestRejectReason("alias");
      if (!reason) return;
      await handleRejectEntityAlias(projectId, item, reason);
    },
    [projectId, handleRejectEntityAlias, requestRejectReason],
  );

  const onMergeEntityAlias = useCallback(
    async (item: AnalysisEntityAliasReviewItem, targetEntityId: string) => {
      if (!projectId) return;
      await handleMergeEntityAlias(projectId, item, targetEntityId);
    },
    [projectId, handleMergeEntityAlias],
  );

  const onSplitEntityAlias = useCallback(
    async (item: AnalysisEntityAliasReviewItem, canonicalName: string) => {
      if (!projectId) return;
      await handleSplitEntityAlias(projectId, item, canonicalName);
    },
    [projectId, handleSplitEntityAlias],
  );

  const onReviewStaleEvidence = useCallback(
    async (
      item: AnalysisStaleEvidenceReviewItem,
      action: AnalysisStaleEvidenceReviewAction,
    ) => {
      if (!projectId) return;
      const reviewerNote = requestStaleEvidenceNote(action);
      await handleReviewStaleEvidence(projectId, item, action, reviewerNote);
    },
    [projectId, handleReviewStaleEvidence, requestStaleEvidenceNote],
  );

  const onRepairStaleEvidence = useCallback(async () => {
    if (!projectId) return;
    await handleRepairStaleEvidence(projectId);
  }, [projectId, handleRepairStaleEvidence]);

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
    handleResolveConflict: onResolveConflict,
    handleDeferConflict: onDeferConflict,
    showFactReviewQueue,
    setShowFactReviewQueue,
    factReviewItems,
    factReviewLoading,
    factReviewError,
    mutatingFactId,
    handleConfirmFact: onConfirmFact,
    handleRejectFact: onRejectFact,
    showEpisodeReviewQueue,
    setShowEpisodeReviewQueue,
    episodeReviewItems,
    episodeReviewLoading,
    episodeReviewError,
    mutatingEpisodeId,
    handleConfirmEpisode: onConfirmEpisode,
    handleRejectEpisode: onRejectEpisode,
    showEntityReviewQueue,
    setShowEntityReviewQueue,
    entityReviewItems,
    entityReviewLoading,
    entityReviewError,
    mutatingEntityId,
    handleConfirmEntity: onConfirmEntity,
    handleRejectEntity: onRejectEntity,
    showEntityAliasReviewQueue,
    setShowEntityAliasReviewQueue,
    entityAliasReviewItems,
    entityAliasReviewLoading,
    entityAliasReviewError,
    mutatingAliasId,
    handleConfirmEntityAlias: onConfirmEntityAlias,
    handleRejectEntityAlias: onRejectEntityAlias,
    handleMergeEntityAlias: onMergeEntityAlias,
    handleSplitEntityAlias: onSplitEntityAlias,
    showStaleEvidenceReviewQueue,
    setShowStaleEvidenceReviewQueue,
    staleEvidenceReviewItems,
    staleEvidenceReviewLoading,
    staleEvidenceReviewError,
    mutatingStaleEvidenceId,
    repairingStaleEvidenceLinks,
    handleReviewStaleEvidence: onReviewStaleEvidence,
    handleRepairStaleEvidence: onRepairStaleEvidence,
  };
}
