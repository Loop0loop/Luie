import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import type { EditorSettings } from "../../../shared/types/index.js";
import { registerIpcHandler } from "../core/ipcHandler.js";

type LoggerLike = {
  error: (message: string, data?: unknown) => void;
};

export function registerSettingsIPCHandlers(logger: LoggerLike): void {
  registerIpcHandler({
    logger,
    channel: IPC_CHANNELS.SETTINGS_GET_ALL,
    logTag: "SETTINGS_GET_ALL",
    failMessage: "Failed to get settings",
    handler: async () => {
      const { settingsManager } = await import("../../manager/settingsManager.js");
      return settingsManager.getAll();
    },
  });

  registerIpcHandler({
    logger,
    channel: IPC_CHANNELS.SETTINGS_GET_EDITOR,
    logTag: "SETTINGS_GET_EDITOR",
    failMessage: "Failed to get editor settings",
    handler: async () => {
      const { settingsManager } = await import("../../manager/settingsManager.js");
      return settingsManager.getEditorSettings();
    },
  });

  registerIpcHandler({
    logger,
    channel: IPC_CHANNELS.SETTINGS_SET_EDITOR,
    logTag: "SETTINGS_SET_EDITOR",
    failMessage: "Failed to set editor settings",
    handler: async (settings: EditorSettings) => {
      const { settingsManager } = await import("../../manager/settingsManager.js");
      settingsManager.setEditorSettings(settings);
      return settingsManager.getEditorSettings();
    },
  });

  registerIpcHandler({
    logger,
    channel: IPC_CHANNELS.SETTINGS_GET_AUTO_SAVE,
    logTag: "SETTINGS_GET_AUTO_SAVE",
    failMessage: "Failed to get auto save settings",
    handler: async () => {
      const { settingsManager } = await import("../../manager/settingsManager.js");
      return {
        enabled: settingsManager.getAutoSaveEnabled(),
        interval: settingsManager.getAutoSaveInterval(),
      };
    },
  });

  registerIpcHandler({
    logger,
    channel: IPC_CHANNELS.SETTINGS_SET_AUTO_SAVE,
    logTag: "SETTINGS_SET_AUTO_SAVE",
    failMessage: "Failed to set auto save settings",
    handler: async (settings: { enabled?: boolean; interval?: number }) => {
      const { settingsManager } = await import("../../manager/settingsManager.js");
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
  });

  registerIpcHandler({
    logger,
    channel: IPC_CHANNELS.SETTINGS_SET_WINDOW_BOUNDS,
    logTag: "SETTINGS_SET_WINDOW_BOUNDS",
    failMessage: "Failed to set window bounds",
    handler: async (bounds: { width: number; height: number; x: number; y: number }) => {
      const { settingsManager } = await import("../../manager/settingsManager.js");
      settingsManager.setWindowBounds(bounds);
      return bounds;
    },
  });

  registerIpcHandler({
    logger,
    channel: IPC_CHANNELS.SETTINGS_GET_WINDOW_BOUNDS,
    logTag: "SETTINGS_GET_WINDOW_BOUNDS",
    failMessage: "Failed to get window bounds",
    handler: async () => {
      const { settingsManager } = await import("../../manager/settingsManager.js");
      return settingsManager.getWindowBounds();
    },
  });

  registerIpcHandler({
    logger,
    channel: IPC_CHANNELS.SETTINGS_RESET,
    logTag: "SETTINGS_RESET",
    failMessage: "Failed to reset settings",
    handler: async () => {
      const { settingsManager } = await import("../../manager/settingsManager.js");
      settingsManager.resetToDefaults();
      return settingsManager.getAll();
    },
  });
}
