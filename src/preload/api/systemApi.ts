import { IPC_CHANNELS } from "../../shared/ipc/channels.js";
import type { RendererApi } from "../../shared/api/index.js";
import type {
  AppBootstrapStatus,
  AppUpdateState,
  SyncAuthResult,
  SyncStatus,
} from "../../shared/types/index.js";
import type { PreloadApiModuleContext } from "./types.js";

export function createSystemApi({
  ipcRenderer,
  loggerApi,
  safeInvoke,
  safeInvokeCore,
}: PreloadApiModuleContext): Pick<
  RendererApi,
  "app" | "logger" | "settings" | "recovery" | "sync" | "startup" | "analysis"
> {
  return {
    app: {
      getVersion: () => safeInvokeCore("app.getVersion", IPC_CHANNELS.APP_GET_VERSION),
      checkUpdate: () => safeInvokeCore("app.checkUpdate", IPC_CHANNELS.APP_CHECK_UPDATE),
      getUpdateState: () =>
        safeInvokeCore("app.getUpdateState", IPC_CHANNELS.APP_GET_UPDATE_STATE),
      downloadUpdate: () =>
        safeInvokeCore("app.downloadUpdate", IPC_CHANNELS.APP_DOWNLOAD_UPDATE),
      applyUpdate: () => safeInvokeCore("app.applyUpdate", IPC_CHANNELS.APP_APPLY_UPDATE),
      rollbackUpdate: () =>
        safeInvokeCore("app.rollbackUpdate", IPC_CHANNELS.APP_ROLLBACK_UPDATE),
      getBootstrapStatus: () =>
        safeInvokeCore(
          "app.getBootstrapStatus",
          IPC_CHANNELS.APP_GET_BOOTSTRAP_STATUS,
        ),
      onBootstrapStatus: (callback) => {
        const listener = (_event: unknown, status: AppBootstrapStatus) => {
          callback(status);
        };
        ipcRenderer.on(IPC_CHANNELS.APP_BOOTSTRAP_STATUS_CHANGED, listener);
        return () => {
          ipcRenderer.removeListener(IPC_CHANNELS.APP_BOOTSTRAP_STATUS_CHANGED, listener);
        };
      },
      onUpdateState: (callback) => {
        const listener = (_event: unknown, state: AppUpdateState) => {
          callback(state);
        };
        ipcRenderer.on(IPC_CHANNELS.APP_UPDATE_STATE_CHANGED, listener);
        return () => {
          ipcRenderer.removeListener(IPC_CHANNELS.APP_UPDATE_STATE_CHANGED, listener);
        };
      },
      quit: () => safeInvoke(IPC_CHANNELS.APP_QUIT),
    },
    logger: loggerApi,
    settings: {
      getAll: () => safeInvokeCore("settings.getAll", IPC_CHANNELS.SETTINGS_GET_ALL),
      getEditor: () =>
        safeInvokeCore("settings.getEditor", IPC_CHANNELS.SETTINGS_GET_EDITOR),
      setEditor: (settings) =>
        safeInvokeCore("settings.setEditor", IPC_CHANNELS.SETTINGS_SET_EDITOR, settings),
      getAutoSave: () => safeInvoke(IPC_CHANNELS.SETTINGS_GET_AUTO_SAVE),
      setAutoSave: (settings) =>
        safeInvoke(IPC_CHANNELS.SETTINGS_SET_AUTO_SAVE, settings),
      getLanguage: () =>
        safeInvokeCore("settings.getLanguage", IPC_CHANNELS.SETTINGS_GET_LANGUAGE),
      setLanguage: (settings) =>
        safeInvokeCore(
          "settings.setLanguage",
          IPC_CHANNELS.SETTINGS_SET_LANGUAGE,
          settings,
        ),
      getMenuBarMode: () =>
        safeInvokeCore(
          "settings.getMenuBarMode",
          IPC_CHANNELS.SETTINGS_GET_MENU_BAR_MODE,
        ),
      setMenuBarMode: (settings) =>
        safeInvokeCore(
          "settings.setMenuBarMode",
          IPC_CHANNELS.SETTINGS_SET_MENU_BAR_MODE,
          settings,
        ),
      getShortcuts: () =>
        safeInvokeCore(
          "settings.getShortcuts",
          IPC_CHANNELS.SETTINGS_GET_SHORTCUTS,
        ),
      setShortcuts: (settings) =>
        safeInvokeCore(
          "settings.setShortcuts",
          IPC_CHANNELS.SETTINGS_SET_SHORTCUTS,
          settings,
        ),
      getWindowBounds: () =>
        safeInvokeCore(
          "settings.getWindowBounds",
          IPC_CHANNELS.SETTINGS_GET_WINDOW_BOUNDS,
        ),
      setWindowBounds: (bounds) =>
        safeInvokeCore(
          "settings.setWindowBounds",
          IPC_CHANNELS.SETTINGS_SET_WINDOW_BOUNDS,
          bounds,
        ),
      reset: () => safeInvoke(IPC_CHANNELS.SETTINGS_RESET),
    },
    recovery: {
      getStatus: () =>
        safeInvokeCore("recovery.getStatus", IPC_CHANNELS.RECOVERY_DB_STATUS),
      runDb: (options) =>
        safeInvokeCore("recovery.runDb", IPC_CHANNELS.RECOVERY_DB_RUN, options),
    },
    sync: {
      getStatus: () => safeInvokeCore("sync.getStatus", IPC_CHANNELS.SYNC_GET_STATUS),
      connectGoogle: () =>
        safeInvokeCore("sync.connectGoogle", IPC_CHANNELS.SYNC_CONNECT_GOOGLE),
      disconnect: () =>
        safeInvokeCore("sync.disconnect", IPC_CHANNELS.SYNC_DISCONNECT),
      runNow: () => safeInvokeCore("sync.runNow", IPC_CHANNELS.SYNC_RUN_NOW),
      setAutoSync: (settings) =>
        safeInvokeCore("sync.setAutoSync", IPC_CHANNELS.SYNC_SET_AUTO, settings),
      getRuntimeConfig: () =>
        safeInvokeCore(
          "sync.getRuntimeConfig",
          IPC_CHANNELS.SYNC_GET_RUNTIME_CONFIG,
        ),
      setRuntimeConfig: (settings) =>
        safeInvokeCore(
          "sync.setRuntimeConfig",
          IPC_CHANNELS.SYNC_SET_RUNTIME_CONFIG,
          settings,
        ),
      validateRuntimeConfig: (settings) =>
        safeInvokeCore(
          "sync.validateRuntimeConfig",
          IPC_CHANNELS.SYNC_VALIDATE_RUNTIME_CONFIG,
          settings,
        ),
      resolveConflict: (resolution) =>
        safeInvokeCore(
          "sync.resolveConflict",
          IPC_CHANNELS.SYNC_RESOLVE_CONFLICT,
          resolution,
        ),
      onStatusChanged: (callback) => {
        const listener = (_event: unknown, status: SyncStatus) => {
          callback(status);
        };
        ipcRenderer.on(IPC_CHANNELS.SYNC_STATUS_CHANGED, listener);
        return () => {
          ipcRenderer.removeListener(IPC_CHANNELS.SYNC_STATUS_CHANGED, listener);
        };
      },
      onAuthResult: (callback) => {
        const listener = (_event: unknown, result: SyncAuthResult) => {
          callback(result);
        };
        ipcRenderer.on(IPC_CHANNELS.SYNC_AUTH_RESULT, listener);
        return () => {
          ipcRenderer.removeListener(IPC_CHANNELS.SYNC_AUTH_RESULT, listener);
        };
      },
    },
    startup: {
      getReadiness: () =>
        safeInvokeCore("startup.getReadiness", IPC_CHANNELS.STARTUP_GET_READINESS),
      completeWizard: () =>
        safeInvokeCore(
          "startup.completeWizard",
          IPC_CHANNELS.STARTUP_COMPLETE_WIZARD,
        ),
    },
    analysis: {
      start: (chapterId, projectId) =>
        safeInvoke(IPC_CHANNELS.ANALYSIS_START, { chapterId, projectId }),
      stop: () => safeInvoke(IPC_CHANNELS.ANALYSIS_STOP),
      clear: () => safeInvoke(IPC_CHANNELS.ANALYSIS_CLEAR),
      onStream: (callback) => {
        const listener = (_event: unknown, data: unknown) => {
          callback(data);
        };
        ipcRenderer.on(IPC_CHANNELS.ANALYSIS_STREAM, listener);
        return () => {
          ipcRenderer.removeListener(IPC_CHANNELS.ANALYSIS_STREAM, listener);
        };
      },
      onError: (callback) => {
        const listener = (_event: unknown, error: unknown) => {
          callback(error);
        };
        ipcRenderer.on(IPC_CHANNELS.ANALYSIS_ERROR, listener);
        return () => {
          ipcRenderer.removeListener(IPC_CHANNELS.ANALYSIS_ERROR, listener);
        };
      },
    },
  };
}
