import { api } from "@shared/api";
import { i18n } from "@renderer/i18n";
import type {
  AnalysisEntityAliasReviewItem,
  AnalysisEntityReviewItem,
  AnalysisEpisodeReviewItem,
  AnalysisFactReviewItem,
} from "../../../components/analysisSection/shared/types";
import type {
  AnalysisActions,
  AnalysisGet,
  AnalysisSet,
} from "../analysisStore.types";

type MemoryReviewActions = Pick<
  AnalysisActions,
  | "loadFactReviewQueue"
  | "loadEpisodeReviewQueue"
  | "loadEntityReviewQueue"
  | "loadEntityAliasReviewQueue"
  | "handleConfirmFact"
  | "handleRejectFact"
  | "handleConfirmEpisode"
  | "handleRejectEpisode"
  | "handleConfirmEntity"
  | "handleRejectEntity"
  | "handleConfirmEntityAlias"
  | "handleRejectEntityAlias"
  | "handleMergeEntityAlias"
  | "handleSplitEntityAlias"
>;

export function createMemoryReviewActions(
  set: AnalysisSet,
  get: AnalysisGet,
): MemoryReviewActions {
  return {
    loadFactReviewQueue: async (projectId: string) => {
      set({ factReviewLoading: true, factReviewError: null });
      try {
        const response = await api.memory.getFactReviewQueue({ projectId });
        if (!response.success || !response.data) {
          set({
            factReviewError:
              response.error?.message ?? i18n.t("analysis.review.queue.fact.fetchError"),
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
            episodeReviewError:
              response.error?.message ?? i18n.t("analysis.review.queue.episode.fetchError"),
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
            entityReviewError:
              response.error?.message ?? i18n.t("analysis.review.queue.entity.fetchError"),
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
            entityAliasReviewError:
              response.error?.message ?? i18n.t("analysis.review.queue.alias.fetchError"),
            entityAliasReviewItems: [],
          });
          return;
        }
        set({ entityAliasReviewItems: response.data.items });
      } finally {
        set({ entityAliasReviewLoading: false });
      }
    },

    handleConfirmFact: async (projectId: string, item: AnalysisFactReviewItem) => {
      set({ mutatingFactId: item.id, factReviewError: null });
      try {
        const response = await api.memory.confirmFact({ projectId, factId: item.id });
        if (!response.success || !response.data?.updated) {
          set({
            factReviewError:
              response.error?.message ?? i18n.t("analysis.review.queue.fact.confirmError"),
          });
          return;
        }
        await get().loadFactReviewQueue(projectId);
      } finally {
        set({ mutatingFactId: null });
      }
    },

    handleRejectFact: async (
      projectId: string,
      item: AnalysisFactReviewItem,
      reason: string,
    ) => {
      set({ mutatingFactId: item.id, factReviewError: null });
      try {
        const response = await api.memory.rejectFact({ projectId, factId: item.id, reason });
        if (!response.success || !response.data?.updated) {
          set({
            factReviewError:
              response.error?.message ?? i18n.t("analysis.review.queue.fact.rejectError"),
          });
          return;
        }
        await get().loadFactReviewQueue(projectId);
      } finally {
        set({ mutatingFactId: null });
      }
    },

    handleConfirmEpisode: async (
      projectId: string,
      item: AnalysisEpisodeReviewItem,
    ) => {
      set({ mutatingEpisodeId: item.id, episodeReviewError: null });
      try {
        const response = await api.memory.confirmEpisode({ projectId, episodeId: item.id });
        if (!response.success || !response.data?.updated) {
          set({
            episodeReviewError:
              response.error?.message ?? i18n.t("analysis.review.queue.episode.confirmError"),
          });
          return;
        }
        await get().loadEpisodeReviewQueue(projectId);
      } finally {
        set({ mutatingEpisodeId: null });
      }
    },

    handleRejectEpisode: async (
      projectId: string,
      item: AnalysisEpisodeReviewItem,
      reason: string,
    ) => {
      set({ mutatingEpisodeId: item.id, episodeReviewError: null });
      try {
        const response = await api.memory.rejectEpisode({
          projectId,
          episodeId: item.id,
          reason,
        });
        if (!response.success || !response.data?.updated) {
          set({
            episodeReviewError:
              response.error?.message ?? i18n.t("analysis.review.queue.episode.rejectError"),
          });
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
          set({
            entityReviewError:
              response.error?.message ?? i18n.t("analysis.review.queue.entity.confirmError"),
          });
          return;
        }
        await get().loadEntityReviewQueue(projectId);
      } finally {
        set({ mutatingEntityId: null });
      }
    },

    handleRejectEntity: async (
      projectId: string,
      item: AnalysisEntityReviewItem,
      reason: string,
    ) => {
      set({ mutatingEntityId: item.id, entityReviewError: null });
      try {
        const response = await api.memory.rejectEntity({
          projectId,
          entityId: item.id,
          reason,
        });
        if (!response.success || !response.data?.updated) {
          set({
            entityReviewError:
              response.error?.message ?? i18n.t("analysis.review.queue.entity.rejectError"),
          });
          return;
        }
        await get().loadEntityReviewQueue(projectId);
      } finally {
        set({ mutatingEntityId: null });
      }
    },

    handleConfirmEntityAlias: async (
      projectId: string,
      item: AnalysisEntityAliasReviewItem,
    ) => {
      set({ mutatingAliasId: item.id, entityAliasReviewError: null });
      try {
        const response = await api.memory.confirmEntityAlias({
          projectId,
          aliasId: item.id,
        });
        if (!response.success || !response.data?.updated) {
          set({
            entityAliasReviewError:
              response.error?.message ?? i18n.t("analysis.review.queue.alias.confirmError"),
          });
          return;
        }
        await get().loadEntityAliasReviewQueue(projectId);
      } finally {
        set({ mutatingAliasId: null });
      }
    },

    handleRejectEntityAlias: async (
      projectId: string,
      item: AnalysisEntityAliasReviewItem,
      reason: string,
    ) => {
      set({ mutatingAliasId: item.id, entityAliasReviewError: null });
      try {
        const response = await api.memory.rejectEntityAlias({
          projectId,
          aliasId: item.id,
          reason,
        });
        if (!response.success || !response.data?.updated) {
          set({
            entityAliasReviewError:
              response.error?.message ?? i18n.t("analysis.review.queue.alias.rejectError"),
          });
          return;
        }
        await get().loadEntityAliasReviewQueue(projectId);
      } finally {
        set({ mutatingAliasId: null });
      }
    },

    handleMergeEntityAlias: async (
      projectId: string,
      item: AnalysisEntityAliasReviewItem,
      targetEntityId: string,
    ) => {
      if (!targetEntityId) return;
      set({ mutatingAliasId: item.id, entityAliasReviewError: null });
      try {
        const response = await api.memory.mergeEntity({
          projectId,
          sourceEntityId: item.entityId,
          targetEntityId,
        });
        if (!response.success || !response.data?.updated) {
          set({
            entityAliasReviewError:
              response.error?.message ?? i18n.t("analysis.review.queue.alias.mergeError"),
          });
          return;
        }
        await Promise.all([
          get().loadEntityAliasReviewQueue(projectId),
          get().loadEntityReviewQueue(projectId),
        ]);
      } finally {
        set({ mutatingAliasId: null });
      }
    },

    handleSplitEntityAlias: async (
      projectId: string,
      item: AnalysisEntityAliasReviewItem,
      canonicalName: string,
    ) => {
      if (!canonicalName) return;
      set({ mutatingAliasId: item.id, entityAliasReviewError: null });
      try {
        const response = await api.memory.splitEntityAlias({
          projectId,
          aliasId: item.id,
          canonicalName,
        });
        if (!response.success || !response.data?.updated) {
          set({
            entityAliasReviewError:
              response.error?.message ?? i18n.t("analysis.review.queue.alias.splitError"),
          });
          return;
        }
        await Promise.all([
          get().loadEntityAliasReviewQueue(projectId),
          get().loadEntityReviewQueue(projectId),
        ]);
      } finally {
        set({ mutatingAliasId: null });
      }
    },
  };
}
