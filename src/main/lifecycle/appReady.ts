import { app, BrowserWindow, session, dialog } from "electron";
import type { WebContents } from "electron";
import { settingsManager, windowManager } from "../manager/index.js";
import { projectService } from "../services/core/projectService.js";
import { snapshotService } from "../services/features/snapshot/snapshotService.js";
import { isDevEnv } from "../utils/environment.js";
import type { createLogger } from "../../shared/logger/index.js";
import { applyApplicationMenu } from "./menu.js";
import { ensureBootstrapReady } from "./bootstrap.js";
import { startupReadinessService } from "../services/features/startupReadinessService.js";

type Logger = ReturnType<typeof createLogger>;

type AppReadyOptions = {
  startupStartedAtMs?: number;
  onFirstRendererReady?: () => void;
};

const STARTUP_MAINTENANCE_DELAY_MS = 1500;
const FIRST_RENDERER_FALLBACK_MS = 8000;

const loadAutoSaveManager = async () =>
  (await import("../manager/autoSaveManager.js")).autoSaveManager;

const buildProdCspPolicy = () =>
  [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "img-src 'self' data: https:",
    "font-src 'self' data: https://cdn.jsdelivr.net",
    "connect-src 'self'",
  ].join("; ");

const buildDevCspPolicy = () =>
  [
    "default-src 'self' http://localhost:5173 ws://localhost:5173",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:5173",
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net http://localhost:5173",
    "img-src 'self' data: blob: https: http://localhost:5173",
    "font-src 'self' data: https://cdn.jsdelivr.net",
    "connect-src 'self' http://localhost:5173 ws://localhost:5173",
    "worker-src 'self' blob:",
  ].join("; ");

const resolveCspPolicy = (isDev: boolean): string | null => {
  if (!isDev) {
    return buildProdCspPolicy();
  }
  return process.env.LUIE_DEV_CSP === "1" ? buildDevCspPolicy() : null;
};

const isFileUrl = (url: string): boolean => url.startsWith("file://");
const isResizeObserverNoise = (message: string): boolean =>
  message.includes(
    "ResizeObserver loop completed with undelivered notifications",
  ) || message.includes("ResizeObserver loop limit exceeded");
const isReactFlowNodeTypesWarning = (message: string): boolean =>
  message.includes(
    "[React Flow]: It looks like you've created a new nodeTypes or edgeTypes object.",
  );

const handleRendererCrash = async (
  logger: Logger,
  webContents: WebContents,
  killed: boolean,
) => {
  logger.error("Renderer process crashed", {
    killed,
    webContentsId: webContents.id,
  });

  try {
    const autoSaveManager = await loadAutoSaveManager();
    await autoSaveManager.flushCritical();
    logger.info("Emergency save completed after crash");
  } catch (error) {
    logger.error("Failed to save during crash recovery", error);
  }

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
      windowManager.closeMainWindow();
      setTimeout(() => {
        windowManager.createMainWindow();
      }, 500);
    } else {
      app.quit();
    }
  }
};

const runDeferredStartupMaintenance = async (logger: Logger): Promise<void> => {
  const startedAt = Date.now();
  const status = await ensureBootstrapReady();
  if (!status.isReady) {
    logger.error("App bootstrap did not complete", status);
    return;
  }

  try {
    const autoSaveManager = await loadAutoSaveManager();
    await autoSaveManager.flushMirrorsToSnapshots("startup-recovery");
    void snapshotService.pruneSnapshotsAllProjects();
    void snapshotService.cleanupOrphanArtifacts("startup");
  } catch (error) {
    logger.warn("Snapshot recovery/pruning skipped", error);
  }

  try {
    await projectService.reconcileProjectPathDuplicates();
  } catch (error) {
    logger.warn("Project path duplicate reconciliation skipped", error);
  }

  try {
    const { entityRelationService } =
      await import("../services/world/entityRelationService.js");
    await entityRelationService.cleanupOrphanRelationsAcrossProjects({
      dryRun: true,
    });
    await entityRelationService.cleanupOrphanRelationsAcrossProjects({
      dryRun: false,
    });
  } catch (error) {
    logger.warn("Entity relation orphan cleanup skipped", error);
  }

  logger.info("Deferred startup maintenance completed", {
    elapsedMs: Date.now() - startedAt,
  });
};

export const registerAppReady = (
  logger: Logger,
  options: AppReadyOptions = {},
): void => {
  const startupStartedAtMs = options.startupStartedAtMs ?? Date.now();

  app.whenReady().then(async () => {
    logger.info("App is ready", {
      startupElapsedMs: Date.now() - startupStartedAtMs,
    });

    const isDev = isDevEnv();
    const cspPolicy = resolveCspPolicy(isDev);

    let rendererReadyForCurrentMainWindow = false;
    let firstRendererStartupHookTriggered = false;
    let startupMaintenanceScheduled = false;
    let fallbackTimer: NodeJS.Timeout | null = null;

    const triggerFirstRendererReady = (reason: string): void => {
      if (!rendererReadyForCurrentMainWindow) {
        rendererReadyForCurrentMainWindow = true;
        windowManager.showMainWindow();
        logger.info("Startup checkpoint: renderer ready", {
          reason,
          startupElapsedMs: Date.now() - startupStartedAtMs,
        });
        logger.info("Startup checkpoint: main window shown", {
          reason,
          startupElapsedMs: Date.now() - startupStartedAtMs,
        });
      }

      if (firstRendererStartupHookTriggered || !options.onFirstRendererReady) {
        return;
      }

      firstRendererStartupHookTriggered = true;
      windowManager.showMainWindow();
      try {
        options.onFirstRendererReady();
      } catch (error) {
        logger.warn("Startup hook failed: onFirstRendererReady", error);
      }
    };

    const scheduleStartupMaintenance = (reason: string): void => {
      if (startupMaintenanceScheduled) return;
      startupMaintenanceScheduled = true;
      logger.info("Deferred startup maintenance scheduled", {
        reason,
        delayMs: STARTUP_MAINTENANCE_DELAY_MS,
      });
      setTimeout(() => {
        void runDeferredStartupMaintenance(logger);
      }, STARTUP_MAINTENANCE_DELAY_MS);
    };

    const startMainWindowFlow = (reason: string): void => {
      const existingMainWindow = windowManager.getMainWindow();
      if (existingMainWindow && !existingMainWindow.isDestroyed()) {
        if (!existingMainWindow.isVisible()) {
          windowManager.showMainWindow();
        }
        return;
      }

      rendererReadyForCurrentMainWindow = false;

      logger.info("Starting main window flow", {
        reason,
        startupElapsedMs: Date.now() - startupStartedAtMs,
      });

      windowManager.createMainWindow({ deferShow: true });
      logger.info("Startup checkpoint: main window requested", {
        startupElapsedMs: Date.now() - startupStartedAtMs,
      });

      const bootstrapStartedAt = Date.now();
      void ensureBootstrapReady()
        .then((status) => {
          logger.info("Startup checkpoint: bootstrap ready", {
            isReady: status.isReady,
            bootstrapElapsedMs: Date.now() - bootstrapStartedAt,
            startupElapsedMs: Date.now() - startupStartedAtMs,
          });

          if (!status.isReady) {
            logger.error("App bootstrap did not complete", status);
          }
        })
        .catch((error) => {
          logger.error("App bootstrap did not complete", error);
        });

      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
      }
      fallbackTimer = setTimeout(() => {
        if (!rendererReadyForCurrentMainWindow) {
          triggerFirstRendererReady("fallback-timeout");
        }
        scheduleStartupMaintenance("fallback-timeout");
      }, FIRST_RENDERER_FALLBACK_MS);
    };

    if (isDev) {
      session.defaultSession.webRequest.onBeforeSendHeaders(
        (details, callback) => {
          callback({
            requestHeaders: {
              ...details.requestHeaders,
              Origin: "http://localhost:5173",
            },
          });
        },
      );
    }

    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      const responseHeaders = {
        ...details.responseHeaders,
      } as Record<string, string[]>;

      if (isDev) {
        // Dev default: CSP disabled for Vite preamble/HMR compatibility.
        responseHeaders["Access-Control-Allow-Origin"] = ["*"];
        responseHeaders["Access-Control-Allow-Headers"] = ["*"];
        responseHeaders["Access-Control-Allow-Methods"] = [
          "GET",
          "POST",
          "PUT",
          "PATCH",
          "DELETE",
          "OPTIONS",
        ];
      }

      if (cspPolicy && !isFileUrl(details.url)) {
        responseHeaders["Content-Security-Policy"] = [cspPolicy];
      }

      callback({ responseHeaders });
    });

    app.on("web-contents-created", (_event, webContents) => {
      webContents.on(
        "did-fail-load",
        (
          _loadEvent,
          errorCode,
          errorDescription,
          validatedURL,
          isMainFrame,
        ) => {
          logger.error("Renderer failed to load", {
            errorCode,
            errorDescription,
            validatedURL,
            isMainFrame,
            startupElapsedMs: Date.now() - startupStartedAtMs,
          });
        },
      );
      webContents.on("did-finish-load", () => {
        const startupElapsedMs = Date.now() - startupStartedAtMs;
        logger.info("Renderer finished load", {
          url: webContents.getURL(),
          startupElapsedMs,
        });

        if (
          webContents.getType() === "window" &&
          windowManager.isMainWindowWebContentsId(webContents.id)
        ) {
          triggerFirstRendererReady("did-finish-load");
          scheduleStartupMaintenance("did-finish-load");
        }
      });
      webContents.on("console-message", (consoleEvent) => {
        const { level, message, lineNumber, sourceId } = consoleEvent;
        if (
          typeof message === "string" &&
          (isResizeObserverNoise(message) ||
            isReactFlowNodeTypesWarning(message))
        ) {
          return;
        }
        const severity =
          level === "error"
            ? 3
            : level === "warning"
              ? 2
              : level === "info"
                ? 1
                : 0;
        if (severity < 2) return;
        logger.warn("Renderer console message", {
          level,
          message,
          line: lineNumber,
          sourceId,
        });
      });
      webContents.on("render-process-gone", (_goneEvent, details) => {
        void handleRendererCrash(
          logger,
          webContents,
          details.reason === "killed",
        );
      });
    });

    const ipcRegistrationStartedAt = Date.now();
    const { registerIPCHandlers } = await import("../handler/index.js");
    await registerIPCHandlers();
    logger.info("Startup checkpoint: IPC handlers ready", {
      elapsedMs: Date.now() - ipcRegistrationStartedAt,
      startupElapsedMs: Date.now() - startupStartedAtMs,
    });

    applyApplicationMenu(settingsManager.getMenuBarMode());

    const readiness = await startupReadinessService.getReadiness();
    logger.info("Startup readiness evaluated", {
      mustRunWizard: readiness.mustRunWizard,
      reasons: readiness.reasons,
      completedAt: readiness.completedAt,
    });

    if (readiness.mustRunWizard) {
      windowManager.createStartupWizardWindow();
      logger.info("Startup wizard requested before main window", {
        reasons: readiness.reasons,
      });
    } else {
      startMainWindowFlow("readiness-pass");
    }

    startupReadinessService.onWizardCompleted((nextReadiness) => {
      logger.info("Startup wizard completion received", {
        mustRunWizard: nextReadiness.mustRunWizard,
        reasons: nextReadiness.reasons,
      });
      if (nextReadiness.mustRunWizard) {
        return;
      }
      windowManager.closeStartupWizardWindow();
      startMainWindowFlow("wizard-complete");
    });

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void startupReadinessService.getReadiness().then((nextReadiness) => {
          if (nextReadiness.mustRunWizard) {
            windowManager.createStartupWizardWindow();
            return;
          }
          startMainWindowFlow("activate");
        });
      }
    });
  });
};
