import type { IpcRendererEvent } from "electron";
import { IPC_CHANNELS } from "../../shared/ipc/channels.js";
import type { RendererApi } from "../../shared/api/index.js";
import type { AppQuitPhasePayload } from "../../shared/types/index.js";
import type { PreloadApiModuleContext } from "./types.js";

export function createWindowApi({
  autoSave,
  ipcRenderer,
  safeInvoke,
  safeInvokeCore,
}: PreloadApiModuleContext): Pick<RendererApi, "lifecycle" | "window"> {
  return {
    lifecycle: {
      setDirty: (dirty) => {
        autoSave.setRendererDirty(Boolean(dirty));
      },
      onQuitPhase: (callback) => {
        const listener = (_event: IpcRendererEvent, payload: AppQuitPhasePayload) => {
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
      setFullscreen: (flag) => safeInvoke(IPC_CHANNELS.WINDOW_SET_FULLSCREEN, flag),
      openExport: (chapterId) =>
        safeInvokeCore("window.openExport", IPC_CHANNELS.WINDOW_OPEN_EXPORT, chapterId),
      hapticFeedback: () => safeInvoke(IPC_CHANNELS.WORLD_GRAPH_HAPTIC_FEEDBACK),
      openWorldGraph: () => safeInvoke(IPC_CHANNELS.WINDOW_OPEN_WORLD_GRAPH),
    },
  };
}
