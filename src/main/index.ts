/**
 * Main process entry point
 */

// Load environment variables FIRST before any other imports
// Only load .env in development mode (when VITE_DEV_SERVER_URL is expected)
if (process.env.NODE_ENV !== 'production') {
  await import("dotenv/config");
}

import { app, BrowserWindow, session, ipcMain, dialog } from "electron";
import path from "node:path";
import { createLogger, configureLogger, LogLevel } from "../shared/logger/index.js";
import { LOG_DIR_NAME, LOG_FILE_NAME, QUIT_RENDERER_FLUSH_TIMEOUT_MS, QUIT_SAVE_TIMEOUT_MS } from "../shared/constants/index.js";
import { windowManager } from "./manager/index.js";
import { initDatabaseEnv } from "./prismaEnv.js";
import { isDevEnv } from "./utils/environment.js";
import { IPC_CHANNELS } from "../shared/ipc/channels.js";

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

    // Background recovery + pruning (Time Machine-style)
    try {
      const { autoSaveManager } = await import("./manager/autoSaveManager.js");
      await autoSaveManager.flushMirrorsToSnapshots("startup-recovery");
      const { snapshotService } = await import("./services/features/snapshotService.js");
      void snapshotService.pruneSnapshotsAllProjects();
    } catch (error) {
      logger.warn("Snapshot recovery/pruning skipped", error);
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

  // Before quit - graceful shutdown with safety dialog
  //
  // Flow:
  //   1. Request renderer to flush its IPC autoSave queue
  //   2. Wait for flush response (or timeout)
  //   3. Main-side: flushCritical (mirrors) → flushAll (DB) → flushMirrors → prune
  //   4. If save failed, show confirmation dialog before quitting
  //   5. Disconnect DB and exit
  let isQuitting = false;
  app.on("before-quit", (event) => {
    if (isQuitting) return;
    isQuitting = true;
    event.preventDefault();

    void (async () => {
      logger.info("App is quitting");

      // ── Phase 1: Request renderer to flush its pending IPC queue ──
      const mainWindow = windowManager.getMainWindow();
      if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
        try {
          const rendererFlushed = await new Promise<boolean>((resolve) => {
            const timeout = setTimeout(() => resolve(false), QUIT_RENDERER_FLUSH_TIMEOUT_MS);
            ipcMain.once(IPC_CHANNELS.APP_FLUSH_COMPLETE, () => {
              clearTimeout(timeout);
              resolve(true);
            });
            mainWindow.webContents.send(IPC_CHANNELS.APP_BEFORE_QUIT);
          });
          logger.info("Renderer flush completed", { rendererFlushed });
        } catch (error) {
          logger.warn("Renderer flush request failed", error);
        }
      }

      // ── Phase 2: Main-side saves ──
      let saveFailed = false;
      let pendingCount = 0;
      try {
        const { autoSaveManager } = await import("./manager/autoSaveManager.js");
        pendingCount = autoSaveManager.getPendingSaveCount();

        // Write mirrors for all pending content (fast, most critical)
        await autoSaveManager.flushCritical();

        // Attempt DB saves (with timeout to prevent hanging)
        await Promise.race([
          autoSaveManager.flushAll(),
          new Promise((resolve) => setTimeout(resolve, QUIT_SAVE_TIMEOUT_MS)),
        ]);

        // Convert any remaining mirrors to DB snapshots
        await autoSaveManager.flushMirrorsToSnapshots("session-end");

        // Prune old snapshots (Time Machine style)
        const { snapshotService } = await import("./services/features/snapshotService.js");
        await snapshotService.pruneSnapshotsAllProjects();
      } catch (error) {
        logger.error("Failed to flush auto-save during quit", error);
        saveFailed = true;
      }

      // ── Phase 3: Safety dialog if save failed ──
      if (saveFailed && mainWindow && !mainWindow.isDestroyed()) {
        try {
          const response = await dialog.showMessageBox(mainWindow, {
            type: "warning",
            title: "저장 실패",
            message: `${pendingCount}개의 변경사항을 저장하지 못했습니다.`,
            detail:
              "미러 파일에 백업이 저장되었을 수 있습니다.\n" +
              "다음 앱 실행 시 자동 복구를 시도합니다.\n\n" +
              "그래도 종료하시겠습니까?",
            buttons: ["종료", "취소"],
            defaultId: 1,
            cancelId: 1,
          });

          if (response.response === 1) {
            // User chose to cancel quit
            isQuitting = false;
            return;
          }
        } catch (dialogError) {
          logger.warn("Failed to show quit confirmation dialog", dialogError);
        }
      }

      // ── Phase 4: Disconnect and exit ──
      try {
        const { db } = await import("./database/index.js");
        await db.disconnect();
      } catch (error) {
        logger.warn("DB disconnect failed during quit", error);
      }
      app.exit(0);
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
