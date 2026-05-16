import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";
import {
  CANVAS_SURFACE_CONFIG,
  clampCanvasSurfaceWidth,
  getCanvasSurfaceDefaultWidth,
  type CanvasSurfaceId,
} from "../shared/canvasSizing";

/**
 * Canvas Layout Store — 3-pane 폭/접힘 상태.
 *
 *   activityWidth  : ActivityBar 폭(px). IconBar는 PanelGroup 바깥에 있어
 *                    이 값에 포함하지 않는다.
 *   binderWidth    : Binder 폭(px).
 *   isActivityCollapsed / isBinderCollapsed : 접힘 여부.
 *   hasHydrated    : persist 복원 완료. 레이아웃이 깜빡이지 않게 사용.
 *
 * 사이즈 키는 `canvas.activity` / `canvas.binder` 두 개. canvasSizing 모듈이
 * single source of truth.
 */

const ACTIVITY: CanvasSurfaceId = "canvas.activity";
const BINDER: CanvasSurfaceId = "canvas.binder";

interface CanvasLayoutState {
  activityWidth: number;
  binderWidth: number;
  isActivityCollapsed: boolean;
  isBinderCollapsed: boolean;
  hasHydrated: boolean;

  setActivityWidth: (width: number) => void;
  setBinderWidth: (width: number) => void;
  toggleActivity: () => void;
  toggleBinder: () => void;
  setActivityCollapsed: (collapsed: boolean) => void;
  setBinderCollapsed: (collapsed: boolean) => void;
}

const STORAGE_KEY = "canvas_layout_v1";
/**
 * 스키마 버전.
 * v1 → v2: sidebar/binder 키가 activity/binder로 명명 변경되고, default
 * 폭이 줄어들었다(binder 320 → 280). v1 payload는 무시하고 default로
 * 떨어뜨려 사용자가 새 default 폭을 그대로 보게 한다.
 */
const SCHEMA_VERSION = 2;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  Boolean(v) && typeof v === "object" && !Array.isArray(v);

const sanitizePersistedState = (
  input: unknown,
): Partial<CanvasLayoutState> => {
  if (!isRecord(input)) return {};
  const out: Partial<CanvasLayoutState> = {};
  if (
    typeof input.activityWidth === "number" &&
    Number.isFinite(input.activityWidth)
  ) {
    out.activityWidth = clampCanvasSurfaceWidth(ACTIVITY, input.activityWidth);
  }
  if (
    typeof input.binderWidth === "number" &&
    Number.isFinite(input.binderWidth)
  ) {
    out.binderWidth = clampCanvasSurfaceWidth(BINDER, input.binderWidth);
  }
  if (typeof input.isActivityCollapsed === "boolean") {
    out.isActivityCollapsed = input.isActivityCollapsed;
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
      activityWidth: getCanvasSurfaceDefaultWidth(ACTIVITY),
      binderWidth: getCanvasSurfaceDefaultWidth(BINDER),
      isActivityCollapsed: false,
      isBinderCollapsed: false,
      hasHydrated: false,

      setActivityWidth: (width) =>
        set({ activityWidth: clampCanvasSurfaceWidth(ACTIVITY, width) }),
      setBinderWidth: (width) =>
        set({ binderWidth: clampCanvasSurfaceWidth(BINDER, width) }),
      toggleActivity: () =>
        set((state) => ({ isActivityCollapsed: !state.isActivityCollapsed })),
      toggleBinder: () =>
        set((state) => ({ isBinderCollapsed: !state.isBinderCollapsed })),
      setActivityCollapsed: (collapsed) =>
        set({ isActivityCollapsed: collapsed }),
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
        activityWidth: state.activityWidth,
        binderWidth: state.binderWidth,
        isActivityCollapsed: state.isActivityCollapsed,
        isBinderCollapsed: state.isBinderCollapsed,
      }),
      migrate: (persistedState, version) => {
        // v1 이전 payload는 키 명명/default가 달라 호환되지 않는다.
        // 빈 객체로 떨어뜨려 default 값을 그대로 사용.
        if (version < SCHEMA_VERSION) return {};
        return sanitizePersistedState(persistedState);
      },
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

/** Canvas surface key 외부 참조용 상수. */
export const CANVAS_SURFACE = {
  activity: ACTIVITY,
  binder: BINDER,
} as const;

/**
 * `useCanvasLayoutStore` 사용 가능한 surface 검증.
 * `CANVAS_SURFACE_CONFIG`에 등록된 키만 허용.
 */
export const isKnownCanvasSurface = (id: string): id is CanvasSurfaceId =>
  id in CANVAS_SURFACE_CONFIG;

export type { CanvasLayoutState };
