import { api } from "@shared/api";
import { i18n } from "@renderer/i18n";
import type {
  AnalysisConflictItem,
  ConflictReviewFilter,
  MemoryScope,
} from "../../../components/analysisSection/shared/types";
import type {
  AnalysisActions,
  AnalysisSet,
} from "../analysisStore.types";

type ConflictQueueActions = Pick<
  AnalysisActions,
  "loadConflictQueue" | "handleResolveConflict" | "handleDeferConflict"
>;

export function createConflictQueueActions(set: AnalysisSet): ConflictQueueActions {
  return {
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
            conflictQueueError:
              response.error?.message ?? i18n.t("analysis.review.queue.conflict.fetchError"),
            conflictQueueItems: [],
          });
          return;
        }
        set({ conflictQueueItems: response.data.items });
      } finally {
        set({ conflictQueueLoading: false });
      }
    },

    handleResolveConflict: async (
      projectId: string,
      item: AnalysisConflictItem,
      winnerFactId: string,
    ) => {
      set({ resolvingConflictId: item.conflictId, conflictQueueError: null });
      try {
        const response = await api.memory.resolveFactConflict({
          projectId,
          conflictId: item.conflictId,
          winnerFactId,
        });
        if (!response.success || !response.data?.updated) {
          set({
            conflictQueueError:
              response.error?.message ?? i18n.t("analysis.review.queue.conflict.resolveError"),
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
            conflictQueueError:
              response.error?.message ?? i18n.t("analysis.review.queue.conflict.reviewError"),
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
  };
}
