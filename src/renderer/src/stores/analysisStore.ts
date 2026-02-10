import { create } from "zustand";
import type { AnalysisItem, AnalysisStreamChunk } from "../../../shared/types/analysis.js";

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
      const response = await window.api.analysis.start(chapterId, projectId);

      if (!response.success) {
        let errorMessage = "분석 시작 중 오류가 발생했습니다.";
        
        if (response.error?.code === "API_KEY_MISSING") {
          errorMessage = "Gemini API 키가 설정되지 않았습니다. 환경 변수를 확인해주세요.";
        } else if (response.error?.code === "QUOTA_EXCEEDED") {
          errorMessage = "Gemini API 할당량을 초과했습니다. 잠시 후 다시 시도해주세요.";
        } else if (response.error?.code === "NETWORK_ERROR") {
          errorMessage = "네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.";
        } else if (response.error?.message) {
          errorMessage = response.error.message;
        }

        set({ error: errorMessage, isAnalyzing: false });
        throw new Error(errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
      set({ error: errorMessage, isAnalyzing: false });
      throw error;
    }
  },

  /**
   * 분석 중단
   */
  stopAnalysis: async () => {
    try {
      await window.api.analysis.stop();
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
      await window.api.analysis.clear();
      set({ items: [], isAnalyzing: false, error: null });
    } catch {
      // Error already logged in main process
    }
  },

  /**
   * 스트리밍 아이템 추가
   */
  addStreamItem: (chunk: AnalysisStreamChunk) => {
    console.log("[STORE] addStreamItem called", chunk);
    
    if (chunk.done) {
      console.log("[STORE] Analysis complete");
      set({ isAnalyzing: false });
      return;
    }

    if (chunk.item) {
      console.log("[STORE] Adding item to store", chunk.item);
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
