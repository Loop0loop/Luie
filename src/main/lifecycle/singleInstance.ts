import { app } from "electron";
import { windowManager } from "../manager/index.js";
import type { createLogger } from "../../shared/logger/index.js";
import { extractAuthCallbackUrl, handleDeepLinkUrl } from "./deepLink.js";

type Logger = ReturnType<typeof createLogger>;

export const registerSingleInstance = (logger: Logger): boolean => {
  const skipSingleInstance = process.env.E2E_DISABLE_SINGLE_INSTANCE === "1";
  const gotTheLock = skipSingleInstance
    ? true
    : app.requestSingleInstanceLock();

  if (!gotTheLock) {
    const callbackUrl = extractAuthCallbackUrl(process.argv);
    logger.info("Secondary instance detected; forwarding to primary instance and exiting", {
      hasCallbackUrl: Boolean(callbackUrl),
      argv: process.argv,
    });
    app.quit();
    return false;
  }

  app.on("second-instance", (_event, argv) => {
    const callbackUrl = extractAuthCallbackUrl(argv);
    logger.info("Second instance event received", {
      hasCallbackUrl: Boolean(callbackUrl),
    });
    if (callbackUrl) {
      void handleDeepLinkUrl(callbackUrl);
    }

    const mainWindow = windowManager.getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  return true;
};
