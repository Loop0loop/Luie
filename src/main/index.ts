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
import { initDatabaseEnv } from "./prismaEnv.js";

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

    // Register IPC handlers (after DB env is set)
    const { registerIPCHandlers } = await import("./handler/index.js");
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
        const { autoSaveManager } = await import("./manager/autoSaveManager.js");
        await Promise.race([
          autoSaveManager.flushAll(),
          new Promise((resolve) => setTimeout(resolve, 3000)),
        ]);
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
