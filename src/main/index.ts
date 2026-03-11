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
import { registerSingleInstance } from "./lifecycle/singleInstance.js";
const isDefaultApp = process.defaultApp === true;
const startupStartedAtMs = Date.now();

const configureMainLogger = () => {
  configureLogger({
    logToFile: true,
    logFilePath: path.join(app.getPath("userData"), LOG_DIR_NAME, LOG_FILE_NAME),
    minLevel: LogLevel.INFO,
  });
  return createLogger("Main");
};

const registerLuieProtocol = async (
  logger: ReturnType<typeof createLogger>,
): Promise<void> => {
  const { settingsManager } = await import("./manager/settingsManager.js");
  const protocol = "luie";
  let registered = false;
  const appEntry = app.getAppPath();
  if (isDefaultApp) {
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
      defaultApp: isDefaultApp,
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
    defaultApp: isDefaultApp,
    appEntry,
  });
};

const bootstrapLogger = createLogger("Main");

if (!registerSingleInstance(bootstrapLogger)) {
  app.exit(0);
} else {
  const logger = configureMainLogger();
  logger.info("Main process bootstrap", {
    execPath: process.execPath,
    argv: process.argv,
    isPackaged: app.isPackaged,
    defaultApp: isDefaultApp,
    startupStartedAtMs,
  });

  const [
    { initDatabaseEnv },
    { registerAppReady },
    { registerCrashReporting },
    { extractAuthCallbackUrl, handleDeepLinkUrl },
    { registerShutdownHandlers },
    { syncService },
  ] = await Promise.all([
    import("./prismaEnv.js"),
    import("./lifecycle/appReady.js"),
    import("./lifecycle/crashReporting.js"),
    import("./lifecycle/deepLink.js"),
    import("./lifecycle/shutdown.js"),
    import("./services/features/sync/syncService.js"),
  ]);

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

  await registerLuieProtocol(logger);

  const callbackUrl = extractAuthCallbackUrl(process.argv);
  if (callbackUrl) {
    void handleDeepLinkUrl(callbackUrl);
  }

  registerAppReady(logger, {
    startupStartedAtMs,
    onFirstRendererReady: () => {
      const syncInitializeStartedAt = Date.now();
      syncService.initialize();
      logger.info("Startup checkpoint: sync service initialized", {
        elapsedMs: Date.now() - syncInitializeStartedAt,
        startupElapsedMs: Date.now() - startupStartedAtMs,
      });
    },
  });
  registerShutdownHandlers(logger);
}
