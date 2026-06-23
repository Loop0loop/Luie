import { api } from "@shared/api";
import { i18n } from "@renderer/i18n";
import type {
  AnalysisStaleEvidenceReviewAction,
  AnalysisStaleEvidenceReviewItem,
} from "../../../components/analysisSection/shared/types";
import type {
  AnalysisActions,
  AnalysisGet,
  AnalysisSet,
} from "../analysisStore.types";

type StaleEvidenceActions = Pick<
  AnalysisActions,
  | "loadStaleEvidenceReviewQueue"
  | "handleReviewStaleEvidence"
  | "handleRepairStaleEvidence"
>;

export function createStaleEvidenceActions(
  set: AnalysisSet,
  get: AnalysisGet,
): StaleEvidenceActions {
  return {
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
