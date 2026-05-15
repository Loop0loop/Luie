import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";
import {
  clampSidebarWidth,
  getSidebarDefaultWidth,
} from "@shared/constants/sidebarSizing";

/**
 * Canvas Layout Store — 3-pane 폭/접힘 상태.
 *
 *   sidebarWidth   : ActivityBar 폭(px). IconBar는 고정 폭이라 이 값에 포함 안 됨.
 *   binderWidth    : binderBar 폭(px).
 *   *Collapsed     : 접힘 여부 (PanelGroup이 0px로 축소).
 *   hasHydrated    : persist 복원 완료 신호. 레이아웃이 깜빡이지 않게 사용.
 *
 * 다른 feature(EventManager 등)는 워크스페이스 `useUIStore.sidebarWidths` +
 * `useProjectLayoutStore`에 dual persist한다. 캔버스도 같은 패턴을 쓰면
 * 좋지만, 캔버스는 "프로젝트별이 아니라 사용자 글로벌 기본값" 성격이 강해
 * 자체 store에 로컬 persist만 둔다 (Phase 1 종료 후 필요해지면 dual로 승격).
 */

const SIDEBAR_FEATURE = "canvasSidebar" as const;
const BINDER_FEATURE = "canvasBinder" as const;

interface CanvasLayoutState {
  sidebarWidth: number;
  binderWidth: number;
  isSidebarCollapsed: boolean;
  isBinderCollapsed: boolean;
  hasHydrated: boolean;

  setSidebarWidth: (width: number) => void;
  setBinderWidth: (width: number) => void;
  toggleSidebar: () => void;
  toggleBinder: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setBinderCollapsed: (collapsed: boolean) => void;
}

const STORAGE_KEY = "canvas_layout_v1";
const SCHEMA_VERSION = 1;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  Boolean(v) && typeof v === "object" && !Array.isArray(v);

const sanitizePersistedState = (
  input: unknown,
): Partial<CanvasLayoutState> => {
  if (!isRecord(input)) return {};
  const out: Partial<CanvasLayoutState> = {};
  if (typeof input.sidebarWidth === "number" && Number.isFinite(input.sidebarWidth)) {
    out.sidebarWidth = clampSidebarWidth(SIDEBAR_FEATURE, input.sidebarWidth);
  }
  if (typeof input.binderWidth === "number" && Number.isFinite(input.binderWidth)) {
    out.binderWidth = clampSidebarWidth(BINDER_FEATURE, input.binderWidth);
  }
  if (typeof input.isSidebarCollapsed === "boolean") {
    out.isSidebarCollapsed = input.isSidebarCollapsed;
  }
  if (typeof input.isBinderCollapsed === "boolean") {
    out.isBinderCollapsed = input.isBinderCollapsed;
  }
  return out;
};

const createNoopStorage = (): StateStorage => ({
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
});

export const useCanvasLayoutStore = create<CanvasLayoutState>()(
  persist(
    (set) => ({
      sidebarWidth: getSidebarDefaultWidth(SIDEBAR_FEATURE),
      binderWidth: getSidebarDefaultWidth(BINDER_FEATURE),
      isSidebarCollapsed: false,
      isBinderCollapsed: false,
      hasHydrated: false,

      setSidebarWidth: (width) =>
        set({ sidebarWidth: clampSidebarWidth(SIDEBAR_FEATURE, width) }),
      setBinderWidth: (width) =>
        set({ binderWidth: clampSidebarWidth(BINDER_FEATURE, width) }),
      toggleSidebar: () =>
        set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      toggleBinder: () =>
        set((state) => ({ isBinderCollapsed: !state.isBinderCollapsed })),
      setSidebarCollapsed: (collapsed) =>
        set({ isSidebarCollapsed: collapsed }),
      setBinderCollapsed: (collapsed) => set({ isBinderCollapsed: collapsed }),
    }),
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() =>
        typeof localStorage === "undefined"
          ? createNoopStorage()
          : localStorage,
      ),
      partialize: (state) => ({
        sidebarWidth: state.sidebarWidth,
        binderWidth: state.binderWidth,
        isSidebarCollapsed: state.isSidebarCollapsed,
        isBinderCollapsed: state.isBinderCollapsed,
      }),
      migrate: (persistedState) => sanitizePersistedState(persistedState),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...sanitizePersistedState(persistedState),
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hasHydrated = true;
      },
    },
  ),
);

/** sidebar/binder feature key를 외부에서 참조할 때 쓰는 상수. */
export const CANVAS_LAYOUT_FEATURES = {
  sidebar: SIDEBAR_FEATURE,
  binder: BINDER_FEATURE,
} as const;

export type { CanvasLayoutState };
