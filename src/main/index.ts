/**
 * Main process entry point
 */

// Load environment variables FIRST before any other imports
import "dotenv/config";

import { app, BrowserWindow } from "electron";
import path from "node:path";
import { createLogger, configureLogger, LogLevel } from "../shared/logger/index.js";
import { LOG_DIR_NAME, LOG_FILE_NAME } from "../shared/constants/index.js";
import { windowManager } from "./manager/index.js";
import { registerIPCHandlers } from "./handler/index.js";
import { db } from "./database/index.js";
import { autoSaveManager } from "./manager/autoSaveManager.js";

configureLogger({
  logToFile: true,
  logFilePath: path.join(app.getPath("userData"), LOG_DIR_NAME, LOG_FILE_NAME),
  minLevel: LogLevel.INFO,
});

const logger = createLogger("Main");

// Disable GPU acceleration for better stability
app.disableHardwareAcceleration();

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

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
  app.whenReady().then(() => {
    logger.info("App is ready");

    // Register IPC handlers
    registerIPCHandlers();

    // Create main window
    windowManager.createMainWindow();

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
        await autoSaveManager.flushAll();
      } catch (error) {
        logger.error("Failed to flush auto-save", error);
      } finally {
        await db.disconnect();
        app.quit();
      }
    })();
  });

  // Handle uncaught exceptions
  process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception", error);
  });

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection", reason);
  });
}
