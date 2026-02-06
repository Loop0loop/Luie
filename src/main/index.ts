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

  // Before quit - VS Code–style graceful shutdown
  //
  // Flow:
  //   1. Request renderer to flush its preload autoSave queue → main.triggerSave
  //   2. Write mirrors IMMEDIATELY (crash safety BEFORE dialog)
  //   3. If unsaved changes exist → show 3-button dialog:
  //        [저장 후 종료] | [저장하지 않고 종료] | [취소]
  //   4. Save / Don't Save / Cancel
  //   5. If dialog crashes → mirrors are already on disk → recovered at next startup
  //   6. Disconnect DB and exit
  let isQuitting = false;
  app.on("before-quit", (event) => {
    if (isQuitting) return;
    isQuitting = true;
    event.preventDefault();

    void (async () => {
      logger.info("App is quitting");

      const { autoSaveManager } = await import("./manager/autoSaveManager.js");
      const { snapshotService } = await import("./services/features/snapshotService.js");
      const mainWindow = windowManager.getMainWindow();

      // ── Phase 1: Request renderer to flush its pending IPC queue ──────
      // The renderer's preload has a 300ms debounce queue for autoSave IPC.
      // We need that queue to flush so our main-side pendingSaves is complete.
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
          logger.info("Renderer flush phase completed", { rendererFlushed });
        } catch (error) {
          logger.warn("Renderer flush request failed", error);
        }
      }

      // ── Phase 2: Write mirrors IMMEDIATELY (crash safety net) ─────────
      // Even if the dialog below crashes or the app is killed, mirrors
      // on disk ensure recovery at next startup via flushMirrorsToSnapshots.
      try {
        const { mirrored } = await autoSaveManager.flushCritical();
        logger.info("Pre-dialog mirror flush completed", { mirrored });
      } catch (error) {
        logger.error("Pre-dialog mirror flush failed", error);
      }

      // ── Phase 3: VS Code–style confirmation dialog ────────────────────
      const pendingCount = autoSaveManager.getPendingSaveCount();

      if (pendingCount > 0 && mainWindow && !mainWindow.isDestroyed()) {
        try {
          // 0 = 저장 후 종료, 1 = 저장하지 않고 종료, 2 = 취소
          const response = await dialog.showMessageBox(mainWindow, {
            type: "question",
            title: "저장되지 않은 변경사항",
            message: `${pendingCount}개의 변경사항이 저장되지 않았습니다.`,
            detail: "저장하지 않으면 변경사항이 손실될 수 있습니다.",
            buttons: ["저장 후 종료", "저장하지 않고 종료", "취소"],
            defaultId: 0,
            cancelId: 2,
            noLink: true,
          });

          if (response.response === 2) {
            // ─ Cancel: user wants to keep editing
            logger.info("Quit cancelled by user");
            isQuitting = false;
            return;
          }

          if (response.response === 0) {
            // ─ Save & Quit: flush all pending to DB + create snapshots
            logger.info("User chose: save and quit");
            try {
              await Promise.race([
                autoSaveManager.flushAll(),
                new Promise((resolve) => setTimeout(resolve, QUIT_SAVE_TIMEOUT_MS)),
              ]);
              await autoSaveManager.flushMirrorsToSnapshots("session-end");
            } catch (error) {
              logger.error("Save during quit failed", error);
              // Mirrors were already written in Phase 2, so content is safe
            }
          } else {
            // ─ Don't Save: still convert mirrors to snapshot as safety net
            logger.info("User chose: quit without saving (mirrors already on disk)");
            try {
              await autoSaveManager.flushMirrorsToSnapshots("session-end-no-save");
            } catch (error) {
              logger.warn("Mirror-to-snapshot conversion failed", error);
            }
          }
        } catch (dialogError) {
          // Dialog crashed or couldn't show → mirrors are already saved.
          // Fall through to exit. Mirrors will be recovered at next startup.
          logger.error("Quit dialog failed; exiting with mirrors on disk", dialogError);
        }
      } else {
        // No pending saves → clean exit, just do housekeeping
        try {
          await autoSaveManager.flushMirrorsToSnapshots("session-end");
        } catch (error) {
          logger.warn("Session-end mirror flush failed", error);
        }
      }

      // ── Phase 4: Prune old snapshots (Time Machine housekeeper) ───────
      try {
        await snapshotService.pruneSnapshotsAllProjects();
      } catch (error) {
        logger.warn("Snapshot pruning failed during quit", error);
      }

      // ── Phase 5: Disconnect and exit ──────────────────────────────────
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
