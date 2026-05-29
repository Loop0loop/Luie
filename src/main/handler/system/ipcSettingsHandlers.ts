import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import type { EditorSettings } from "../../../shared/types/index.js";
import { registerIpcHandlers } from "../core/ipcRegistrar.js";
import {
  editorSettingsSchema,
  settingsLocalLlmSchema,
  settingsLanguageSchema,
  settingsLlmPreferenceSchema,
  settingsOllamaConfigSchema,
  settingsMenuBarModeSchema,
  settingsShortcutsSchema,
  settingsAutoSaveSchema,
  windowBoundsSchema,
} from "../../../shared/schemas/index.js";
import { z } from "zod";
import { BrowserWindow } from "electron";
import type { SettingsManager } from "../../manager/settingsManager.js";
import type { LoggerLike } from "../core/types.js";
import { applyApplicationMenu } from "../../lifecycle/menu.js";
import {
  invalidateModelRuntimeCache,
  resolveRuntimeModelInfo,
} from "../../services/llm/modelRuntimeFactory.js";
import { sidecarManager } from "../../services/llm/sidecarManager.js";
import {
  downloadGguf,
  downloadLlamaServerBinary,
  getHfModelFiles,
  searchHfModels,
} from "../../services/llm/modelDownloader.js";
import { llmfitService } from "../../services/llm/llmfitService.js";
import { llmfitInstaller } from "../../services/llm/llmfitInstaller.js";
import {
  DEFAULT_MODEL,
  LLAMA_BINARY_SHA256S,
  LLAMA_BINARY_URLS,
  LLAMA_SERVER_BINARY_IN_ZIP,
} from "../../services/llm/sidecarConstants.js";

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

let activeDownloadAbort: AbortController | null = null;

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
      handler: async (input: { baseUrl: string; chatModel: string; embeddingModel?: string; apiKey?: string }) => {
        const settingsManager = await loadSettingsManager();
        settingsManager.setLlmSettings({
          ollama: {
            baseUrl: input.baseUrl,
            chatModel: input.chatModel,
            ...(input.embeddingModel ? { embeddingModel: input.embeddingModel } : {}),
            ...(input.apiKey ? { apiKey: input.apiKey } : {}),
          },
        });
        invalidateModelRuntimeCache();
        return { ok: true };
      },
    },
    {
      channel: IPC_CHANNELS.SETTINGS_SET_LLM_PREFERENCE,
      logTag: "SETTINGS_SET_LLM_PREFERENCE",
      failMessage: "Failed to set LLM preference",
      argsSchema: z.tuple([settingsLlmPreferenceSchema]),
      handler: async (input: { provider: "auto" | "sidecar" | "ollama" | "openai" | "gemini" }) => {
        const settingsManager = await loadSettingsManager();
        settingsManager.setLlmSettings({
          preferredProvider: input.provider,
        });
        invalidateModelRuntimeCache();
        return { ok: true };
      },
    },
    {
      channel: IPC_CHANNELS.SETTINGS_GET_LLM_RUNTIME,
      logTag: "SETTINGS_GET_LLM_RUNTIME",
      failMessage: "Failed to resolve LLM runtime",
      handler: async () => await resolveRuntimeModelInfo(),
    },
    {
      channel: IPC_CHANNELS.SETTINGS_GET_LOCAL_LLM,
      logTag: "SETTINGS_GET_LOCAL_LLM",
      failMessage: "Failed to get local LLM settings",
      handler: async () => {
        const settingsManager = await loadSettingsManager();
        const settings = settingsManager.getLocalLlmSettings();
        return {
          ...settings,
          sidecarRunning: sidecarManager.isRunning(),
          sidecarBaseUrl: sidecarManager.getBaseUrl(),
        };
      },
    },
    {
      channel: IPC_CHANNELS.SETTINGS_SET_LOCAL_LLM,
      logTag: "SETTINGS_SET_LOCAL_LLM",
      failMessage: "Failed to save local LLM settings",
      argsSchema: z.tuple([settingsLocalLlmSchema]),
      handler: async (input: {
        enabled: boolean;
        modelPath?: string;
        binaryPath?: string;
        gpuLayers?: number;
        contextSize?: number;
      }) => {
        const settingsManager = await loadSettingsManager();
        settingsManager.setLocalLlmSettings(input);
        invalidateModelRuntimeCache();
        return { ok: true };
      },
    },
    {
      channel: IPC_CHANNELS.SIDECAR_STATUS,
      logTag: "SIDECAR_STATUS",
      failMessage: "Failed to get sidecar status",
      handler: async () => ({
        running: sidecarManager.isRunning(),
        baseUrl: sidecarManager.getBaseUrl(),
      }),
    },
    {
      channel: IPC_CHANNELS.SIDECAR_STOP,
      logTag: "SIDECAR_STOP",
      failMessage: "Failed to stop sidecar",
      handler: async () => {
        await sidecarManager.stop();
        return { ok: true };
      },
    },
    {
      channel: IPC_CHANNELS.MODEL_DOWNLOAD_START,
      logTag: "MODEL_DOWNLOAD_START",
      failMessage: "Failed to start model download",
      argsSchema: z.tuple([z.strictObject({
        type: z.enum(["model", "binary"]),
        repo: z.string().min(1).max(512).optional(),
        filename: z.string().min(1).max(1024).optional(),
      }).refine(
        (value) => Boolean(value.repo) === Boolean(value.filename),
        "repo and filename must be provided together",
      )]),
      handler: async (input: { type: "model" | "binary"; repo?: string; filename?: string }) => {
        activeDownloadAbort?.abort();
        activeDownloadAbort = new AbortController();
        const { signal } = activeDownloadAbort;
        const platform = `${process.platform}-${process.arch}`;
        const binUrl = LLAMA_BINARY_URLS[platform];
        const expectedSha256 = LLAMA_BINARY_SHA256S[platform];
        if (!binUrl || !expectedSha256) throw new Error(`지원하지 않는 플랫폼: ${platform}`);

        const emitProgress = (
          stage: "binary" | "model" | "complete" | "error",
          pct: number,
          error?: string,
        ) => {
          for (const window of BrowserWindow.getAllWindows()) {
            if (!window.isDestroyed()) {
              window.webContents.send(IPC_CHANNELS.MODEL_DOWNLOAD_PROGRESS, { stage, pct, error });
            }
          }
        };

        void (async () => {
          try {
            const settingsManager = await loadSettingsManager();
            const current = settingsManager.getLocalLlmSettings();

            let binaryPath = current?.binaryPath;
            let modelPath = current?.modelPath;

            if (input.type === "binary") {
              binaryPath = await downloadLlamaServerBinary({
                zipUrl: binUrl,
                expectedSha256,
                destDir: sidecarManager.getBinDir(),
                binaryNameInZip: LLAMA_SERVER_BINARY_IN_ZIP,
                signal,
                onProgress: (progress) => emitProgress("binary", progress.pct),
              });
            } else {
              modelPath = await downloadGguf({
                repo: input.repo ?? DEFAULT_MODEL.repo,
                filename: input.filename ?? DEFAULT_MODEL.filename,
                expectedSha256: input.repo || input.filename ? undefined : DEFAULT_MODEL.sha256,
                destDir: sidecarManager.getModelsDir(),
                signal,
                onProgress: (progress) => emitProgress("model", progress.pct),
              });
            }

            settingsManager.setLocalLlmSettings({
              enabled: Boolean(binaryPath && modelPath),
              binaryPath,
              modelPath,
              gpuLayers: current?.gpuLayers,
              contextSize: current?.contextSize,
            });
            invalidateModelRuntimeCache();
            emitProgress("complete", 100);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            emitProgress("error", 0, message);
          } finally {
            activeDownloadAbort = null;
          }
        })();

        return { ok: true };
      },
    },
    {
      channel: IPC_CHANNELS.MODEL_SEARCH_HF,
      logTag: "MODEL_SEARCH_HF",
      failMessage: "HF model search failed",
      argsSchema: z.tuple([z.strictObject({ query: z.string().min(1).max(200) })]),
      handler: async (input: { query: string }) => await searchHfModels(input.query),
    },
    {
      channel: IPC_CHANNELS.MODEL_GET_HF_FILES,
      logTag: "MODEL_GET_HF_FILES",
      failMessage: "HF model files fetch failed",
      argsSchema: z.tuple([z.strictObject({ repoId: z.string().min(1).max(512) })]),
      handler: async (input: { repoId: string }) => await getHfModelFiles(input.repoId),
    },
    {
      channel: IPC_CHANNELS.LLMFIT_GET_RECOMMENDATIONS,
      logTag: "LLMFIT_GET_RECOMMENDATIONS",
      failMessage: "Failed to get llmfit recommendations",
      argsSchema: z.tuple([
        z
          .strictObject({
            limit: z.number().int().min(1).max(50).optional(),
            useCase: z
              .enum([
                "general",
                "coding",
                "reasoning",
                "chat",
                "multimodal",
                "embedding",
              ])
              .optional(),
            minFit: z.enum(["perfect", "good", "marginal", "too_tight"]).optional(),
          })
          .optional(),
      ]),
      // llmfitService 는 실패 시에도 throw 하지 않고 { available:false } 를 반환한다(P6).
      handler: async (
        options?: { limit?: number; useCase?: string; minFit?: string },
      ) => await llmfitService.recommend(options ?? {}),
    },
    {
      channel: IPC_CHANNELS.LLMFIT_INSTALL,
      logTag: "LLMFIT_INSTALL",
      failMessage: "Failed to install llmfit",
      argsSchema: z.tuple([]),
      // 설치기는 실패해도 throw 하지 않고 { installed:false, reason } 을 반환한다(P6/P7).
      handler: async () => await llmfitInstaller.ensureInstalled(),
    },
    {
      channel: IPC_CHANNELS.LLMFIT_STATUS,
      logTag: "LLMFIT_STATUS",
      failMessage: "Failed to get llmfit status",
      argsSchema: z.tuple([]),
      handler: async () => await llmfitInstaller.getStatus(),
    },
    {
      channel: IPC_CHANNELS.MODEL_DOWNLOAD_CANCEL,
      logTag: "MODEL_DOWNLOAD_CANCEL",
      failMessage: "Failed to cancel model download",
      handler: async () => {
        activeDownloadAbort?.abort();
        activeDownloadAbort = null;
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
