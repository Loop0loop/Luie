import { create } from "zustand";
import type {
  CanvasProjection,
  CanvasProjectionRequest,
  CanvasProjectionStatus,
} from "../types/canvasProjection.types";

/**
 * Canvas Projection Store — Derived 데이터의 in-memory 캐시. PRD §10.3.
 *
 * Projection은 (mode, scope) 쌍에 대해 1:1로 캐시한다. cache key는
 * `${mode}::${stableScopeJson}` 형태. cache hit이면 즉시 반환, miss면
 * service에 빌드 요청.
 *
 * persist 안 함 — 새로고침 시 다시 계산. Phase 4에서 main-process
 * SQLite 캐시가 들어오면 이 store는 그 위에서 동작하는 thin wrapper로
 * 좁힌다.
 */

interface CanvasProjectionState {
  /** cacheKey → projection. */
  cache: Map<string, CanvasProjection>;
  /** 현재 active projection의 cache key. UI는 이 키로 cache lookup. */
  activeKey: string | null;
  /** 빌드 진행 중인 cache key 목록 — 중복 빌드 방지. */
  pending: Set<string>;

  setActiveKey: (key: string | null) => void;
  setProjection: (key: string, projection: CanvasProjection) => void;
  setStatus: (
    key: string,
    status: CanvasProjectionStatus,
    error?: string,
  ) => void;
  markPending: (key: string) => void;
  clearPending: (key: string) => void;
  invalidate: (key?: string) => void;
}

/**
 * Cache key 생성. (mode, scope) 동일성이 핵심이라 scope를 안정 정렬한
 * JSON으로 직렬화.
 */
export function buildProjectionCacheKey(
  request: Pick<CanvasProjectionRequest, "mode" | "scope">,
): string {
  return `${request.mode}::${JSON.stringify(request.scope)}`;
}

export const useCanvasProjectionStore = create<CanvasProjectionState>(
  (set) => ({
    cache: new Map(),
    activeKey: null,
    pending: new Set(),

    setActiveKey: (key) => set({ activeKey: key }),
    setProjection: (key, projection) =>
      set((state) => {
        const next = new Map(state.cache);
        next.set(key, projection);
        return { cache: next };
      }),
    setStatus: (key, status, error) =>
      set((state) => {
        const existing = state.cache.get(key);
        if (!existing) return {};
        const next = new Map(state.cache);
        next.set(key, { ...existing, status, error });
        return { cache: next };
      }),
    markPending: (key) =>
      set((state) => {
        const next = new Set(state.pending);
        next.add(key);
        return { pending: next };
      }),
    clearPending: (key) =>
      set((state) => {
        if (!state.pending.has(key)) return {};
        const next = new Set(state.pending);
        next.delete(key);
        return { pending: next };
      }),
    invalidate: (key) =>
      set((state) => {
        if (!key) return { cache: new Map(), pending: new Set() };
        const next = new Map(state.cache);
        next.delete(key);
        const nextPending = new Set(state.pending);
        nextPending.delete(key);
        return { cache: next, pending: nextPending };
      }),
  }),
);

export type { CanvasProjectionState };
