import { create } from "zustand";
import type { ShortcutMap } from "@shared/types";
import { settingsShortcutsSchema } from "@shared/schemas";
import { api } from "@shared/api";

const emptyShortcuts = {} as ShortcutMap;

interface ShortcutStore {
  shortcuts: ShortcutMap;
  defaults: ShortcutMap;
  isLoading: boolean;
  error: string | null;

  loadShortcuts: () => Promise<void>;
  setShortcuts: (next: ShortcutMap) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

export const useShortcutStore = create<ShortcutStore>((set, get) => ({
  shortcuts: emptyShortcuts,
  defaults: emptyShortcuts,
  isLoading: false,
  error: null,

  loadShortcuts: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.settings.getShortcuts();
      if (response.success && response.data) {
        const shortcutsParsed = settingsShortcutsSchema.safeParse({
          shortcuts: response.data.shortcuts,
        });
        const defaultsParsed = settingsShortcutsSchema.safeParse({
          shortcuts: response.data.defaults,
        });

        if (!shortcutsParsed.success || !defaultsParsed.success) {
          await api.logger.warn("Invalid shortcuts payload", {
            shortcuts: shortcutsParsed.success ? undefined : shortcutsParsed.error,
            defaults: defaultsParsed.success ? undefined : defaultsParsed.error,
          });
          set({ error: "Invalid shortcuts payload" });
          return;
        }
        set({
          shortcuts: shortcutsParsed.data.shortcuts as ShortcutMap,
          defaults: defaultsParsed.data.shortcuts as ShortcutMap,
        });
      } else {
        set({ error: response.error?.message ?? "Failed to load shortcuts" });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      set({ isLoading: false });
    }
  },

  setShortcuts: async (next: ShortcutMap) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.settings.setShortcuts({ shortcuts: next });
      if (response.success && response.data) {
        const shortcutsParsed = settingsShortcutsSchema.safeParse({
          shortcuts: response.data.shortcuts,
        });
        const defaultsParsed = settingsShortcutsSchema.safeParse({
          shortcuts: response.data.defaults,
        });

        if (!shortcutsParsed.success || !defaultsParsed.success) {
          await api.logger.warn("Invalid shortcuts payload", {
            shortcuts: shortcutsParsed.success ? undefined : shortcutsParsed.error,
            defaults: defaultsParsed.success ? undefined : defaultsParsed.error,
          });
          set({ error: "Invalid shortcuts payload" });
          return;
        }
        set({
          shortcuts: shortcutsParsed.data.shortcuts as ShortcutMap,
          defaults: defaultsParsed.data.shortcuts as ShortcutMap,
        });
      } else {
        set({ error: response.error?.message ?? "Failed to save shortcuts" });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      set({ isLoading: false });
    }
  },

  resetToDefaults: async () => {
    const defaults = get().defaults;
    if (!defaults || Object.keys(defaults).length === 0) {
      await get().loadShortcuts();
      return;
    }
    await get().setShortcuts(defaults);
  },
}));
