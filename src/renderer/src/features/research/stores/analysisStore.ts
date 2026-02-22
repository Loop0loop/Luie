import { create } from "zustand";
import type { AnalysisItem, AnalysisStreamChunk } from "@shared/types/analysis.js";
import { api } from "@shared/api";
import { i18n } from "@renderer/i18n";

interface AnalysisStore {
  items: AnalysisItem[];
  isAnalyzing: boolean;
  error: string | null;

  // Actions
  startAnalysis: (chapterId: string, projectId: string) => Promise<void>;
  stopAnalysis: () => Promise<void>;
  clearAnalysis: () => Promise<void>;
  addStreamItem: (chunk: AnalysisStreamChunk) => void;
  setError: (error: string | null) => void;

  // Cleanup
  reset: () => void;
}

export const useAnalysisStore = create<AnalysisStore>((set, _get) => ({
  items: [],
  isAnalyzing: false,
  error: null,

  /**
   * 분석 시작
   */
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

  /**
   * 분석 중단
   */
  stopAnalysis: async () => {
    try {
      await api.analysis.stop();
      set({ isAnalyzing: false });
    } catch {
      // Error already logged in main process
      set({ isAnalyzing: false });
    }
  },

  /**
   * 분석 데이터 삭제 (보안)
   */
  clearAnalysis: async () => {
    try {
      await api.analysis.clear();
      set({ items: [], isAnalyzing: false, error: null });
    } catch {
      // Error already logged in main process
    }
  },

  /**
   * 스트리밍 아이템 추가
   */
  addStreamItem: (chunk: AnalysisStreamChunk) => {
    if (chunk.done) {
      set({ isAnalyzing: false });
      return;
    }

    if (chunk.item) {
      set((state) => ({
        items: [...state.items, chunk.item],
      }));
    }
  },

  /**
   * 에러 설정
   */
  setError: (error: string | null) => {
    set({ error, isAnalyzing: false });
  },

  /**
   * 리셋
   */
  reset: () => {
    set({ items: [], isAnalyzing: false, error: null });
  },
}));
