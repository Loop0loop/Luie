import { app } from "electron";
import { windowManager } from "../manager/index.js";
import { createLogger } from "../../shared/logger/index.js";

type Logger = ReturnType<typeof createLogger>;

export const registerSingleInstance = (logger: Logger): boolean => {
  const skipSingleInstance = process.env.E2E_DISABLE_SINGLE_INSTANCE === "1";
  const gotTheLock = skipSingleInstance
    ? true
    : app.requestSingleInstanceLock();

  if (!gotTheLock) {
    logger.warn("Another instance is already running");
    app.quit();
    return false;
  }

  app.on("second-instance", () => {
    const mainWindow = windowManager.getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  return true;
};
