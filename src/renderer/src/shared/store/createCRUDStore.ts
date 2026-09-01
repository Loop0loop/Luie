import type { StateCreator } from "zustand";
import type { IPCResponse } from "@shared/ipc";
import { api } from "@shared/api";

interface BaseItem {
  id: string;
}

export interface CRUDStore<T extends BaseItem, CreateInput, UpdateInput> {
  items: T[];
  currentItem: T | null;
  isLoading: boolean;
  error: string | null;

  loadAll: (parentId?: string) => Promise<void>;
  ensureLoaded: (parentId?: string) => Promise<void>;
  loadOne: (id: string) => Promise<void>;
  create: (input: CreateInput) => Promise<T | null>;
  update: (input: UpdateInput) => Promise<T | null>;
  delete: (id: string) => Promise<boolean>;
  setCurrent: (item: T | null) => void;
}

export type APIClient<T, CreateInput, UpdateInput> = {
  getAll: (parentId?: string) => Promise<IPCResponse<T[]>>;
  get: (id: string) => Promise<IPCResponse<T>>;
  create: (input: CreateInput) => Promise<IPCResponse<T>>;
  update: (input: UpdateInput) => Promise<IPCResponse<T>>;
  delete: (id: string) => Promise<IPCResponse<unknown>>;
};

export type APIClientWithRequiredGetAll<T, CreateInput, UpdateInput> = Omit<
  APIClient<T, CreateInput, UpdateInput>,
  "getAll"
> & {
  getAll: (parentId: string) => Promise<IPCResponse<T[]>>;
};

export function withProjectScopedGetAll<T, CreateInput, UpdateInput>(
  apiClient: APIClient<T, CreateInput, UpdateInput>,
): APIClient<T, CreateInput, UpdateInput>;
export function withProjectScopedGetAll<T, CreateInput, UpdateInput>(
  apiClient: APIClientWithRequiredGetAll<T, CreateInput, UpdateInput>,
): APIClient<T, CreateInput, UpdateInput>;
export function withProjectScopedGetAll<T, CreateInput, UpdateInput>(
  apiClient:
    | APIClient<T, CreateInput, UpdateInput>
    | APIClientWithRequiredGetAll<T, CreateInput, UpdateInput>,
): APIClient<T, CreateInput, UpdateInput> {
  return {
    ...apiClient,
    getAll: (parentId?: string) => apiClient.getAll(parentId || ""),
  };
}

export function createAliasSetter<
  TStore extends { items: TItem[]; currentItem: TItem | null },
  TItem,
>(
  set: (
    partial: Partial<TStore> | ((state: TStore) => Partial<TStore>),
  ) => void,
  aliasItemsKey: keyof TStore,
  aliasCurrentKey: keyof TStore,
) {
  return (partial: Partial<TStore> | ((state: TStore) => Partial<TStore>)) =>
    set((state: TStore) => {
      const next = typeof partial === "function" ? partial(state) : partial;
      const hasNextItems = Object.prototype.hasOwnProperty.call(next, "items");
      const hasNextCurrent = Object.prototype.hasOwnProperty.call(
        next,
        "currentItem",
      );
      const nextItems =
        hasNextItems && next.items !== undefined ? next.items : state.items;
      const nextCurrent = hasNextCurrent
        ? (next.currentItem as TItem | null)
        : state.currentItem;

      return {
        ...next,
        [aliasItemsKey]: nextItems,
        [aliasCurrentKey]: nextCurrent,
      } as Partial<TStore>;
    });
}

export function createCRUDSlice<T extends BaseItem, CreateInput, UpdateInput>(
  apiClient: APIClient<T, CreateInput, UpdateInput>,
  name: string,
): StateCreator<CRUDStore<T, CreateInput, UpdateInput>> {
  const createInFlight = new Set<string>();
  let loadAllRequestId = 0;
  let loadOneRequestId = 0;
  // 마지막으로 성공한 loadAll의 프로젝트 스코프. null은 "아직 아무 것도 로드한 적 없음/실패함".
  let loadedScope: string | null = null;
  let inFlightEnsure: { scope: string; promise: Promise<void> } | null = null;

  const getCreateLockKey = (input: CreateInput): string => {
    if (input && typeof input === "object" && "projectId" in input) {
      const projectId = (input as { projectId?: unknown }).projectId;
      if (typeof projectId === "string" && projectId.length > 0) {
        return projectId;
      }
    }
    return "__global__";
  };

  return (set, get) => ({
    items: [],
    currentItem: null,
    isLoading: false,
    error: null,

    loadAll: async (parentId?: string) => {
      // 위저드 프리뷰 프로젝트일 때는 백엔드 IPC 조회를 하지 않고 인메모리 시딩 데이터를 보존한다.
      if (parentId === "wizard-preview-project") {
        set({ isLoading: false, error: null });
        return;
      }

      const requestId = ++loadAllRequestId;
      set({ isLoading: true, error: null });
      try {
        const response = await apiClient.getAll(parentId);
        if (requestId !== loadAllRequestId) {
          return;
        }
        if (response.success && response.data) {
          loadedScope = parentId ?? "";
          set({ items: response.data });
        } else {
          // 실패한 스코프는 캐시에서 제외한다. 그래야 다음 ensureLoaded가 재시도한다.
          loadedScope = null;
          set({ items: [], error: response.error?.message });
        }
      } catch (error) {
        if (requestId !== loadAllRequestId) {
          return;
        }
        loadedScope = null;
        api.logger.error(`Failed to load ${name}s:`, error);
        set({ items: [], error: (error as Error).message });
      } finally {
        if (requestId === loadAllRequestId) {
          set({ isLoading: false });
        }
      }
    },

    ensureLoaded: async (parentId?: string) => {
      // 위저드 프리뷰는 loadAll과 동일하게 인메모리 시딩 데이터를 보존한다.
      if (parentId === "wizard-preview-project") {
        set({ isLoading: false, error: null });
        return;
      }
      const scope = parentId ?? "";
      // 같은 프로젝트 스코프를 성공적으로 로드한 적이 있으면 IPC 없이 재사용한다.
      // 패널/사이드바가 열릴 때마다 전체 목록을 다시 가져오는 워터폴을 끊는 용도이며,
      // create/update/delete는 items를 증분 갱신하므로 캐시가 DB 스냅샷보다 최신이다.
      // 프로젝트 전환/복원/임포트처럼 외부 쓰기 가능성이 있는 흐름은 계속 loadAll을
      // 통과하므로(재조회 신호) 그 경로의 신선도 요건은 그대로 유지된다.
      if (loadedScope === scope) {
        return;
      }
      if (inFlightEnsure && inFlightEnsure.scope === scope) {
        return inFlightEnsure.promise;
      }
      const promise = get()
        .loadAll(parentId)
        .finally(() => {
          if (inFlightEnsure?.scope === scope) {
            inFlightEnsure = null;
          }
        });
      inFlightEnsure = { scope, promise };
      return promise;
    },

    loadOne: async (id: string) => {
      // 위저드 프리뷰 엔티티인 경우 백엔드 IPC 호출 없이 인메모리 항목을 즉시 currentItem으로 세팅
      if (id.startsWith("wizard-preview-")) {
        const existing = get().items.find((item) => item.id === id);
        if (existing) {
          set({ currentItem: existing, isLoading: false, error: null });
          return;
        }
      }

      const requestId = ++loadOneRequestId;
      set({ isLoading: true, error: null });
      try {
        const response = await apiClient.get(id);
        if (requestId !== loadOneRequestId) {
          return;
        }
        if (response.success && response.data) {
          set({ currentItem: response.data });
        } else {
          set({ currentItem: null, error: response.error?.message });
        }
      } catch (error) {
        if (requestId !== loadOneRequestId) {
          return;
        }
        api.logger.error(`Failed to load ${name}:`, error);
        set({ currentItem: null, error: (error as Error).message });
      } finally {
        if (requestId === loadOneRequestId) {
          set({ isLoading: false });
        }
      }
    },

    create: async (input: CreateInput) => {
      const lockKey = getCreateLockKey(input);
      if (createInFlight.has(lockKey)) {
        const message = `Failed to create ${name}: another create request is already in flight.`;
        set({ error: message });
        api.logger.warn(message);
        return null;
      }
      createInFlight.add(lockKey);
      set({ isLoading: true, error: null });
      try {
        const response = await apiClient.create(input);
        if (response.success && response.data) {
          const newItem = response.data;
          set((state) => ({ items: [...state.items, newItem] }));
          return newItem;
        }
        set({ error: response.error?.message });
        return null;
      } catch (error) {
        api.logger.error(`Failed to create ${name}:`, error);
        set({ error: (error as Error).message });
        return null;
      } finally {
        createInFlight.delete(lockKey);
        set({ isLoading: false });
      }
    },

    update: async (input: UpdateInput) => {
      set({ isLoading: true, error: null });
      try {
        const response = await apiClient.update(input);
        if (response.success && response.data) {
          const updatedItem = response.data;
          set((state) => {
            const existingItem = state.items.find(
              (item) => item.id === updatedItem.id,
            );
            const existingCurrent = state.currentItem;
            const inputHasContent = Object.prototype.hasOwnProperty.call(
              input,
              "content",
            );
            const existingHasContent =
              existingItem && "content" in existingItem;
            const updatedHasContent = "content" in updatedItem;
            const needsContentMerge =
              !inputHasContent &&
              existingHasContent &&
              updatedHasContent &&
              existingItem;

            type ItemWithContent = { content: unknown };
            const existingContent = existingItem
              ? (existingItem as unknown as ItemWithContent).content
              : undefined;
            const existingCurrentContent = existingCurrent
              ? (existingCurrent as unknown as ItemWithContent).content
              : undefined;

            const mergedItem: T = needsContentMerge
              ? {
                  ...updatedItem,
                  content: existingContent,
                }
              : updatedItem;

            const mergedCurrent: T =
              existingCurrent?.id === updatedItem.id && needsContentMerge
                ? {
                    ...updatedItem,
                    content: existingCurrentContent,
                  }
                : updatedItem;

            return {
              items: state.items.map((item) =>
                item.id === mergedItem.id ? mergedItem : item,
              ),
              currentItem:
                state.currentItem?.id === mergedCurrent.id
                  ? mergedCurrent
                  : state.currentItem,
            };
          });
          return updatedItem;
        } else {
          set({ error: response.error?.message });
          return null;
        }
      } catch (error) {
        api.logger.error(`Failed to update ${name}:`, error);
        set({ error: (error as Error).message });
        return null;
      } finally {
        set({ isLoading: false });
      }
    },

    delete: async (id: string) => {
      set({ isLoading: true, error: null });
      try {
        const response = await apiClient.delete(id);
        if (response.success) {
          set((state) => ({
            items: state.items.filter((item) => item.id !== id),
            currentItem:
              state.currentItem?.id === id ? null : state.currentItem,
          }));
          return true;
        } else {
          set({ error: response.error?.message });
          return false;
        }
      } catch (error) {
        api.logger.error(`Failed to delete ${name}:`, error);
        set({ error: (error as Error).message });
        return false;
      } finally {
        set({ isLoading: false });
      }
    },

    setCurrent: (item: T | null) => set({ currentItem: item }),
  });
}
