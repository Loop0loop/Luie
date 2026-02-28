import { app } from "electron";
import { windowManager } from "../../manager/index.js";
import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import { registerIpcHandlers } from "../core/ipcRegistrar.js";
import type { LoggerLike } from "../core/types.js";
import { ServiceError } from "../../utils/serviceError.js";
import { ErrorCode } from "../../../shared/constants/errorCode.js";
import {
  ensureBootstrapReady,
  getBootstrapStatus,
} from "../../lifecycle/bootstrap.js";
import { appUpdateService } from "../../services/features/appUpdateService.js";
import {
  windowOpenExportArgsSchema,
  windowSetFullscreenArgsSchema,
} from "../../../shared/schemas/index.js";

export function registerWindowIPCHandlers(logger: LoggerLike): void {
  registerIpcHandlers(logger, [
    {
      channel: IPC_CHANNELS.WINDOW_CLOSE,
      logTag: "WINDOW_CLOSE",
      failMessage: "Failed to close window",
      handler: () => {
        logger.info("WINDOW_CLOSE requested from renderer");
        const win = windowManager.getMainWindow();
        if (!win) return false;
        win.close();
        return true;
      },
    },
    {
      channel: IPC_CHANNELS.APP_QUIT,
      logTag: "APP_QUIT",
      failMessage: "Failed to quit app",
      handler: () => {
        logger.info("APP_QUIT requested from renderer");
        app.quit();
        return true;
      },
    },
    {
      channel: IPC_CHANNELS.APP_GET_VERSION,
      logTag: "APP_GET_VERSION",
      failMessage: "Failed to get app version",
      handler: () => ({
        version: app.getVersion(),
      }),
    },
    {
      channel: IPC_CHANNELS.APP_CHECK_UPDATE,
      logTag: "APP_CHECK_UPDATE",
      failMessage: "Failed to check app update",
      handler: async () => appUpdateService.checkForUpdate(),
    },
    {
      channel: IPC_CHANNELS.APP_GET_UPDATE_STATE,
      logTag: "APP_GET_UPDATE_STATE",
      failMessage: "Failed to get app update state",
      handler: async () => appUpdateService.getState(),
    },
    {
      channel: IPC_CHANNELS.APP_DOWNLOAD_UPDATE,
      logTag: "APP_DOWNLOAD_UPDATE",
      failMessage: "Failed to download app update",
      handler: async () => appUpdateService.downloadUpdate(),
    },
    {
      channel: IPC_CHANNELS.APP_APPLY_UPDATE,
      logTag: "APP_APPLY_UPDATE",
      failMessage: "Failed to apply app update",
      handler: async () => appUpdateService.applyUpdate(),
    },
    {
      channel: IPC_CHANNELS.APP_ROLLBACK_UPDATE,
      logTag: "APP_ROLLBACK_UPDATE",
      failMessage: "Failed to rollback app update",
      handler: async () => appUpdateService.rollbackUpdate(),
    },
    {
      channel: IPC_CHANNELS.APP_GET_BOOTSTRAP_STATUS,
      logTag: "APP_GET_BOOTSTRAP_STATUS",
      failMessage: "Failed to get bootstrap status",
      handler: () => {
        void ensureBootstrapReady();
        return getBootstrapStatus();
      },
    },
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
        if (process.platform === "darwin") {
          win.setSimpleFullScreen(!win.isSimpleFullScreen());
        } else {
          win.setFullScreen(!win.isFullScreen());
        }
        win.focus();
        return true;
      },
    },
    {
      channel: IPC_CHANNELS.WINDOW_SET_FULLSCREEN,
      logTag: "WINDOW_SET_FULLSCREEN",
      failMessage: "Failed to set fullscreen",
      argsSchema: windowSetFullscreenArgsSchema,
      handler: (flag: boolean) => {
        const win = windowManager.getMainWindow();
        if (!win) return false;
        if (process.platform === "darwin") {
          // macOS: Use simpleFullScreen for "borderless" feel without new space
          win.setSimpleFullScreen(flag);
        } else {
          // Windows/Linux: Standard fullscreen
          win.setFullScreen(flag);
        }
        win.focus();
        return true;
      },
    },
    {
      channel: IPC_CHANNELS.WINDOW_OPEN_EXPORT,
      logTag: "WINDOW_OPEN_EXPORT",
      failMessage: "Failed to open export window",
      argsSchema: windowOpenExportArgsSchema,
      handler: (chapterId: string) => {
        logger.info("WINDOW_OPEN_EXPORT received", { chapterId });

        if (!chapterId) {
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
    {
      channel: IPC_CHANNELS.WINDOW_OPEN_WORLD_GRAPH,
      logTag: "WINDOW_OPEN_WORLD_GRAPH",
      failMessage: "Failed to open world graph window",
      handler: () => {
        logger.info("WINDOW_OPEN_WORLD_GRAPH received");

        logger.info("Creating world graph window");
        windowManager.createWorldGraphWindow();
        logger.info("World graph window created successfully");
        return true;
      },
    },
  ]);
}
