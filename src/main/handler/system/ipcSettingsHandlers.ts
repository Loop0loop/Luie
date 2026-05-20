import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import type { EditorSettings } from "../../../shared/types/index.js";
import { registerIpcHandlers } from "../core/ipcRegistrar.js";
import {
  editorSettingsSchema,
  settingsHfTokenSchema,
  settingsLanguageSchema,
  settingsLlmDefaultModelSchema,
  settingsMenuBarModeSchema,
  settingsShortcutsSchema,
  settingsAutoSaveSchema,
  windowBoundsSchema,
} from "../../../shared/schemas/index.js";
import { z } from "zod";
import type { SettingsManager } from "../../manager/settingsManager.js";
import type { LoggerLike } from "../core/types.js";
import { applyApplicationMenu } from "../../lifecycle/menu.js";
import { modelStorageService } from "../../services/llm/modelStorageService.js";

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
      channel: IPC_CHANNELS.SETTINGS_GET_LLM_MODELS,
      logTag: "SETTINGS_GET_LLM_MODELS",
      failMessage: "Failed to get llm model settings",
      handler: async () => modelStorageService.getView(),
    },
    {
      channel: IPC_CHANNELS.SETTINGS_SET_LLM_DEFAULT_MODEL,
      logTag: "SETTINGS_SET_LLM_DEFAULT_MODEL",
      failMessage: "Failed to set llm default model",
      argsSchema: z.tuple([settingsLlmDefaultModelSchema]),
      handler: async (input: { modelPath: string; modelId?: string }) =>
        modelStorageService.setDefaultModel(input),
    },
    {
      channel: IPC_CHANNELS.SETTINGS_SET_LLM_EMBEDDING_MODEL,
      logTag: "SETTINGS_SET_LLM_EMBEDDING_MODEL",
      failMessage: "Failed to set llm embedding model",
      argsSchema: z.tuple([settingsLlmDefaultModelSchema]),
      handler: async (input: { modelPath: string; modelId?: string }) =>
        modelStorageService.setDefaultEmbeddingModel(input),
    },
    {
      channel: IPC_CHANNELS.SETTINGS_SET_LLM_PROVIDER_HINT,
      logTag: "SETTINGS_SET_LLM_PROVIDER_HINT",
      failMessage: "Failed to set llm provider hint",
      argsSchema: z.tuple([z.object({ providerHint: z.enum(["llamacpp", "llamaserver", "none"]) })]),
      handler: async (input: { providerHint: "llamacpp" | "llamaserver" | "none" }) => {
        const settingsManager = await loadSettingsManager();
        settingsManager.setLlmSettings({ llmProviderHint: input.providerHint });
        return { providerHint: input.providerHint };
      },
    },
    {
      channel: IPC_CHANNELS.SETTINGS_SET_PROJECT_LLM,
      logTag: "SETTINGS_SET_PROJECT_LLM",
      failMessage: "Failed to set project llm settings",
      argsSchema: z.tuple([z.object({
        projectId: z.string(),
        modelPath: z.string().nullable().optional(),
        providerHint: z.enum(["llamacpp", "llamaserver", "none"]).nullable().optional(),
      })]),
      handler: async (input: { projectId: string; modelPath?: string | null; providerHint?: "llamacpp" | "llamaserver" | "none" | null }) => {
        const { db } = await import("../../database/index.js");
        const { projectSettings } = await import("../../database/schema.js");
        const store = db.getClient();
        const nowDefaults = {
          autoSave: true,
          autoSaveInterval: 30,
        };
        await store
          .insert(projectSettings)
          .values({
            id: input.projectId,
            projectId: input.projectId,
            ...nowDefaults,
            ...(input.modelPath !== undefined ? { llmModelPath: input.modelPath } : {}),
            ...(input.providerHint !== undefined ? { llmProviderHint: input.providerHint } : {}),
          })
          .onConflictDoUpdate({
            target: [projectSettings.projectId],
            set: {
              ...(input.modelPath !== undefined ? { llmModelPath: input.modelPath } : {}),
              ...(input.providerHint !== undefined ? { llmProviderHint: input.providerHint } : {}),
            },
          });
        logger.info("Project LLM settings upserted", {
          projectId: input.projectId,
          hasModelPath: input.modelPath !== undefined ? Boolean(input.modelPath) : undefined,
          providerHint: input.providerHint,
        });
        return { ok: true };
      },
    },
    {
      channel: IPC_CHANNELS.SETTINGS_SET_LLM_RUNTIME,
      logTag: "SETTINGS_SET_LLM_RUNTIME",
      failMessage: "Failed to set llm runtime settings",
      argsSchema: z.tuple([z.object({
        contextSize: z.number().int().min(512).max(131072).optional(),
        gpuLayers: z.number().int().min(0).max(9999).optional(),
        ragTemperature: z.number().min(0).max(2).optional(),
        ragMaxTokens: z.number().int().min(64).max(8192).optional(),
      })]),
      handler: async (input: { contextSize?: number; gpuLayers?: number; ragTemperature?: number; ragMaxTokens?: number }) => {
        const settingsManager = await loadSettingsManager();
        settingsManager.setLlmSettings({
          ...(input.contextSize !== undefined ? { contextSize: input.contextSize } : {}),
          ...(input.gpuLayers !== undefined ? { gpuLayers: input.gpuLayers } : {}),
          ...(input.ragTemperature !== undefined ? { ragTemperature: input.ragTemperature } : {}),
          ...(input.ragMaxTokens !== undefined ? { ragMaxTokens: input.ragMaxTokens } : {}),
        });
        return { ok: true };
      },
    },
    {
      channel: IPC_CHANNELS.SETTINGS_DOWNLOAD_DEFAULT_LLM_MODEL,
      logTag: "SETTINGS_DOWNLOAD_DEFAULT_LLM_MODEL",
      failMessage: "Failed to download default llm model",
      handler: () => {
        void modelStorageService.downloadDefaultModel().catch((err) => {
          logger.error("Background model download failed", {
            error: err instanceof Error ? err.message : String(err),
          });
        });
        return { started: true };
      },
    },
    {
      channel: IPC_CHANNELS.SETTINGS_DOWNLOAD_DEFAULT_EMBEDDING_MODEL,
      logTag: "SETTINGS_DOWNLOAD_DEFAULT_EMBEDDING_MODEL",
      failMessage: "Failed to download default embedding model",
      handler: () => {
        void modelStorageService.downloadDefaultEmbeddingModel().catch((err) => {
          logger.error("Background embedding model download failed", {
            error: err instanceof Error ? err.message : String(err),
          });
        });
        return { started: true };
      },
    },
    {
      channel: IPC_CHANNELS.SETTINGS_GET_LLM_DOWNLOAD_STATUS,
      logTag: "SETTINGS_GET_LLM_DOWNLOAD_STATUS",
      failMessage: "Failed to get llm download status",
      handler: async () => modelStorageService.getDownloadStatus(),
    },
    {
      channel: IPC_CHANNELS.SETTINGS_SET_HF_TOKEN,
      logTag: "SETTINGS_SET_HF_TOKEN",
      failMessage: "Failed to set huggingface token",
      argsSchema: z.tuple([settingsHfTokenSchema]),
      handler: async (input: { token: string }) => modelStorageService.setHuggingFaceToken(input.token),
    },
    {
      channel: IPC_CHANNELS.SETTINGS_SEARCH_HF_MODELS,
      logTag: "SETTINGS_SEARCH_HF_MODELS",
      failMessage: "Failed to search HuggingFace models",
      argsSchema: z.tuple([z.object({ query: z.string().min(1).max(200) })]),
      handler: async (input: { query: string }) => modelStorageService.searchHfModels(input.query),
    },
    {
      channel: IPC_CHANNELS.SETTINGS_GET_HF_MODEL_FILES,
      logTag: "SETTINGS_GET_HF_MODEL_FILES",
      failMessage: "Failed to get HuggingFace model files",
      argsSchema: z.tuple([z.object({ repoId: z.string().min(1).max(300) })]),
      handler: async (input: { repoId: string }) => modelStorageService.getHfModelFiles(input.repoId),
    },
    {
      channel: IPC_CHANNELS.SETTINGS_DOWNLOAD_HF_MODEL,
      logTag: "SETTINGS_DOWNLOAD_HF_MODEL",
      failMessage: "Failed to start HuggingFace model download",
      argsSchema: z.tuple([z.object({
        repoId: z.string().min(1).max(300),
        filename: z.string().min(1).max(300),
        modelId: z.string().min(1).max(300),
      })]),
      handler: async (input: { repoId: string; filename: string; modelId: string }) => {
        await modelStorageService.downloadHfModel(input.repoId, input.filename, input.modelId);
        return { started: true };
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
