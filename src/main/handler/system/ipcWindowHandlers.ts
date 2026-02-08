import { windowManager } from "../../manager/index.js";
import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import { registerIpcHandlers } from "../core/ipcRegistrar.js";
import type { LoggerLike } from "../core/types.js";
import { ServiceError } from "../../utils/serviceError.js";
import { ErrorCode } from "../../../shared/constants/errorCode.js";

export function registerWindowIPCHandlers(logger: LoggerLike): void {
  registerIpcHandlers(logger, [
    {
      channel: IPC_CHANNELS.WINDOW_MAXIMIZE,
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
    },
    {
      channel: IPC_CHANNELS.WINDOW_TOGGLE_FULLSCREEN,
      logTag: "WINDOW_TOGGLE_FULLSCREEN",
      failMessage: "Failed to toggle fullscreen",
      handler: () => {
        const win = windowManager.getMainWindow();
        if (!win) return false;
        win.setFullScreen(!win.isFullScreen());
        win.focus();
        return true;
      },
    },
    {
      channel: IPC_CHANNELS.WINDOW_SET_FULLSCREEN,
      logTag: "WINDOW_SET_FULLSCREEN",
      failMessage: "Failed to set fullscreen",
      handler: (flag: boolean) => {
        const win = windowManager.getMainWindow();
        if (!win) return false;
        if (typeof flag === "boolean") {
          if (process.platform === "darwin") {
            // macOS: Use simpleFullScreen for "borderless" feel without new space
            win.setSimpleFullScreen(flag);
          } else {
            // Windows/Linux: Standard fullscreen
            win.setFullScreen(flag);
          }
          win.focus();
          return true;
        }
        return false;
      },
    },
    {
      channel: IPC_CHANNELS.WINDOW_OPEN_EXPORT,
      logTag: "WINDOW_OPEN_EXPORT",
      failMessage: "Failed to open export window",
      handler: (chapterId: string) => {
        logger.info("WINDOW_OPEN_EXPORT received", { 
          chapterId, 
          type: typeof chapterId,
          isUndefined: chapterId === undefined,
          isNull: chapterId === null,
          isString: typeof chapterId === "string",
        });
        
        if (!chapterId || chapterId === "undefined" || chapterId === "null") {
          logger.error("Invalid chapterId for export", { chapterId, type: typeof chapterId });
          throw new ServiceError(
            ErrorCode.REQUIRED_FIELD_MISSING,
            "Chapter ID is required to open export window",
            { chapterId, receivedType: typeof chapterId },
          );
        }
        
        logger.info("Creating export window", { chapterId });
        windowManager.createExportWindow(chapterId);
        logger.info("Export window created successfully", { chapterId });
        return true;
      },
    },
  ]);
}
