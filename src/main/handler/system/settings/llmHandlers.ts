import { z } from "zod";
import { IPC_CHANNELS } from "../../../../shared/ipc/channels.js";
import {
  settingsLlmKeysSchema,
  settingsLlmPreferenceSchema,
  settingsLocalLlmSchema,
  settingsOllamaConfigSchema,
} from "../../../../shared/schemas/index.js";
import type { IpcHandlerConfig } from "../../core/ipcRegistrar.js";
import {
  invalidateModelRuntimeCache,
  resolveRuntimeModelInfo,
  sidecarManager,
} from "../../../domains/settings/llm.js";
import { loadSettingsManager } from "./managerLoader.js";

export function createSettingsLlmHandlers(): IpcHandlerConfig[] {
  return [
    {
      channel: IPC_CHANNELS.SETTINGS_SET_OLLAMA_CONFIG,
      logTag: "SETTINGS_SET_OLLAMA_CONFIG",
      failMessage: "Failed to set Ollama config",
      argsSchema: z.tuple([settingsOllamaConfigSchema]),
      handler: async (input: {
        baseUrl: string;
        chatModel: string;
        embeddingModel?: string;
        apiKey?: string;
      }) => {
        const settingsManager = await loadSettingsManager();
        settingsManager.setLlmSettings({
          ollama: {
            baseUrl: input.baseUrl,
            chatModel: input.chatModel,
            ...(input.embeddingModel
              ? { embeddingModel: input.embeddingModel }
              : {}),
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
      handler: async (input: {
        provider: "auto" | "sidecar" | "ollama" | "openai" | "gemini";
      }) => {
        const settingsManager = await loadSettingsManager();
        settingsManager.setLlmSettings({
          preferredProvider: input.provider,
        });
        invalidateModelRuntimeCache();
        return { ok: true };
      },
    },
    {
      channel: IPC_CHANNELS.SETTINGS_SET_LLM_KEYS,
      logTag: "SETTINGS_SET_LLM_KEYS",
      failMessage: "Failed to set LLM keys",
      argsSchema: z.tuple([settingsLlmKeysSchema]),
      handler: async (input: {
        openaiApiKey: string;
        geminiApiKey: string;
      }) => {
        const settingsManager = await loadSettingsManager();
        settingsManager.setLlmSettings({
          openaiApiKey: input.openaiApiKey,
          geminiApiKey: input.geminiApiKey,
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
      handler: async () => await sidecarManager.getStatus(),
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
      channel: IPC_CHANNELS.SETTINGS_LIST_OLLAMA_MODELS,
      logTag: "SETTINGS_LIST_OLLAMA_MODELS",
      failMessage: "Failed to list Ollama models",
      argsSchema: z.tuple([z.string().min(1)]),
      handler: async (baseUrl: string) => {
        const res = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/models`, {
          signal: AbortSignal.timeout(3000),
        });
        if (!res.ok) return [];
        const data = (await res.json()) as {
          models?: Array<{ id: string }>;
          data?: Array<{ id: string }>;
        };
        return data.models?.map((model) => model.id) ??
          data.data?.map((model) => model.id) ??
          [];
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
  ];
}
