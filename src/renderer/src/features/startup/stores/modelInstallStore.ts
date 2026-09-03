import { create } from "zustand";
import { api } from "@shared/api";

export type ModelInstallPhase =
  /** 설치 완료(또는 아직 확인 전) — UI 노출 없음. */
  | "idle"
  /** 미설치 — 위저드 모델 단계에서 다운로드 CTA를 노출한다. */
  | "needsDownload"
  | "downloading"
  | "complete"
  | "error";

type ModelInstallState = {
  phase: ModelInstallPhase;
  pct: number;
  error: string | null;
  /** 완료/오류 안내를 사용자가 닫았는지. */
  dismissed: boolean;
  /**
   * 상태 복원 + 진행률 이벤트 구독. 위저드→메인 창 전환처럼 컴포넌트가
   * 다시 마운트될 때마다 호출해도 같은 다운로드 상태를 이어 받는다.
   */
  initialize: () => Promise<void>;
  startDownload: () => void;
  restartApp: () => void;
  dismiss: () => void;
};

let unsubscribe: (() => void) | null = null;

export const useModelInstallStore = create<ModelInstallState>((set, get) => ({
  phase: "idle",
  pct: 0,
  error: null,
  dismissed: false,

  initialize: async () => {
    // NOTE: App의 부분 api mock(dom 테스트)에서도 깨지지 않게 옵셔널로 접근한다.
    if (unsubscribe === null) {
      const off = api.settings?.onEmbeddingModelDownloadProgress?.((progress) => {
        if (progress.stage === "downloading") {
          set({ phase: "downloading", pct: progress.pct });
        } else if (progress.stage === "complete") {
          set({ phase: "complete", pct: 100, dismissed: false });
        } else {
          set({ phase: "error", error: progress.error ?? null });
        }
      });
      unsubscribe = typeof off === "function" ? off : () => undefined;
    }

    try {
      const response = await api.settings?.getEmbeddingModelStatus?.();
      if (!response?.success || !response.data) return;
      // NOTE: 상태 조회 동안 사용자가 다운로드를 시작했으면 그 상태를 존중한다.
      if (get().phase === "downloading") return;
      const status = response.data;
      if (status.installed) {
        set({ phase: "idle", pct: 100 });
      } else if (status.downloading) {
        set({ phase: "downloading", pct: status.progressPct ?? 0 });
      } else {
        set({ phase: "needsDownload" });
      }
    } catch {
      // 상태 조회 실패는 UI 노출 생략으로 충분하다.
    }
  },

  startDownload: () => {
    set({ phase: "downloading", pct: 0, error: null, dismissed: false });
    void api.settings?.downloadEmbeddingModel?.();
  },

  restartApp: () => {
    void api.app?.relaunch?.();
  },

  dismiss: () => {
    set({ dismissed: true });
  },
}));
