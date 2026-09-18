import { app, BrowserWindow, session } from "electron";
import { windowManager } from "../../app/windows/index.js";
import { settingsManager } from "../../domains/settings/index.js";
import { isDevEnv, isStartupWizardForced } from "../../utils/env/index.js";
import type { createLogger } from "../../../shared/logger/index.js";
import { applyApplicationMenu } from "../menu/index.js";
import { ensureBootstrapReady } from "../bootstrap/index.js";
import { startupReadinessService } from "../../app/startup/index.js";
import { scheduleDeferredStartupMaintenance } from "./deferredStartupMaintenance.js";
import { handleRendererCrash } from "./rendererCrashRecovery.js";

type Logger = ReturnType<typeof createLogger>;

type AppReadyOptions = {
  startupStartedAtMs?: number;
  onFirstRendererReady?: () => void;
};

// NOTE: 렌더러 준비 이벤트가 유실돼도 창 표시가 무기한 지연되지 않아야 한다.
const FIRST_RENDERER_FALLBACK_MS = 8000;

const loadDerivedJobWorker = async () =>
  (await import("../../domains/manuscript/index.js")).derivedJobWorker;

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
  // NOTE: 개발 기본값은 Vite preamble과 HMR을 깨뜨리지 않도록 응답 CSP를 주입하지 않는다.
  return process.env.LUIE_DEV_CSP === "1" ? buildDevCspPolicy() : null;
};

const isResizeObserverNoise = (message: string): boolean =>
  message.includes(
    "ResizeObserver loop completed with undelivered notifications",
  ) || message.includes("ResizeObserver loop limit exceeded");
const isReactFlowNodeTypesWarning = (message: string): boolean =>
  message.includes(
    "[React Flow]: It looks like you've created a new nodeTypes or edgeTypes object.",
  );

export const registerAppReady = (
  logger: Logger,
  options: AppReadyOptions = {},
): void => {
  const startupStartedAtMs = options.startupStartedAtMs ?? Date.now();

  app.whenReady().then(async () => {
    logger.info("App is ready", {
      startupElapsedMs: Date.now() - startupStartedAtMs,
    });

    // 첫-창-우선(P0): bootstrap(DB 마이그레이션·integrity 스캔·세션 네트워크 최대 5초)을
    // 기다리지 않고 창을 띄우는 게 목표다. 위저드 필요 여부는 completedAt/강제 플래그만으로
    // 1차 판정한다 — blocking 검사 실패는 이 판정에 위저드를 추가할 뿐 반대로 만들지는
    // 않으므로, 놓친 실패는 뒤의 전체 평가와 위저드 완료 게이트가 보정한다.
    // docs/architecture/startup-pipeline-dissection.md §4 진단 1번.
    const cheapNeedsWizard =
      isStartupWizardForced() ||
      !settingsManager.getStartupSettings().completedAt;

    void ensureBootstrapReady()
      .then((status) => {
        if (!status.isReady) {
          logger.error("App bootstrap did not complete", status);
        }
      })
      .catch((error) => {
        logger.error("App bootstrap did not complete", error);
      });

    const isDev = isDevEnv();
    const cspPolicy = resolveCspPolicy(isDev);

    let rendererReadyForCurrentMainWindow = false;
    let firstRendererStartupHookTriggered = false;
    // 위자드 완료 후 메인 창의 렌더러가 준비될 때까지 위자드를 화면에 남기기 위한
    // 플래그 — "닫고 생성"의 창 0개 빈 화면 구간(non-darwin quit 위험 + 콜드 부트
    // 동안 공백)을 "교체" 전환으로 바꾼다.
    let wizardClosePending = false;
    let fallbackTimer: NodeJS.Timeout | null = null;

    const triggerFirstRendererReady = (reason: string): void => {
      if (!rendererReadyForCurrentMainWindow) {
        rendererReadyForCurrentMainWindow = true;
        windowManager.showMainWindow();
        if (wizardClosePending) {
          wizardClosePending = false;
          windowManager.closeStartupWizardWindow();
        }
        logger.info("Startup checkpoint: renderer ready", {
          reason,
          startupElapsedMs: Date.now() - startupStartedAtMs,
        });
        logger.info("Startup checkpoint: main window shown", {
          reason,
          startupElapsedMs: Date.now() - startupStartedAtMs,
        });
        // bootstrapStatus 캡처 대신 캐시된 bootstrap promise를 다시 읽는다 — 위자드
        // 경로에서는 창 표시가 bootstrap 완료보다 빠를 수 있어 mutable 값만으로는
        // derived job worker 시작이 유실될 수 있다.
        void ensureBootstrapReady()
          .then((status) => {
            if (!status.isReady) return;
            void loadDerivedJobWorker()
              .then((derivedJobWorker) => derivedJobWorker.start())
              .catch((error) => {
                logger.warn("Failed to start derived job worker", error);
              });
          })
          .catch(() => undefined);
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

    const startMainWindowFlow = (
      reason: string,
      options: { fitWorkArea?: boolean } = {},
    ): void => {
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

      windowManager.createMainWindow({
        deferShow: true,
        fitWorkArea: options.fitWorkArea,
      });
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

      // NOTE: renderer-ready가 누락돼도 startup과 유지보수 예약을 계속 진행한다.
      fallbackTimer = setTimeout(() => {
        if (!rendererReadyForCurrentMainWindow) {
          triggerFirstRendererReady("fallback-timeout");
        }
        scheduleDeferredStartupMaintenance(logger, "fallback-timeout");
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
        // NOTE: 개발 서버 요청은 Vite HMR에 필요한 cross-origin header를 허용한다.
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

      if (cspPolicy) {
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
          scheduleDeferredStartupMaintenance(logger, "did-finish-load");
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
    const { registerAllIPCHandlers } = await import("../../handler/index.js");
    await registerAllIPCHandlers();
    logger.info("Startup checkpoint: IPC handlers ready", {
      elapsedMs: Date.now() - ipcRegistrationStartedAt,
      startupElapsedMs: Date.now() - startupStartedAtMs,
    });

    applyApplicationMenu(settingsManager.getMenuBarMode());

    if (cheapNeedsWizard) {
      // 위저드가 필요한 부팅이다. 무거운 readiness 평가를 기다리지 않고 위저드 창을
      // 먼저 띄운다 — bootstrap/readiness는 백그라운드로 계속 진행되고, 위저드 UI는
      // startup.getReadiness IPC(캐시 병합)로 결과를 받아 단계를 연다.
      windowManager.createStartupWizardWindow();
      logger.info("Startup wizard requested before readiness evaluation", {
        startupElapsedMs: Date.now() - startupStartedAtMs,
      });
      void startupReadinessService
        .getReadiness()
        .then((readiness) => {
          logger.info("Startup readiness evaluated (wizard-first)", {
            mustRunWizard: readiness.mustRunWizard,
            reasons: readiness.reasons,
          });
        })
        .catch((error) => {
          logger.error("Startup readiness evaluation failed", error);
        });
    } else {
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
    }

    startupReadinessService.onWizardCompleted((nextReadiness) => {
      logger.info("Startup wizard completion received", {
        mustRunWizard: nextReadiness.mustRunWizard,
        reasons: nextReadiness.reasons,
      });
      if (nextReadiness.mustRunWizard) {
        return;
      }
      // NOTE: 위자드를 먼저 닫지 않는다 — startMainWindowFlow가 deferShow로 메인
      // 창을 만들고, 렌더러 준비(did-finish-load 또는 폴백 타이머) 시점의
      // triggerFirstRendererReady에서 show와 함께 위자드를 닫는다(교체 전환).
      wizardClosePending = true;
      startMainWindowFlow("wizard-complete", { fitWorkArea: true });
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
