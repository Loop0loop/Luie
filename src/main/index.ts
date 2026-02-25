/**
 * Main process entry point
 */

// Load environment variables FIRST before any other imports
// Only load .env in development mode (when VITE_DEV_SERVER_URL is expected)
if (process.env.NODE_ENV !== 'production') {
  await import("dotenv/config");
}

import path from "node:path";
import { createLogger, configureLogger, LogLevel } from "../shared/logger/index.js";
import { LOG_DIR_NAME, LOG_FILE_NAME } from "../shared/constants/index.js";
import { resolveRuntimeTarget } from "../shared/runtime/runtimeTarget.js";
import { startElectrobunShell } from "../electrobun/index.js";
import { initDatabaseEnv } from "./prismaEnv.js";
import { registerAppReady } from "./lifecycle/appReady.js";
import { extractAuthCallbackUrl, handleDeepLinkUrl } from "./lifecycle/deepLink.js";
import { registerShutdownHandlers } from "./lifecycle/shutdown.js";
import { registerSingleInstance } from "./lifecycle/singleInstance.js";
import { settingsManager } from "./manager/settingsManager.js";
import { platformBridge } from "./platform/platformBridge.js";
import { syncService } from "./services/features/syncService.js";

const { app } = platformBridge;

configureLogger({
  logToFile: true,
  logFilePath: path.join(app.getPath("userData"), LOG_DIR_NAME, LOG_FILE_NAME),
  minLevel: LogLevel.INFO,
});

const logger = createLogger("Main");
const runtimeTarget = resolveRuntimeTarget(process.env.LUIE_RUNTIME_TARGET);
logger.info("Main process bootstrap", {
  execPath: process.execPath,
  argv: process.argv,
  isPackaged: app.isPackaged,
  defaultApp: process.defaultApp,
  runtimeTarget,
});

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

const startElectronLifecycle = (): void => {
  registerLuieProtocol();

  if (!registerSingleInstance(logger)) {
    app.quit();
    return;
  }

  syncService.initialize();

  const callbackUrl = extractAuthCallbackUrl(process.argv);
  if (callbackUrl) {
    void handleDeepLinkUrl(callbackUrl);
  }

  registerAppReady(logger);
  registerShutdownHandlers(logger);
};

if (runtimeTarget === "electrobun") {
  startElectrobunShell({
    argv: process.argv,
    lifecycle: {
      registerProtocol: registerLuieProtocol,
      registerSingleInstance: () => registerSingleInstance(logger),
      initializeSync: () => syncService.initialize(),
      registerAppReady: () => registerAppReady(logger),
      registerShutdownHandlers: () => registerShutdownHandlers(logger),
    },
    deepLink: {
      extractAuthCallbackUrl,
      handleDeepLinkUrl,
    },
  });
} else {
  startElectronLifecycle();
}
