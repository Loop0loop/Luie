import type { AnalysisStreamChunk } from "@shared/types/analysis.js";
import { api } from "@shared/api";
import { i18n } from "@renderer/i18n";
import type {
  MemoryScope,
  ConflictReviewFilter,
  AnalysisConflictItem,
  AnalysisEntityAliasReviewItem,
  AnalysisEntityReviewItem,
  AnalysisEpisodeReviewItem,
  AnalysisFactReviewItem,
  AnalysisStaleEvidenceReviewAction,
  AnalysisStaleEvidenceReviewItem,
} from "../../components/analysisSection/shared/types";
import { createRagChatActions } from "./actions/ragChatActions";
import type {
  AnalysisActions,
  AnalysisGet,
  AnalysisSet,
} from "./analysisStore.types";

export type { AnalysisActions } from "./analysisStore.types";
export { cleanUpRagStreamListeners } from "./actions/ragChatActions";
export function createAnalysisActions(
  set: AnalysisSet,
  get: AnalysisGet,
): AnalysisActions {
  return {
    startAnalysis: async (chapterId: string, projectId: string) => {
      set({ isAnalyzing: true, error: null, items: [] });

      try {
        const response = await api.analysis.start(chapterId, projectId);
        if (!response.success) {
          let errorMessage = i18n.t("analysis.toast.error");
          
          if (response.error?.code === "API_KEY_MISSING") {
            errorMessage = i18n.t("analysis.toast.apiKeyMissing");
          } else if (response.error?.code === "QUOTA_EXCEEDED") {
            errorMessage = i18n.t("analysis.toast.quotaExceeded");
          } else if (response.error?.code === "NETWORK_ERROR") {
            errorMessage = i18n.t("analysis.toast.networkError");
          } else if (response.error?.message) {
            errorMessage = response.error.message;
          }
          set({ error: errorMessage, isAnalyzing: false });
          throw new Error(errorMessage);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : i18n.t("analysis.toast.unknown");
        set({ error: errorMessage, isAnalyzing: false });
        throw error;
      }
    },

    stopAnalysis: async () => {
      try {
        await api.analysis.stop();
        set({ isAnalyzing: false });
      } catch {
        set({ isAnalyzing: false });
      }
    },
    clearAnalysis: async () => {
      try {
        await api.analysis.clear();
        set({ items: [], isAnalyzing: false, error: null });
      } catch {
        set({ isAnalyzing: false });
      }
    },

    addStreamItem: (chunk: AnalysisStreamChunk) => {
      if (chunk.done) {
        set({ isAnalyzing: false });
        return;
      }
      if (chunk.item) {
        const normalize = (value: string | undefined) =>
          (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
        const incomingSignature = `${chunk.item.type}|${normalize(chunk.item.content)}|${normalize(chunk.item.quote)}`;

        set((state) => ({
          items: state.items.some((existing) => {
            const existingSignature = `${existing.type}|${normalize(existing.content)}|${normalize(existing.quote)}`;
            return existingSignature === incomingSignature;
          })
            ? state.items
            : [...state.items, chunk.item],
        }));
      }
    },
    ...createRagChatActions(set, get),

    loadNarrativeSummaryStatus: async (projectId: string) => {
      set({ narrativeSummaryStatusLoading: true, narrativeSummaryStatusError: null });
      try {
        const response = await api.memory.getNarrativeSummaryStatus(projectId);
        if (!response.success || !response.data) {
          set({
            narrativeSummaryStatusError: response.error?.message ?? i18n.t("analysis.review.summary.fetchError"),
            narrativeSummaryStatus: null,
          });
          return;
        }
        set({ narrativeSummaryStatus: response.data });
      } finally {
        set({ narrativeSummaryStatusLoading: false });
      }
    },
    loadConflictQueue: async (
      projectId: string,
      chapterId: string | undefined,
      memoryScope: MemoryScope,
      reviewFilter: ConflictReviewFilter = "active",
    ) => {
      set({ conflictQueueLoading: true, conflictQueueError: null });
      try {
        const response = await api.memory.getConflictQueue({
          projectId,
          chapterId,
          includePriorMemory: memoryScope === "with-prior",
          reviewFilter,
        });
        if (!response.success || !response.data) {
          set({
            conflictQueueError: response.error?.message ?? i18n.t("analysis.review.queue.conflict.fetchError"),
            conflictQueueItems: [],
          });
          return;
        }
        set({ conflictQueueItems: response.data.items });
      } finally {
        set({ conflictQueueLoading: false });
      }
    },

    handleResolveConflict: async (projectId: string, item: AnalysisConflictItem, winnerFactId: string) => {
      set({ resolvingConflictId: item.conflictId, conflictQueueError: null });
      try {
        const response = await api.memory.resolveFactConflict({
          projectId,
          conflictId: item.conflictId,
          winnerFactId,
        });
        if (!response.success || !response.data?.updated) {
          set({
            conflictQueueError: response.error?.message ?? i18n.t("analysis.review.queue.conflict.resolveError"),
          });
          return;
        }
      } finally {
        set({ resolvingConflictId: null });
      }
    },
    handleDeferConflict: async (projectId: string, item: AnalysisConflictItem) => {
      set({ resolvingConflictId: item.conflictId, conflictQueueError: null });
      try {
        const response = await api.memory.reviewFactConflict({
          projectId,
          conflictId: item.conflictId,
          action: "defer",
          reviewerNote: null,
        });
        if (!response.success || !response.data?.updated) {
          set({
            conflictQueueError: response.error?.message ?? i18n.t("analysis.review.queue.conflict.reviewError"),
          });
          return;
        }
        set((state) => ({
          conflictQueueItems: state.conflictQueueItems.filter(
            (candidate) => candidate.conflictId !== item.conflictId,
          ),
        }));
      } finally {
        set({ resolvingConflictId: null });
      }
    },
    loadFactReviewQueue: async (projectId: string) => {
      set({ factReviewLoading: true, factReviewError: null });
      try {
        const response = await api.memory.getFactReviewQueue({ projectId });
        if (!response.success || !response.data) {
          set({
            factReviewError: response.error?.message ?? i18n.t("analysis.review.queue.fact.fetchError"),
            factReviewItems: [],
          });
          return;
        }
        set({ factReviewItems: response.data.items });
      } finally {
        set({ factReviewLoading: false });
      }
    },

    loadEpisodeReviewQueue: async (projectId: string) => {
      set({ episodeReviewLoading: true, episodeReviewError: null });
      try {
        const response = await api.memory.getEpisodeReviewQueue({ projectId });
        if (!response.success || !response.data) {
          set({
            episodeReviewError: response.error?.message ?? i18n.t("analysis.review.queue.episode.fetchError"),
            episodeReviewItems: [],
          });
          return;
        }
        set({ episodeReviewItems: response.data.items });
      } finally {
        set({ episodeReviewLoading: false });
      }
    },
    loadEntityReviewQueue: async (projectId: string) => {
      set({ entityReviewLoading: true, entityReviewError: null });
      try {
        const response = await api.memory.getEntityReviewQueue({ projectId });
        if (!response.success || !response.data) {
          set({
            entityReviewError: response.error?.message ?? i18n.t("analysis.review.queue.entity.fetchError"),
            entityReviewItems: [],
          });
          return;
        }
        set({ entityReviewItems: response.data.items });
      } finally {
        set({ entityReviewLoading: false });
      }
    },

    loadEntityAliasReviewQueue: async (projectId: string) => {
      set({ entityAliasReviewLoading: true, entityAliasReviewError: null });
      try {
        const response = await api.memory.getEntityAliasReviewQueue({ projectId });
        if (!response.success || !response.data) {
          set({
            entityAliasReviewError: response.error?.message ?? i18n.t("analysis.review.queue.alias.fetchError"),
            entityAliasReviewItems: [],
          });
          return;
        }
        set({ entityAliasReviewItems: response.data.items });
      } finally {
        set({ entityAliasReviewLoading: false });
      }
    },
    loadStaleEvidenceReviewQueue: async (projectId: string) => {
      set({ staleEvidenceReviewLoading: true, staleEvidenceReviewError: null });
      try {
        const response = await api.memory.getReviewBacklog({
          projectId,
          limit: 50,
          evidenceLimit: 3,
        });
        if (!response.success || !response.data) {
          set({
            staleEvidenceReviewError:
              response.error?.message ??
              i18n.t("analysis.review.queue.staleEvidence.fetchError"),
            staleEvidenceReviewItems: [],
          });
          return;
        }
        set({ staleEvidenceReviewItems: response.data.staleEvidence });
      } finally {
        set({ staleEvidenceReviewLoading: false });
      }
    },
    handleConfirmFact: async (projectId: string, item: AnalysisFactReviewItem) => {
      set({ mutatingFactId: item.id, factReviewError: null });
      try {
        const response = await api.memory.confirmFact({ projectId, factId: item.id });
        if (!response.success || !response.data?.updated) {
          set({ factReviewError: response.error?.message ?? i18n.t("analysis.review.queue.fact.confirmError") });
          return;
        }
        await get().loadFactReviewQueue(projectId);
      } finally {
        set({ mutatingFactId: null });
      }
    },

    handleRejectFact: async (projectId: string, item: AnalysisFactReviewItem, reason: string) => {
      set({ mutatingFactId: item.id, factReviewError: null });
      try {
        const response = await api.memory.rejectFact({ projectId, factId: item.id, reason });
        if (!response.success || !response.data?.updated) {
          set({ factReviewError: response.error?.message ?? i18n.t("analysis.review.queue.fact.rejectError") });
          return;
        }
        await get().loadFactReviewQueue(projectId);
      } finally {
        set({ mutatingFactId: null });
      }
    },
    handleConfirmEpisode: async (projectId: string, item: AnalysisEpisodeReviewItem) => {
      set({ mutatingEpisodeId: item.id, episodeReviewError: null });
      try {
        const response = await api.memory.confirmEpisode({ projectId, episodeId: item.id });
        if (!response.success || !response.data?.updated) {
          set({ episodeReviewError: response.error?.message ?? i18n.t("analysis.review.queue.episode.confirmError") });
          return;
        }
        await get().loadEpisodeReviewQueue(projectId);
      } finally {
        set({ mutatingEpisodeId: null });
      }
    },

    handleRejectEpisode: async (projectId: string, item: AnalysisEpisodeReviewItem, reason: string) => {
      set({ mutatingEpisodeId: item.id, episodeReviewError: null });
      try {
        const response = await api.memory.rejectEpisode({ projectId, episodeId: item.id, reason });
        if (!response.success || !response.data?.updated) {
          set({ episodeReviewError: response.error?.message ?? i18n.t("analysis.review.queue.episode.rejectError") });
          return;
        }
        await get().loadEpisodeReviewQueue(projectId);
      } finally {
        set({ mutatingEpisodeId: null });
      }
    },
    handleConfirmEntity: async (projectId: string, item: AnalysisEntityReviewItem) => {
      set({ mutatingEntityId: item.id, entityReviewError: null });
      try {
        const response = await api.memory.confirmEntity({ projectId, entityId: item.id });
        if (!response.success || !response.data?.updated) {
          set({ entityReviewError: response.error?.message ?? i18n.t("analysis.review.queue.entity.confirmError") });
          return;
        }
        await get().loadEntityReviewQueue(projectId);
      } finally {
        set({ mutatingEntityId: null });
      }
    },

    handleRejectEntity: async (projectId: string, item: AnalysisEntityReviewItem, reason: string) => {
      set({ mutatingEntityId: item.id, entityReviewError: null });
      try {
        const response = await api.memory.rejectEntity({ projectId, entityId: item.id, reason });
        if (!response.success || !response.data?.updated) {
          set({ entityReviewError: response.error?.message ?? i18n.t("analysis.review.queue.entity.rejectError") });
          return;
        }
        await get().loadEntityReviewQueue(projectId);
      } finally {
        set({ mutatingEntityId: null });
      }
    },
    handleConfirmEntityAlias: async (projectId: string, item: AnalysisEntityAliasReviewItem) => {
      set({ mutatingAliasId: item.id, entityAliasReviewError: null });
      try {
        const response = await api.memory.confirmEntityAlias({ projectId, aliasId: item.id });
        if (!response.success || !response.data?.updated) {
          set({ entityAliasReviewError: response.error?.message ?? i18n.t("analysis.review.queue.alias.confirmError") });
          return;
        }
        await get().loadEntityAliasReviewQueue(projectId);
      } finally {
        set({ mutatingAliasId: null });
      }
    },

    handleRejectEntityAlias: async (projectId: string, item: AnalysisEntityAliasReviewItem, reason: string) => {
      set({ mutatingAliasId: item.id, entityAliasReviewError: null });
      try {
        const response = await api.memory.rejectEntityAlias({ projectId, aliasId: item.id, reason });
        if (!response.success || !response.data?.updated) {
          set({ entityAliasReviewError: response.error?.message ?? i18n.t("analysis.review.queue.alias.rejectError") });
          return;
        }
        await get().loadEntityAliasReviewQueue(projectId);
      } finally {
        set({ mutatingAliasId: null });
      }
    },
    handleMergeEntityAlias: async (projectId: string, item: AnalysisEntityAliasReviewItem, targetEntityId: string) => {
      if (!targetEntityId) return;
      set({ mutatingAliasId: item.id, entityAliasReviewError: null });
      try {
        const response = await api.memory.mergeEntity({
          projectId,
          sourceEntityId: item.entityId,
          targetEntityId,
        });
        if (!response.success || !response.data?.updated) {
          set({ entityAliasReviewError: response.error?.message ?? i18n.t("analysis.review.queue.alias.mergeError") });
          return;
        }
        await Promise.all([get().loadEntityAliasReviewQueue(projectId), get().loadEntityReviewQueue(projectId)]);
      } finally {
        set({ mutatingAliasId: null });
      }
    },

    handleSplitEntityAlias: async (projectId: string, item: AnalysisEntityAliasReviewItem, canonicalName: string) => {
      if (!canonicalName) return;
      set({ mutatingAliasId: item.id, entityAliasReviewError: null });
      try {
        const response = await api.memory.splitEntityAlias({
          projectId,
          aliasId: item.id,
          canonicalName,
        });
        if (!response.success || !response.data?.updated) {
          set({ entityAliasReviewError: response.error?.message ?? i18n.t("analysis.review.queue.alias.splitError") });
          return;
        }
        await Promise.all([get().loadEntityAliasReviewQueue(projectId), get().loadEntityReviewQueue(projectId)]);
      } finally {
        set({ mutatingAliasId: null });
      }
    },
     handleReviewStaleEvidence: async (
       projectId: string,
       item: AnalysisStaleEvidenceReviewItem,
       action: AnalysisStaleEvidenceReviewAction,
       reviewerNote?: string | null,
    ) => {
      set({ mutatingStaleEvidenceId: item.id, staleEvidenceReviewError: null });
      try {
        const response = await api.memory.reviewStaleEvidence({
          projectId,
          kind: item.kind,
          id: item.id,
          action,
          reviewerNote,
        });
        if (!response.success || !response.data?.updated) {
          set({
            staleEvidenceReviewError:
              response.error?.message ??
              i18n.t("analysis.review.queue.staleEvidence.actionError"),
          });
          return;
        }
        await get().loadStaleEvidenceReviewQueue(projectId);
      } finally {
         set({ mutatingStaleEvidenceId: null });
       }
     },
     handleRepairStaleEvidence: async (projectId: string) => {
       set({ repairingStaleEvidenceLinks: true, staleEvidenceReviewError: null });
       try {
         const response = await api.memory.repairEvidenceLinks({ projectId });
         if (!response.success || !response.data) {
           set({
             staleEvidenceReviewError:
               response.error?.message ??
               i18n.t("analysis.review.queue.staleEvidence.repairError"),
           });
           return;
         }
         await get().loadStaleEvidenceReviewQueue(projectId);
       } finally {
         set({ repairingStaleEvidenceLinks: false });
       }
     },
   };
 }
