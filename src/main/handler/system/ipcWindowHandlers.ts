import { windowManager } from "../../manager/index.js";
import { registerIpcHandler } from "../core/ipcHandler.js";

type LoggerLike = {
  error: (message: string, data?: unknown) => void;
};

export function registerWindowIPCHandlers(logger: LoggerLike): void {
  registerIpcHandler({
    logger,
    channel: "window:maximize",
    logTag: "WINDOW_MAXIMIZE",
    failMessage: "Failed to maximize window",
    handler: () => {
      const win = windowManager.getMainWindow();
      if (!win) return false;
      if (!win.isMaximized()) {
        win.maximize();
      }
      win.focus();
      return true;
    },
  });

  registerIpcHandler({
    logger,
    channel: "window:toggle-fullscreen",
    logTag: "WINDOW_TOGGLE_FULLSCREEN",
    failMessage: "Failed to toggle fullscreen",
    handler: () => {
      const win = windowManager.getMainWindow();
      if (!win) return false;
      win.setFullScreen(!win.isFullScreen());
      win.focus();
      return true;
    },
  });
}
