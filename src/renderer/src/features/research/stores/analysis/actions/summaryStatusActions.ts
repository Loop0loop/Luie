import { api } from "@shared/api";
import { i18n } from "@renderer/i18n";
import type {
  AnalysisActions,
  AnalysisSet,
} from "../analysisStore.types";

type SummaryStatusActions = Pick<AnalysisActions, "loadNarrativeSummaryStatus">;

export function createSummaryStatusActions(set: AnalysisSet): SummaryStatusActions {
  return {
    loadNarrativeSummaryStatus: async (projectId: string) => {
      set({ narrativeSummaryStatusLoading: true, narrativeSummaryStatusError: null });
      try {
        const response = await api.memory.getNarrativeSummaryStatus(projectId);
        if (!response.success || !response.data) {
          set({
            narrativeSummaryStatusError:
              response.error?.message ?? i18n.t("analysis.review.summary.fetchError"),
            narrativeSummaryStatus: null,
          });
          return;
        }
        set({ narrativeSummaryStatus: response.data });
      } finally {
        set({ narrativeSummaryStatusLoading: false });
      }
    },
  };
}
