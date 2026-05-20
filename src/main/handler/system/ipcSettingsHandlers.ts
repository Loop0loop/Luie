import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import type { EditorSettings } from "../../../shared/types/index.js";
import { registerIpcHandlers } from "../core/ipcRegistrar.js";
import {
  editorSettingsSchema,
  settingsLanguageSchema,
  settingsOllamaConfigSchema,
  settingsMenuBarModeSchema,
  settingsShortcutsSchema,
  settingsAutoSaveSchema,
  windowBoundsSchema,
} from "../../../shared/schemas/index.js";
import { z } from "zod";
import type { SettingsManager } from "../../manager/settingsManager.js";
import type { LoggerLike } from "../core/types.js";
import { applyApplicationMenu } from "../../lifecycle/menu.js";
import { invalidateModelRuntimeCache } from "../../services/llm/modelRuntimeFactory.js";

const loadSettingsManager = (() => {
  let cached: Promise<{ settingsManager: SettingsManager }> | null = null;
  return async () => {
    if (!cached) {
      cached = import("../../manager/settingsManager.js") as Promise<{
        settingsManager: SettingsManager;
      }>;
    }
    const module = await cached;
    return module.settingsManager;
  };
})();

export function registerSettingsIPCHandlers(logger: LoggerLike): void {
  registerIpcHandlers(logger, [
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
        const { windowManager } = await import("../../manager/windowManager.js");
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

        const { windowManager } = await import("../../manager/windowManager.js");
        windowManager.applyMenuBarModeToAllWindows();
        return { mode: settingsManager.getMenuBarMode() };
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
      channel: IPC_CHANNELS.SETTINGS_SET_WINDOW_BOUNDS,
      logTag: "SETTINGS_SET_WINDOW_BOUNDS",
      failMessage: "Failed to set window bounds",
      argsSchema: z.tuple([windowBoundsSchema]),
      handler: async (bounds: { width: number; height: number; x: number; y: number }) => {
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
      channel: IPC_CHANNELS.SETTINGS_SET_OLLAMA_CONFIG,
      logTag: "SETTINGS_SET_OLLAMA_CONFIG",
      failMessage: "Failed to set Ollama config",
      argsSchema: z.tuple([settingsOllamaConfigSchema]),
      handler: async (input: { baseUrl: string; chatModel: string; embeddingModel?: string }) => {
        const settingsManager = await loadSettingsManager();
        settingsManager.setLlmSettings({
          ollama: {
            baseUrl: input.baseUrl,
            chatModel: input.chatModel,
            ...(input.embeddingModel ? { embeddingModel: input.embeddingModel } : {}),
          },
        });
        invalidateModelRuntimeCache();
        return { ok: true };
      },
    },
    {
      channel: IPC_CHANNELS.SETTINGS_LIST_OLLAMA_MODELS,
      logTag: "SETTINGS_LIST_OLLAMA_MODELS",
      failMessage: "Failed to list Ollama models",
      argsSchema: z.tuple([z.string().min(1)]),
      handler: async (baseUrl: string) => {
        const res = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/models`, {
          signal: AbortSignal.timeout(3000),
        });
        if (!res.ok) return [];
        const data = await res.json() as { models?: Array<{ id: string }>; data?: Array<{ id: string }> };
        return data.models?.map((m) => m.id) ?? data.data?.map((m) => m.id) ?? [];
      },
    },
    {
      channel: IPC_CHANNELS.SETTINGS_TEST_OLLAMA_CONNECTION,
      logTag: "SETTINGS_TEST_OLLAMA_CONNECTION",
      failMessage: "Failed to test Ollama connection",
      argsSchema: z.tuple([z.string().min(1)]),
      handler: async (baseUrl: string) => {
        try {
          const res = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/models`, {
            signal: AbortSignal.timeout(3000),
          });
          return { ok: res.ok };
        } catch {
          return { ok: false };
        }
      },
    },
    {
      channel: IPC_CHANNELS.SETTINGS_RESET,
      logTag: "SETTINGS_RESET",
      failMessage: "Failed to reset settings",
      handler: async () => {
        const settingsManager = await loadSettingsManager();
        settingsManager.resetToDefaults();
        const { windowManager } = await import("../../manager/windowManager.js");
        windowManager.applySpellCheckSettingToAllWindows();
        return settingsManager.getAllForRenderer();
      },
    },
  ]);
}
