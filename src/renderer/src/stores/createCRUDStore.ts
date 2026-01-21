import type { StateCreator } from "zustand";
import type { IPCResponse } from "../../../shared/ipc";

interface BaseItem {
  id: string;
}

export interface CRUDStore<T extends BaseItem, CreateInput, UpdateInput> {
  items: T[];
  currentItem: T | null;
  isLoading: boolean;
  error: string | null;

  loadAll: (parentId?: string) => Promise<void>;
  loadOne: (id: string) => Promise<void>;
  create: (input: CreateInput) => Promise<T | null>;
  update: (input: UpdateInput) => Promise<void>;
  delete: (id: string) => Promise<void>;
  setCurrent: (item: T | null) => void;
}

export type APIClient<T, CreateInput, UpdateInput> = {
  getAll: (parentId?: string) => Promise<IPCResponse<T[]>>;
  get: (id: string) => Promise<IPCResponse<T>>;
  create: (input: CreateInput) => Promise<IPCResponse<T>>;
  update: (input: UpdateInput) => Promise<IPCResponse<T>>;
  delete: (id: string) => Promise<IPCResponse<unknown>>;
};

export function createCRUDSlice<T extends BaseItem, CreateInput, UpdateInput>(
  apiClient: APIClient<T, CreateInput, UpdateInput>,
  name: string,
): StateCreator<CRUDStore<T, CreateInput, UpdateInput>> {
  return (set) => ({
    items: [],
    currentItem: null,
    isLoading: false,
    error: null,

    loadAll: async (parentId?: string) => {
      set({ isLoading: true, error: null });
      try {
        const response = await apiClient.getAll(parentId);
        if (response.success && response.data) {
          set({ items: response.data });
        } else {
          set({ items: [], error: response.error?.message });
        }
      } catch (error) {
        window.api.logger.error(`Failed to load ${name}s:`, error);
        set({ items: [], error: (error as Error).message });
      } finally {
        set({ isLoading: false });
      }
    },

    loadOne: async (id: string) => {
      set({ isLoading: true, error: null });
      try {
        const response = await apiClient.get(id);
        if (response.success && response.data) {
          set({ currentItem: response.data });
        } else {
          set({ currentItem: null, error: response.error?.message });
        }
      } catch (error) {
        window.api.logger.error(`Failed to load ${name}:`, error);
        set({ currentItem: null, error: (error as Error).message });
      } finally {
        set({ isLoading: false });
      }
    },

    create: async (input: CreateInput) => {
      set({ isLoading: true, error: null });
      try {
        const response = await apiClient.create(input);
        if (response.success && response.data) {
          const newItem = response.data;
          set((state) => ({ items: [...state.items, newItem] }));
          return newItem;
        } else {
          set({ error: response.error?.message });
          return null;
        }
      } catch (error) {
        window.api.logger.error(`Failed to create ${name}:`, error);
        set({ error: (error as Error).message });
        return null;
      } finally {
        set({ isLoading: false });
      }
    },

    update: async (input: UpdateInput) => {
      set({ isLoading: true, error: null });
      try {
        const response = await apiClient.update(input);
        if (response.success && response.data) {
          const updatedItem = response.data;
          set((state) => ({
            items: state.items.map((item) =>
              item.id === updatedItem.id ? updatedItem : item,
            ),
            currentItem:
              state.currentItem?.id === updatedItem.id
                ? updatedItem
                : state.currentItem,
          }));
        } else {
          set({ error: response.error?.message });
        }
      } catch (error) {
        window.api.logger.error(`Failed to update ${name}:`, error);
        set({ error: (error as Error).message });
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
        } else {
          set({ error: response.error?.message });
        }
      } catch (error) {
        window.api.logger.error(`Failed to delete ${name}:`, error);
        set({ error: (error as Error).message });
      } finally {
        set({ isLoading: false });
      }
    },

    setCurrent: (item: T | null) => set({ currentItem: item }),
  });
}
