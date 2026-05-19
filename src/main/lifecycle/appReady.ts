import { app, BrowserWindow, session, dialog } from "electron";
// type imports
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

const STARTUP_MAINTENANCE_DELAY_MS = 1500; // Renderer가 준비 된 후 1.5s 뒤에 mainInstance 작업 실행
const FIRST_RENDERER_FALLBACK_MS = 8000; // 8s 지나면 강제로 Renderer 준비완료처리 -> 무한로딩 방지
const isStartupMaintenanceDisabled =
  process.env.LUIE_DISABLE_STARTUP_MAINTENANCE === "1" ||
  process.env.LUIE_E2E_STRESS_MODE === "1";

const loadAutoSaveManager = async () =>
  (await import("../manager/autoSaveManager.js")).autoSaveManager; // 시작 로딩 줄이기 위하여 lazy inport
const loadDerivedJobWorker = async () =>
  (await import("../services/features/derivedJobWorker.js")).derivedJobWorker;

// CSP : isPacked? 
const buildProdCspPolicy = () =>
  [
    "default-src 'self'", // 기본적으로 자기 자신만 허용
    "script-src 'self'", // 자기 자신의 스크립트만 허용
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "img-src 'self' data: https:", // img나 fonts는 허용
    "font-src 'self' data: https://cdn.jsdelivr.net",
    "connect-src 'self'", // 자기 자신의 연결만 허용
  ].join("; ");

  // CSP : dev
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

  // 어떠한 CSP 정책을 쓸지 결정
const resolveCspPolicy = (isDev: boolean): string | null => {
  if (!isDev) {
    return buildProdCspPolicy();
  }
  return process.env.LUIE_DEV_CSP === "1" ? buildDevCspPolicy() : null; // null 허용이유? -> HMR이나 개발서거가 자주 꺠질 수 있기 때문
};

const isFileUrl = (url: string): boolean => url.startsWith("file://"); // 먼저 URL이 file:// 인지 검사
const isResizeObserverNoise = (message: string): boolean =>
  message.includes(
    "ResizeObserver loop completed with undelivered notifications",
  ) || message.includes("ResizeObserver loop limit exceeded");
const isReactFlowNodeTypesWarning = (message: string): boolean =>
  message.includes(
    "[React Flow]: It looks like you've created a new nodeTypes or edgeTypes object.",
  );

// Renderer 프로레스가 죽었을 때 실행
const handleRendererCrash = async (
  logger: Logger,
  webContents: WebContents,
  killed: boolean,
) => {
  logger.error("Renderer process crashed", {
    killed,
    webContentsId: webContents.id,
  }); // 왜 죽었는지 기록

  try {
    const autoSaveManager = await loadAutoSaveManager(); // 최대한 데이터는 저장할려 시도
    await autoSaveManager.flushCritical();
    logger.info("Emergency save completed after crash");
  } catch (error) {
    logger.error("Failed to save during crash recovery", error);
  }


  // 다이로그로 사용자에게 재시작 선택
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
      }, 500); // 창 닫은 후 0.5s 뒤에 MainWindow만 다시 띄우기
    } else {
      app.quit(); // 앱 완전 종료
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
    await projectService.reconcileProjectPathDuplicates(); // 프로젝트 중복 문제 해결
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
    await entityRelationService.reconcileWorldEntityPointersAcrossProjects({
      dryRun: true,
    });
    await entityRelationService.reconcileWorldEntityPointersAcrossProjects({
      dryRun: false,
    });
  } catch (error) {
    logger.warn("Entity relation orphan cleanup skipped", error);
  }

  try {
    const { dbMaintenanceService } = await import(
      "../services/features/dbMaintenanceService.js"
    );
    await dbMaintenanceService.purgeOrphanDerivedRows({
      dryRun: true,
    });
    await dbMaintenanceService.purgeOrphanDerivedRows({
      dryRun: false,
    });
    await dbMaintenanceService.purgeInvalidEmbeddings({
      dryRun: true,
      limit: 5000,
    });
    await dbMaintenanceService.purgeInvalidEmbeddings({
      dryRun: false,
      limit: 5000,
    });
  } catch (error) {
    logger.warn("Invalid embedding cleanup skipped", error);
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
    const bootstrapStatus = await ensureBootstrapReady();
    if (!bootstrapStatus.isReady) {
      logger.error("App bootstrap did not complete", bootstrapStatus);
    } else {
      try {
        const derivedJobWorker = await loadDerivedJobWorker();
        derivedJobWorker.start();
      } catch (error) {
        logger.warn("Failed to start derived job worker", error);
      }
    }

    const isDev = isDevEnv();
    const cspPolicy = resolveCspPolicy(isDev);


    let rendererReadyForCurrentMainWindow = false; // 현재 MainWindow Renderer Ready 판정여부 -> Renderer Ready : True
    let firstRendererStartupHookTriggered = false; // onFirstRendererReady()의 실행여부 -> sync 초기화 한번만 실행하려고
    let startupMaintenanceScheduled = false; // 뒤에서 돌릴 mainInstance 작업이 예약됬는지 판명 -> scheduleStartUpMaintenance 한번만 예약
    let fallbackTimer: NodeJS.Timeout | null = null; // Renderer Ready fallback 타이머 


    /**
     * @description Main Renderer 준비완료 처리 함수
     */
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


      /**
       * onFirstRendererReady() Callback 실행
       */
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

    
    const scheduleStartupMaintenance = (reason: string): void => { // 앱을 보여준 후 무거운 후처리 작업을 조금 뒤 에약
      if (isStartupMaintenanceDisabled) {
        logger.info("Deferred startup maintenance skipped", {
          reason: "runtime-flag",
          trigger: reason,
        });
        return;
      }
      if (startupMaintenanceScheduled) return; // 이미 됬으면 종료
      startupMaintenanceScheduled = true;
      logger.info("Deferred startup maintenance scheduled", {
        reason,
        delayMs: STARTUP_MAINTENANCE_DELAY_MS, // 1.5s 뒤 mainInstance실행
      });
      setTimeout(() => {
        void runDeferredStartupMaintenance(logger);
      }, STARTUP_MAINTENANCE_DELAY_MS);
    };


    const startMainWindowFlow = (reason: string): void => {
      /**
       * @description 이미 MainWindow가 있으면 재사용
       * - 이미 살아있는 MainWindow가 있으면 새로 만들지않음
       * - 안 보이면 보여주기만 하고 끝
       */
      const existingMainWindow = windowManager.getMainWindow(); 
      if (existingMainWindow && !existingMainWindow.isDestroyed()) { 
        if (!existingMainWindow.isVisible()) {
          windowManager.showMainWindow();
        }
        return;
      }

      rendererReadyForCurrentMainWindow = false; // New MainWindow flow 시작되므로 상태 초기화

      // MainWindow 시작 로그
      logger.info("Starting main window flow", {
        reason,
        startupElapsedMs: Date.now() - startupStartedAtMs,
      });

      /**
       * @description 백그라운드에 준비만 시켜놓음
       */
      windowManager.createMainWindow({ deferShow: true });
      logger.info("Startup checkpoint: main window requested", {
        startupElapsedMs: Date.now() - startupStartedAtMs,
      });

      const bootstrapStartedAt = Date.now();
      void ensureBootstrapReady() // bootstrap 준비확인 -> log용으로 확인하는 흐름
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

      /** 
       * fallback 타이머 시작
       * - Renderer Event가 안오거나
       * - 너무 오래 걸리거나
       * - 어딘가 꼬일경우
       * => 8초 후에 강제로 Renderer준비 완료 처리
       */
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
