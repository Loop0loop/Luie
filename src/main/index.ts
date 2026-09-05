// NOTE: dotenv은 Electron import보다 먼저 실행해야 하며 패키징 환경은 process.env만 사용할 수 있다.
try {
  await import("dotenv/config");
} catch {
  // NOTE: 패키징 환경은 런타임에서 주입된 process.env만으로 계속 실행한다.
}

import { app } from "electron";
import path from "node:path";
import {
  createLogger,
  configureLogger,
  LogLevel,
} from "../shared/logger/index.js";
import { LOG_DIR_NAME, LOG_FILE_NAME } from "../shared/constants/index.js";
import { registerSingleInstance } from "./lifecycle/index.js";
const isDefaultApp = process.defaultApp === true;
const startupStartedAtMs = Date.now();

const configureMainLogger = () => {
  configureLogger({
    logToFile: true,
    logFilePath: path.join(
      app.getPath("userData"),
      LOG_DIR_NAME,
      LOG_FILE_NAME,
    ),
    minLevel: LogLevel.INFO,
  });
  return createLogger("Main");
};
const registerLuieProtocol = async (
  logger: ReturnType<typeof createLogger>,
): Promise<void> => {
  const { settingsManager } = await import("./domains/settings/index.js");
  const protocol = "luie";
  let registered = false;
  const appEntry = app.getAppPath();
  if (isDefaultApp) {
    if (appEntry) {
      registered = app.setAsDefaultProtocolClient(protocol, process.execPath, [
        appEntry,
      ]);
    }
  } else {
    registered = app.setAsDefaultProtocolClient(protocol);
  }

  if (!registered) {
    const reason =
      "SYNC_PROTOCOL_REGISTRATION_FAILED:luie:setAsDefaultProtocolClient returned false";
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
const isSyncDisabledForRuntime =
  process.env.LUIE_DISABLE_SYNC === "1" ||
  process.env.LUIE_E2E_STRESS_MODE === "1";

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
    import("./lifecycle/index.js"),
    import("./lifecycle/index.js"),
    import("./lifecycle/index.js"),
    import("./lifecycle/index.js"),
    import("./domains/sync/index.js"),
  ]);

  registerCrashReporting(logger);

  initDatabaseEnv();

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
      if (isSyncDisabledForRuntime) {
        logger.info("Startup checkpoint: sync service initialization skipped", {
          reason: "runtime-flag",
        });
        return;
      }
      const syncInitializeStartedAt = Date.now();
      syncService.initialize();
      logger.info("Startup checkpoint: sync service initialized", {
        elapsedMs: Date.now() - syncInitializeStartedAt,
        startupElapsedMs: Date.now() - startupStartedAtMs,
      });
    },
  });

  // NOTE: 유틸리티 프로세스는 whenReady에서 즉시 fork하지 않는다. embed/RAG/텍스트
  // 생성 요청 시점에 lazy로 시작한다(bridge의 각 메서드가 start()를 보장) — 임베딩
  // 모델이나 LLM을 쓰지 않는 부팅에서 fork+헬스체크 비용과 프로세스 상주를 없앤다.
  registerShutdownHandlers(logger);
}
