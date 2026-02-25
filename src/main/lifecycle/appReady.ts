import { app, BrowserWindow, session, dialog } from "electron";
import type { WebContents } from "electron";
import { settingsManager, windowManager } from "../manager/index.js";
import { isDevEnv } from "../utils/environment.js";
import type { createLogger } from "../../shared/logger/index.js";
import { applyApplicationMenu } from "./menu.js";
import { ensureBootstrapReady } from "./bootstrap.js";

type Logger = ReturnType<typeof createLogger>;

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
    const { autoSaveManager } = await import("../manager/autoSaveManager.js");
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

export const registerAppReady = (logger: Logger): void => {
  app.whenReady().then(async () => {
    logger.info("App is ready");

    const isDev = isDevEnv();
    const cspPolicy = resolveCspPolicy(isDev);

    if (isDev) {
      session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
        callback({
          requestHeaders: {
            ...details.requestHeaders,
            Origin: "http://localhost:5173",
          },
        });
      });
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

      if (cspPolicy) {
        responseHeaders["Content-Security-Policy"] = [cspPolicy];
      }

      callback({ responseHeaders });
    });

    app.on("web-contents-created", (_event, webContents) => {
      webContents.on("render-process-gone", (_goneEvent, details) => {
        void handleRendererCrash(logger, webContents, details.reason === "killed");
      });
    });

    const { registerIPCHandlers } = await import("../handler/index.js");
    registerIPCHandlers();

    windowManager.createMainWindow();
    applyApplicationMenu(settingsManager.getMenuBarMode());

    void ensureBootstrapReady().then(async (status) => {
      if (!status.isReady) {
        logger.error("App bootstrap did not complete", status);
        return;
      }

      try {
        const { autoSaveManager } = await import("../manager/autoSaveManager.js");
        await autoSaveManager.flushMirrorsToSnapshots("startup-recovery");
        const { snapshotService } = await import(
          "../services/features/snapshotService.js"
        );
        void snapshotService.pruneSnapshotsAllProjects();
        void snapshotService.cleanupOrphanArtifacts("startup");
      } catch (error) {
        logger.warn("Snapshot recovery/pruning skipped", error);
      }
    });

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        windowManager.createMainWindow();
        void ensureBootstrapReady();
      }
    });
  });
};
