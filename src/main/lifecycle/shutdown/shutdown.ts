import { app, ipcMain, dialog } from "electron";
import type { BrowserWindow, IpcMainEvent } from "electron";
import { windowManager } from "../../app/windows/index.js";
import { db } from "../../infra/database/index.js";
import { projectService } from "../../domains/project/index.js";
import { snapshotService } from "../../domains/recovery/index.js";
import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import {
  QUIT_EXPORT_HARD_TIMEOUT_MS,
  QUIT_EXPORT_SOFT_TIMEOUT_MS,
  QUIT_RENDERER_FLUSH_TIMEOUT_MS,
  QUIT_SAVE_TIMEOUT_MS,
} from "../../../shared/constants/index.js";
import type { createLogger } from "../../../shared/logger/index.js";
import type {
  AppBeforeQuitPayload,
  AppFlushCompletePayload,
  AppQuitPhase,
} from "../../../shared/types/index.js";
import { resolveProjectExportQuitDecision } from "./exportFlushDecision.js";

type Logger = ReturnType<typeof createLogger>;

type RendererFlushAttempt = {
  acknowledged: boolean;
  hadQueuedAutoSaves: boolean;
  rendererDirty: boolean;
};

let rendererFlushRequestSequence = 0;

const loadAutoSaveManager = async () =>
  (await import("../../domains/manuscript/index.js")).autoSaveManager;

const loadCacheDb = async () =>
  (await import("../../infra/database/cache.js")).cacheDb;
const loadDerivedJobWorker = async () =>
  (await import("../../domains/manuscript/index.js")).derivedJobWorker;
const loadSidecarManager = async () =>
  (await import("../../domains/settings/llm.js")).sidecarManager;

const sendQuitPhase = (
  targetWindow: BrowserWindow | null,
  phase: AppQuitPhase,
  message?: string,
) => {
  if (!targetWindow || targetWindow.isDestroyed()) return;
  try {
    targetWindow.webContents.send(IPC_CHANNELS.APP_QUIT_PHASE, {
      phase,
      message,
    });
  } catch {
    // best effort
  }
};

const showQuitDialog = async (
  mainWindow: BrowserWindow | null,
  options: Parameters<typeof dialog.showMessageBox>[0],
) =>
  mainWindow && !mainWindow.isDestroyed()
    ? dialog.showMessageBox(mainWindow, options)
    : dialog.showMessageBox(options);

const requestRendererFlush = async (
  mainWindow: BrowserWindow | null,
): Promise<RendererFlushAttempt> => {
  const failedAttempt: RendererFlushAttempt = {
    acknowledged: false,
    hadQueuedAutoSaves: false,
    rendererDirty: false,
  };
  if (!mainWindow || mainWindow.isDestroyed() || !mainWindow.webContents) {
    return failedAttempt;
  }

  return new Promise<RendererFlushAttempt>((resolve, reject) => {
    const requestId = `quit-flush-${++rendererFlushRequestSequence}`;
    let settled = false;
    const finish = (result: RendererFlushAttempt) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      ipcMain.removeListener(IPC_CHANNELS.APP_FLUSH_COMPLETE, onComplete);
      resolve(result);
    };
    const onComplete = (event: IpcMainEvent, payload: unknown) => {
      const completion = payload as
        | Partial<AppFlushCompletePayload>
        | undefined;
      if (
        event.sender !== mainWindow.webContents ||
        completion?.requestId !== requestId ||
        typeof completion.hadQueuedAutoSaves !== "boolean" ||
        typeof completion.rendererDirty !== "boolean"
      ) {
        return;
      }
      finish({
        acknowledged: true,
        hadQueuedAutoSaves: completion.hadQueuedAutoSaves,
        rendererDirty: completion.rendererDirty,
      });
    };
    const timeout = setTimeout(
      () => finish(failedAttempt),
      QUIT_RENDERER_FLUSH_TIMEOUT_MS,
    );

    try {
      ipcMain.on(IPC_CHANNELS.APP_FLUSH_COMPLETE, onComplete);
      mainWindow.webContents.send(IPC_CHANNELS.APP_BEFORE_QUIT, {
        requestId,
      } satisfies AppBeforeQuitPayload);
    } catch (error) {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        ipcMain.removeListener(IPC_CHANNELS.APP_FLUSH_COMPLETE, onComplete);
        reject(error);
      }
    }
  });
};

const resolveRendererFlushRetry = async (
  mainWindow: BrowserWindow | null,
  logger: Logger,
): Promise<"saved" | "skip" | "cancel"> => {
  let retry: RendererFlushAttempt = {
    acknowledged: false,
    hadQueuedAutoSaves: false,
    rendererDirty: false,
  };
  try {
    retry = await requestRendererFlush(mainWindow);
  } catch (error) {
    logger.warn("Renderer flush retry request failed", error);
  }

  if (retry.acknowledged && !retry.rendererDirty) return "saved";

  let retryResponse = 2;
  try {
    retryResponse = (
      await showQuitDialog(mainWindow, {
        type: "warning",
        title: "변경사항을 저장하지 못했습니다",
        message: "앱 화면의 변경사항 저장을 완료하지 못했습니다.",
        detail: "다시 시도하거나, 저장하지 않고 종료할 수 있습니다.",
        buttons: ["다시 시도", "저장하지 않고 종료", "종료 취소"],
        defaultId: 2,
        cancelId: 2,
        noLink: true,
      })
    ).response;
  } catch (dialogError) {
    logger.error("Renderer flush retry dialog failed", dialogError);
  }

  if (retryResponse === 0) {
    return resolveRendererFlushRetry(mainWindow, logger);
  }
  return retryResponse === 1 ? "skip" : "cancel";
};

const runMainSaveAttempt = async (
  flushAll: () => Promise<unknown>,
): Promise<boolean> => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      flushAll().then(() => true),
      new Promise<boolean>((resolve) => {
        timeout = setTimeout(() => resolve(false), QUIT_SAVE_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};

const resolveMainSaveRetry = async (
  mainWindow: BrowserWindow | null,
  flushAll: () => Promise<unknown>,
  logger: Logger,
): Promise<"saved" | "skip" | "cancel"> => {
  try {
    if (await runMainSaveAttempt(flushAll)) return "saved";
    logger.warn("Main save during quit timed out");
  } catch (error) {
    logger.error("Main save during quit failed", error);
  }

  let retryResponse = 2;
  try {
    retryResponse = (
      await showQuitDialog(mainWindow, {
        type: "warning",
        title: "변경사항을 저장하지 못했습니다",
        message: "문서 변경사항 저장을 완료하지 못했습니다.",
        detail: "다시 시도하거나, 저장하지 않고 종료할 수 있습니다.",
        buttons: ["다시 시도", "저장하지 않고 종료", "종료 취소"],
        defaultId: 2,
        cancelId: 2,
        noLink: true,
      })
    ).response;
  } catch (dialogError) {
    logger.error("Main save retry dialog failed", dialogError);
  }

  if (retryResponse === 0) {
    return resolveMainSaveRetry(mainWindow, flushAll, logger);
  }
  return retryResponse === 1 ? "skip" : "cancel";
};

export const registerShutdownHandlers = (logger: Logger): void => {
  let isQuitting = false;

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("before-quit", (event) => {
    if (isQuitting) return;
    isQuitting = true;
    event.preventDefault();

    void (async () => {
      logger.info("App is quitting");

      const mainWindow = windowManager.getMainWindow();

      sendQuitPhase(
        mainWindow,
        "prepare",
        "데이터를 안전하게 정리하고 있습니다...",
      );

      let rendererFlushed = false;
      let rendererHadQueued = false;
      let rendererDirty = false;

      if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
        try {
          const rendererFlush = await requestRendererFlush(mainWindow);
          rendererFlushed = rendererFlush.acknowledged;
          rendererHadQueued = rendererFlush.hadQueuedAutoSaves;
          rendererDirty = rendererFlush.rendererDirty;
          logger.info("Renderer flush phase completed", {
            rendererFlushed,
            rendererHadQueued,
            rendererDirty,
          });
        } catch (error) {
          logger.warn("Renderer flush request failed", error);
        }
      }

      sendQuitPhase(
        mainWindow,
        "mirror-durable",
        "크래시 대비 미러를 먼저 보존하고 있습니다...",
      );
      try {
        const autoSaveManager = await loadAutoSaveManager();
        const { mirrored } = await autoSaveManager.flushCritical();
        logger.info("Pre-dialog mirror flush completed", { mirrored });
      } catch (error) {
        logger.error("Pre-dialog mirror flush failed", error);
      }

      const autoSaveManager = await loadAutoSaveManager();
      const pendingCount = autoSaveManager.getPendingSaveCount();
      const shouldPrompt =
        pendingCount > 0 ||
        rendererHadQueued ||
        rendererDirty ||
        !rendererFlushed;

      if (shouldPrompt) {
        try {
          const message =
            pendingCount > 0
              ? `${pendingCount}개의 변경사항이 저장되지 않았습니다.`
              : "저장되지 않은 변경사항이 있을 수 있습니다.";
          const response = await showQuitDialog(mainWindow, {
            type: "question",
            title: "저장되지 않은 변경사항",
            message,
            detail: "저장하지 않으면 변경사항이 손실될 수 있습니다.",
            buttons: ["저장 후 종료", "저장하지 않고 종료", "취소"],
            defaultId: 0,
            cancelId: 2,
            noLink: true,
          });

          if (response.response === 2) {
            logger.info("Quit cancelled by user");
            isQuitting = false;
            sendQuitPhase(mainWindow, "aborted", "종료가 취소되었습니다.");
            return;
          }

          if (response.response === 0) {
            logger.info("User chose: save and quit");
            let skipRendererSave = false;

            if (!rendererFlushed || rendererDirty) {
              const rendererRetryDecision = await resolveRendererFlushRetry(
                mainWindow,
                logger,
              );
              if (rendererRetryDecision === "cancel") {
                logger.info(
                  "Quit cancelled by user during renderer flush retry",
                );
                isQuitting = false;
                sendQuitPhase(mainWindow, "aborted", "종료가 취소되었습니다.");
                return;
              }
              skipRendererSave = rendererRetryDecision === "skip";
            }

            let skipMainSave = skipRendererSave;
            if (!skipMainSave) {
              const mainSaveDecision = await resolveMainSaveRetry(
                mainWindow,
                () => autoSaveManager.flushAll(),
                logger,
              );
              if (mainSaveDecision === "cancel") {
                logger.info("Quit cancelled by user during main save retry");
                isQuitting = false;
                sendQuitPhase(mainWindow, "aborted", "종료가 취소되었습니다.");
                return;
              }
              skipMainSave = mainSaveDecision === "skip";
            }

            if (skipMainSave) {
              try {
                await autoSaveManager.flushMirrorsToSnapshots(
                  "session-end-no-save",
                );
              } catch (error) {
                logger.warn("Mirror-to-snapshot conversion failed", error);
              }
            } else {
              try {
                await autoSaveManager.flushMirrorsToSnapshots("session-end");
              } catch (error) {
                logger.error("Save during quit failed", error);
              }
            }
          } else {
            logger.info(
              "User chose: quit without saving (mirrors already on disk)",
            );
            try {
              await autoSaveManager.flushMirrorsToSnapshots(
                "session-end-no-save",
              );
            } catch (error) {
              logger.warn("Mirror-to-snapshot conversion failed", error);
            }
          }
        } catch (dialogError) {
          logger.error("Quit dialog failed", dialogError);
          logger.info("Quit cancelled because unsaved changes dialog failed");
          isQuitting = false;
          sendQuitPhase(mainWindow, "aborted", "종료가 취소되었습니다.");
          return;
        }
      } else {
        try {
          const autoSaveManager = await loadAutoSaveManager();
          await autoSaveManager.flushMirrorsToSnapshots("session-end");
        } catch (error) {
          logger.warn("Session-end mirror flush failed", error);
        }
      }

      sendQuitPhase(
        mainWindow,
        "export-flush",
        "프로젝트 파일(.luie)을 안전하게 저장 중입니다...",
      );
      const exportDecision = await resolveProjectExportQuitDecision(
        (timeoutMs) => projectService.flushPendingExports(timeoutMs),
        (options) => showQuitDialog(mainWindow, options),
        QUIT_EXPORT_SOFT_TIMEOUT_MS,
        QUIT_EXPORT_HARD_TIMEOUT_MS,
      );

      if (exportDecision === "cancel") {
        logger.info("Quit cancelled by user during export flush");
        isQuitting = false;
        sendQuitPhase(mainWindow, "aborted", "종료가 취소되었습니다.");
        return;
      }

      sendQuitPhase(mainWindow, "finalize", "마무리 정리 중입니다...");
      try {
        const derivedJobWorker = await loadDerivedJobWorker();
        await derivedJobWorker.stop();
      } catch (error) {
        logger.warn("Failed to stop derived job worker during quit", error);
      }
      try {
        const sidecarManager = await loadSidecarManager();
        await sidecarManager.stop();
      } catch (error) {
        logger.warn("Failed to stop local LLM sidecar during quit", error);
      }
      try {
        await snapshotService.pruneSnapshotsAllProjects();
      } catch (error) {
        logger.warn("Snapshot pruning failed during quit", error);
      }

      try {
        const checkpointResult = db.runWalCheckpoint("FULL");
        logger.info("Main DB WAL checkpoint completed during quit", {
          checkpointResult,
        });
      } catch (error) {
        logger.warn("Main DB WAL checkpoint failed during quit", error);
      }

      try {
        await db.disconnect();
      } catch (error) {
        logger.warn("DB disconnect failed during quit", error);
      }
      try {
        const cacheDb = await loadCacheDb();
        try {
          const checkpointResult = cacheDb.runWalCheckpoint("FULL");
          logger.info("Cache DB WAL checkpoint completed during quit", {
            checkpointResult,
          });
        } catch (checkpointError) {
          logger.warn(
            "Cache DB WAL checkpoint failed during quit",
            checkpointError,
          );
        }
        await cacheDb.disconnect();
      } catch (error) {
        logger.warn("Cache DB disconnect failed during quit", error);
      }

      sendQuitPhase(mainWindow, "completed", "안전하게 종료합니다.");
      app.exit(0);
    })().catch((error) => {
      logger.error("Quit guard failed", error);
      isQuitting = false;
      const mainWindow = windowManager.getMainWindow();
      sendQuitPhase(
        mainWindow,
        "aborted",
        "종료 중 오류가 발생해 취소되었습니다.",
      );
    });
  });

  process.on("SIGINT", () => {
    logger.info("Received SIGINT");
    app.quit();
  });

  process.on("SIGTERM", () => {
    logger.info("Received SIGTERM");
    app.quit();
  });

  process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception", error);
  });

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection", reason);
  });
};
