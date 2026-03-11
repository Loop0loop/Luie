import { app } from "electron";
import type { createLogger } from "../../shared/logger/index.js";

type Logger = ReturnType<typeof createLogger>;
const OAUTH_AUTH_PREFIX = "luie://auth/";

const extractAuthCallbackUrl = (argv: string[]): string | null => {
  for (const arg of argv) {
    if (typeof arg === "string" && arg.startsWith(OAUTH_AUTH_PREFIX)) {
      return arg;
    }
  }
  return null;
};

export const registerSingleInstance = (logger: Logger): boolean => {
  const skipSingleInstance = process.env.E2E_DISABLE_SINGLE_INSTANCE === "1";
  const gotTheLock = skipSingleInstance
    ? true
    : app.requestSingleInstanceLock();

  if (!gotTheLock) {
    app.exit(0);
    return false;
  }

  app.on("second-instance", async (_event, argv) => {
    const callbackUrl = extractAuthCallbackUrl(argv);
    logger.info("Second instance event received", {
      hasCallbackUrl: Boolean(callbackUrl),
    });
    if (callbackUrl) {
      const { handleDeepLinkUrl } = await import("./deepLink.js");
      void handleDeepLinkUrl(callbackUrl);
    }

    const { windowManager } = await import("../manager/windowManager.js");
    const mainWindow = windowManager.getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      return;
    }

    const startupWizardWindow = windowManager.getStartupWizardWindow();
    if (startupWizardWindow && !startupWizardWindow.isDestroyed()) {
      startupWizardWindow.focus();
      return;
    }

    windowManager.createMainWindow();
  });

  return true;
};
