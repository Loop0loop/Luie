import type { IpcRendererEvent } from "electron";
import { IPC_CHANNELS } from "../../shared/ipc/channels.js";
import type { RendererApi } from "../../shared/api/index.js";
import type {
  AppBeforeQuitPayload,
  AppQuitPhasePayload,
} from "../../shared/types/index.js";
import type { PreloadApiModuleContext } from "./types.js";

export function createWindowApi({
  autoSave,
  completeAppFlush,
  ipcRenderer,
  safeInvoke,
  safeInvokeCore,
}: PreloadApiModuleContext): Pick<RendererApi, "lifecycle" | "window"> {
  return {
    lifecycle: {
      setDirty: (dirty) => {
        autoSave.setRendererDirty(Boolean(dirty));
      },
      onBeforeQuit: (callback) => {
        const listener = (
          _event: IpcRendererEvent,
          payload: AppBeforeQuitPayload,
        ) => callback(payload);
        ipcRenderer.on(IPC_CHANNELS.APP_BEFORE_QUIT, listener);
        return () => {
          ipcRenderer.removeListener(IPC_CHANNELS.APP_BEFORE_QUIT, listener);
        };
      },
      completeFlush: (requestId) => completeAppFlush(requestId),
      onQuitPhase: (callback) => {
        const listener = (
          _event: IpcRendererEvent,
          payload: AppQuitPhasePayload,
        ) => {
          callback(payload);
        };
        ipcRenderer.on(IPC_CHANNELS.APP_QUIT_PHASE, listener);
        return () => {
          ipcRenderer.removeListener(IPC_CHANNELS.APP_QUIT_PHASE, listener);
        };
      },
    },
    window: {
      maximize: () => safeInvoke(IPC_CHANNELS.WINDOW_MAXIMIZE),
      close: () => safeInvoke(IPC_CHANNELS.WINDOW_CLOSE),
      toggleFullscreen: () => safeInvoke(IPC_CHANNELS.WINDOW_TOGGLE_FULLSCREEN),
      setFullscreen: (flag) =>
        safeInvoke(IPC_CHANNELS.WINDOW_SET_FULLSCREEN, flag),
      setTrafficLightVisibility: (visible) =>
        safeInvoke(IPC_CHANNELS.WINDOW_SET_TRAFFIC_LIGHT_VISIBILITY, visible),
      openExport: (chapterId) =>
        safeInvokeCore(
          "window.openExport",
          IPC_CHANNELS.WINDOW_OPEN_EXPORT,
          chapterId,
        ),
      openWorldGraph: () => safeInvoke(IPC_CHANNELS.WINDOW_OPEN_WORLD_GRAPH),
      setStartupWizardSize: (width, height, animate) =>
        safeInvoke(
          IPC_CHANNELS.WINDOW_SET_STARTUP_WIZARD_SIZE,
          width,
          height,
          animate,
        ),
    },
  };
}
