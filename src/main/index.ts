/**
 * Main process entry point
 */

// Load environment variables FIRST before any other imports
// Only load .env in development mode (when VITE_DEV_SERVER_URL is expected)
if (process.env.NODE_ENV !== 'production') {
  await import("dotenv/config");
}

import { app, BrowserWindow, session } from "electron";
import path from "node:path";
import { createLogger, configureLogger, LogLevel } from "../shared/logger/index.js";
import { LOG_DIR_NAME, LOG_FILE_NAME } from "../shared/constants/index.js";
import { windowManager } from "./manager/index.js";
import { initDatabaseEnv } from "./prismaEnv.js";
import { isDevEnv } from "./utils/environment.js";

configureLogger({
  logToFile: true,
  logFilePath: path.join(app.getPath("userData"), LOG_DIR_NAME, LOG_FILE_NAME),
  minLevel: LogLevel.INFO,
});

const logger = createLogger("Main");

initDatabaseEnv();

// Disable GPU acceleration for better stability
app.disableHardwareAcceleration();

// Single instance lock
const skipSingleInstance = process.env.E2E_DISABLE_SINGLE_INSTANCE === "1";
const gotTheLock = skipSingleInstance ? true : app.requestSingleInstanceLock();

if (!gotTheLock) {
  logger.warn("Another instance is already running");
  app.quit();
} else {
  app.on("second-instance", () => {
    const mainWindow = windowManager.getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // App ready
  app.whenReady().then(async () => {
    logger.info("App is ready");

    const isDev = isDevEnv();
    const cspPolicy = isDev
      ? [
        "default-src 'self'",
        "script-src 'self' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        "connect-src 'self' ws://localhost:5173 http://localhost:5173",
      ].join("; ")
      : [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        "connect-src 'self'",
      ].join("; ");

    if (isDev) {
      session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
        callback({
          requestHeaders: {
            ...details.requestHeaders,
            Origin: "http://localhost:5173",
          },
        });
      });
    }

    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      const responseHeaders = {
        ...details.responseHeaders,
        "Content-Security-Policy": [cspPolicy],
      } as Record<string, string[]>;

      if (isDev) {
        responseHeaders["Access-Control-Allow-Origin"] = ["*"];
        responseHeaders["Access-Control-Allow-Headers"] = ["*"];
        responseHeaders["Access-Control-Allow-Methods"] = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];
      }

      callback({ responseHeaders });
    });

    // Renderer process crash handler (using webContents)
    const handleRendererCrash = async (webContents: Electron.WebContents, killed: boolean) => {
      logger.error("Renderer process crashed", { killed, webContentsId: webContents.id });
      
      // Emergency save
      try {
        const { autoSaveManager } = await import("./manager/autoSaveManager.js");
        await autoSaveManager.flushCritical();
        logger.info("Emergency save completed after crash");
      } catch (error) {
        logger.error("Failed to save during crash recovery", error);
      }

      // Show recovery dialog
      const { dialog } = await import("electron");
      const mainWindow = windowManager.getMainWindow();
      
      if (mainWindow && !mainWindow.isDestroyed()) {
        const response = await dialog.showMessageBox(mainWindow, {
          type: "error",
          title: "앱이 예기치 않게 종료되었습니다",
          message: "렌더러 프로세스가 충돌했습니다. 앱을 다시 시작하시겠습니까?",
          buttons: ["다시 시작", "종료"],
          defaultId: 0,
          cancelId: 1,
        });

        if (response.response === 0) {
          // Restart renderer
          windowManager.closeMainWindow();
          setTimeout(() => {
            windowManager.createMainWindow();
          }, 500);
        } else {
          app.quit();
        }
      }
    };

    app.on("web-contents-created", (_, webContents) => {
      webContents.on("render-process-gone", (_, details) => {
        void handleRendererCrash(webContents, details.reason === "killed");
      });
    });

    // Register IPC handlers (after DB env is set)
    const { registerIPCHandlers } = await import("./handler/index.js");
    registerIPCHandlers();

    // Create main window
    windowManager.createMainWindow();

    // Background pruning (Time Machine-style)
    try {
      const { snapshotService } = await import("./services/features/snapshotService.js");
      void snapshotService.pruneSnapshotsAllProjects();
    } catch (error) {
      logger.warn("Snapshot pruning skipped", error);
    }

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        windowManager.createMainWindow();
      }
    });
  });

  // Quit when all windows are closed (except on macOS)
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  // Before quit - cleanup
  let isQuitting = false;
  app.on("before-quit", (event) => {
    if (isQuitting) return;
    isQuitting = true;
    event.preventDefault();

    void (async () => {
      logger.info("App is quitting");
      try {
        const { autoSaveManager } = await import("./manager/autoSaveManager.js");
        await autoSaveManager.flushCritical();
        await Promise.race([
          autoSaveManager.flushAll(),
          new Promise((resolve) => setTimeout(resolve, 10000)),
        ]);

        const { snapshotService } = await import("./services/features/snapshotService.js");
        const { db } = await import("./database/index.js");
        const projects = await db.getClient().project.findMany({
          select: { id: true },
        });

        await Promise.all(
          projects.map((project) =>
            snapshotService.createSnapshot({
              projectId: String(project.id),
              content: JSON.stringify({ timestamp: Date.now(), reason: "session-end" }),
              description: "Session end snapshot",
              type: "AUTO",
            }),
          ),
        );

        await snapshotService.pruneSnapshotsAllProjects();
      } catch (error) {
        logger.error("Failed to flush auto-save", error);
      } finally {
        const { db } = await import("./database/index.js");
        await db.disconnect();
        app.exit(0);
      }
    })();
  });

  process.on("SIGINT", () => {
    logger.info("Received SIGINT");
    app.quit();
  });

  process.on("SIGTERM", () => {
    logger.info("Received SIGTERM");
    app.quit();
  });

  // Handle uncaught exceptions
  process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception", error);
  });

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection", reason);
  });
}
