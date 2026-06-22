import type { AnalysisStreamChunk } from "@shared/types/analysis.js";
import { api } from "@shared/api";
import { i18n } from "@renderer/i18n";
import type {
  AnalysisActions,
  AnalysisSet,
} from "../analysisStore.types";

type AnalysisRunActions = Pick<
  AnalysisActions,
  "startAnalysis" | "stopAnalysis" | "clearAnalysis" | "addStreamItem"
>;

export function createAnalysisRunActions(set: AnalysisSet): AnalysisRunActions {
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
  };
}
