/**
 * Main process entry point
 */

// Load environment variables FIRST before any other imports
// Only load .env in development mode (when VITE_DEV_SERVER_URL is expected)
if (process.env.NODE_ENV !== 'production') {
  await import("dotenv/config");
}

import { app } from "electron";
import path from "node:path";
import { createLogger, configureLogger, LogLevel } from "../shared/logger/index.js";
import { LOG_DIR_NAME, LOG_FILE_NAME } from "../shared/constants/index.js";
import { initDatabaseEnv } from "./prismaEnv.js";
import { registerAppReady } from "./lifecycle/appReady.js";
import { registerCrashReporting } from "./lifecycle/crashReporting.js";
import { extractAuthCallbackUrl, handleDeepLinkUrl } from "./lifecycle/deepLink.js";
import { registerShutdownHandlers } from "./lifecycle/shutdown.js";
import { registerSingleInstance } from "./lifecycle/singleInstance.js";
import { settingsManager } from "./manager/settingsManager.js";
import { syncService } from "./services/features/syncService.js";

configureLogger({
  logToFile: true,
  logFilePath: path.join(app.getPath("userData"), LOG_DIR_NAME, LOG_FILE_NAME),
  minLevel: LogLevel.INFO,
});

const logger = createLogger("Main");
logger.info("Main process bootstrap", {
  execPath: process.execPath,
  argv: process.argv,
  isPackaged: app.isPackaged,
  defaultApp: process.defaultApp,
});

registerCrashReporting(logger);

initDatabaseEnv();

// Disable GPU acceleration for better stability
app.disableHardwareAcceleration();

if (process.platform === "darwin") {
  app.on("open-url", (event, url) => {
    event.preventDefault();
    void handleDeepLinkUrl(url);
  });
}

const registerLuieProtocol = (): void => {
  const protocol = "luie";
  let registered = false;
  if (process.defaultApp) {
    const appEntry = process.argv[1] ? path.resolve(process.argv[1]) : "";
    if (appEntry) {
      registered = app.setAsDefaultProtocolClient(protocol, process.execPath, [appEntry]);
    }
  } else {
    registered = app.setAsDefaultProtocolClient(protocol);
  }

  if (!registered) {
    const reason = "SYNC_PROTOCOL_REGISTRATION_FAILED:luie:setAsDefaultProtocolClient returned false";
    const syncSettings = settingsManager.getSyncSettings();
    if (!syncSettings.connected) {
      settingsManager.setSyncSettings({ lastError: reason });
    }
    logger.warn("Failed to register custom protocol for OAuth callback", {
      protocol,
      defaultApp: process.defaultApp,
      reason,
    });
    return;
  }

  const syncSettings = settingsManager.getSyncSettings();
  if (
    syncSettings.lastError?.startsWith("SYNC_PROTOCOL_REGISTRATION_FAILED:")
  ) {
    settingsManager.setSyncSettings({ lastError: undefined });
  }

  logger.info("Custom protocol registered", {
    protocol,
    defaultApp: process.defaultApp,
  });
};

registerLuieProtocol();

if (!registerSingleInstance(logger)) {
  app.quit();
} else {
  const callbackUrl = extractAuthCallbackUrl(process.argv);
  if (callbackUrl) {
    void handleDeepLinkUrl(callbackUrl);
  }

  syncService.initialize();
  registerAppReady(logger);
  registerShutdownHandlers(logger);
}

