import { z } from "zod";
import { IPC_CHANNELS } from "../../../../shared/ipc/channels.js";
import type { EditorSettings } from "../../../../shared/types/index.js";
import {
  editorSettingsSchema,
  settingsAutoSaveSchema,
  settingsLanguageSchema,
  settingsMenuBarModeSchema,
  settingsSearchOptimizationModeSchema,
  settingsShortcutsSchema,
  windowBoundsSchema,
} from "../../../../shared/schemas/index.js";
import type { IpcHandlerConfig } from "../../core/ipcRegistrar.js";
import { applyApplicationMenu } from "../../../lifecycle/menu/index.js";
import { loadSettingsManager } from "./managerLoader.js";

export function createSettingsCoreHandlers(): IpcHandlerConfig[] {
  return [
    {
      channel: IPC_CHANNELS.SETTINGS_GET_ALL,
      logTag: "SETTINGS_GET_ALL",
      failMessage: "Failed to get settings",
      handler: async () => {
        const settingsManager = await loadSettingsManager();
        return settingsManager.getAllForRenderer();
      },
    },
    {
      channel: IPC_CHANNELS.SETTINGS_GET_EDITOR,
      logTag: "SETTINGS_GET_EDITOR",
      failMessage: "Failed to get editor settings",
      handler: async () => {
        const settingsManager = await loadSettingsManager();
        return settingsManager.getEditorSettings();
      },
    },
    {
      channel: IPC_CHANNELS.SETTINGS_SET_EDITOR,
      logTag: "SETTINGS_SET_EDITOR",
      failMessage: "Failed to set editor settings",
      argsSchema: z.tuple([editorSettingsSchema]),
      handler: async (settings: EditorSettings) => {
        const settingsManager = await loadSettingsManager();
        settingsManager.setEditorSettings(settings);
        const { windowManager } = await import("../../../app/windows/index.js");
        windowManager.applySpellCheckSettingToAllWindows();
        return settingsManager.getEditorSettings();
      },
    },
    {
      channel: IPC_CHANNELS.SETTINGS_GET_AUTO_SAVE,
      logTag: "SETTINGS_GET_AUTO_SAVE",
      failMessage: "Failed to get auto save settings",
      handler: async () => {
        const settingsManager = await loadSettingsManager();
        return {
          enabled: settingsManager.getAutoSaveEnabled(),
          interval: settingsManager.getAutoSaveInterval(),
        };
      },
    },
    {
      channel: IPC_CHANNELS.SETTINGS_SET_AUTO_SAVE,
      logTag: "SETTINGS_SET_AUTO_SAVE",
      failMessage: "Failed to set auto save settings",
      argsSchema: z.tuple([settingsAutoSaveSchema]),
      handler: async (settings: { enabled?: boolean; interval?: number }) => {
        const settingsManager = await loadSettingsManager();
        if (settings.enabled !== undefined) {
          settingsManager.setAutoSaveEnabled(settings.enabled);
        }
        if (settings.interval !== undefined) {
          settingsManager.setAutoSaveInterval(settings.interval);
        }
        return {
          enabled: settingsManager.getAutoSaveEnabled(),
          interval: settingsManager.getAutoSaveInterval(),
        };
      },
    },
    {
      channel: IPC_CHANNELS.SETTINGS_GET_LANGUAGE,
      logTag: "SETTINGS_GET_LANGUAGE",
      failMessage: "Failed to get language setting",
      handler: async () => {
        const settingsManager = await loadSettingsManager();
        return { language: settingsManager.getLanguage() ?? "ko" };
      },
    },
    {
      channel: IPC_CHANNELS.SETTINGS_SET_LANGUAGE,
      logTag: "SETTINGS_SET_LANGUAGE",
      failMessage: "Failed to set language setting",
      argsSchema: z.tuple([settingsLanguageSchema]),
      handler: async (settings: { language: "ko" | "en" | "ja" }) => {
        const settingsManager = await loadSettingsManager();
        settingsManager.setLanguage(settings.language);
        return { language: settingsManager.getLanguage() ?? "ko" };
      },
    },
    {
      channel: IPC_CHANNELS.SETTINGS_GET_MENU_BAR_MODE,
      logTag: "SETTINGS_GET_MENU_BAR_MODE",
      failMessage: "Failed to get menu bar mode",
      handler: async () => {
        const settingsManager = await loadSettingsManager();
        return { mode: settingsManager.getMenuBarMode() };
      },
    },
    {
      channel: IPC_CHANNELS.SETTINGS_SET_MENU_BAR_MODE,
      logTag: "SETTINGS_SET_MENU_BAR_MODE",
      failMessage: "Failed to set menu bar mode",
      argsSchema: z.tuple([settingsMenuBarModeSchema]),
      handler: async (settings: { mode: "hidden" | "visible" }) => {
        const settingsManager = await loadSettingsManager();
        settingsManager.setMenuBarMode(settings.mode);
        applyApplicationMenu(settings.mode);

        const { windowManager } = await import("../../../app/windows/index.js");
        windowManager.applyMenuBarModeToAllWindows();
        return { mode: settingsManager.getMenuBarMode() };
      },
    },
    {
      channel: IPC_CHANNELS.SETTINGS_GET_SEARCH_OPTIMIZATION_MODE,
      logTag: "SETTINGS_GET_SEARCH_OPTIMIZATION_MODE",
      failMessage: "Failed to get RAG search optimization mode",
      handler: async () => {
        const settingsManager = await loadSettingsManager();
        return { mode: settingsManager.getSearchOptimizationMode() };
      },
    },
    {
      channel: IPC_CHANNELS.SETTINGS_SET_SEARCH_OPTIMIZATION_MODE,
      logTag: "SETTINGS_SET_SEARCH_OPTIMIZATION_MODE",
      failMessage: "Failed to set RAG search optimization mode",
      argsSchema: z.tuple([settingsSearchOptimizationModeSchema]),
      handler: async (settings: { mode: "low-end" | "standard" | "high-end" | "quality" }) => {
        const settingsManager = await loadSettingsManager();
        settingsManager.setSearchOptimizationMode(settings.mode);
        return { mode: settingsManager.getSearchOptimizationMode() };
      },
    },
    {
      channel: IPC_CHANNELS.SETTINGS_GET_SHORTCUTS,
      logTag: "SETTINGS_GET_SHORTCUTS",
      failMessage: "Failed to get shortcuts",
      handler: async () => {
        const settingsManager = await loadSettingsManager();
        return settingsManager.getShortcuts();
      },
    },
    {
      channel: IPC_CHANNELS.SETTINGS_SET_SHORTCUTS,
      logTag: "SETTINGS_SET_SHORTCUTS",
      failMessage: "Failed to set shortcuts",
      argsSchema: z.tuple([settingsShortcutsSchema]),
      handler: async (settings: { shortcuts: Record<string, string> }) => {
        const settingsManager = await loadSettingsManager();
        const shortcuts = settingsManager.setShortcuts(settings.shortcuts);
        const defaults = settingsManager.getShortcuts().defaults;
        return { shortcuts, defaults };
      },
    },
    {
      channel: IPC_CHANNELS.SETTINGS_SET_WINDOW_BOUNDS,
      logTag: "SETTINGS_SET_WINDOW_BOUNDS",
      failMessage: "Failed to set window bounds",
      argsSchema: z.tuple([windowBoundsSchema]),
      handler: async (bounds: {
        width: number;
        height: number;
        x: number;
        y: number;
      }) => {
        const settingsManager = await loadSettingsManager();
        settingsManager.setWindowBounds(bounds);
        return bounds;
      },
    },
    {
      channel: IPC_CHANNELS.SETTINGS_GET_WINDOW_BOUNDS,
      logTag: "SETTINGS_GET_WINDOW_BOUNDS",
      failMessage: "Failed to get window bounds",
      handler: async () => {
        const settingsManager = await loadSettingsManager();
        return settingsManager.getWindowBounds();
      },
    },
    {
      channel: IPC_CHANNELS.SETTINGS_RESET,
      logTag: "SETTINGS_RESET",
      failMessage: "Failed to reset settings",
      handler: async () => {
        const settingsManager = await loadSettingsManager();
        settingsManager.resetToDefaults();
        const { windowManager } = await import("../../../app/windows/index.js");
        windowManager.applySpellCheckSettingToAllWindows();
        return settingsManager.getAllForRenderer();
      },
    },
  ];
}
