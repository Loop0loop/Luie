import { app, ipcMain, dialog } from "electron";
import type { BrowserWindow } from "electron";
import { windowManager } from "../manager/index.js";
import { IPC_CHANNELS } from "../../shared/ipc/channels.js";
import {
  QUIT_EXPORT_HARD_TIMEOUT_MS,
  QUIT_EXPORT_SOFT_TIMEOUT_MS,
  QUIT_RENDERER_FLUSH_TIMEOUT_MS,
  QUIT_SAVE_TIMEOUT_MS,
} from "../../shared/constants/index.js";
import type { createLogger } from "../../shared/logger/index.js";
import type { AppQuitPhase } from "../../shared/types/index.js";

type Logger = ReturnType<typeof createLogger>;

const sendQuitPhase = (
  targetWindow: BrowserWindow | null,
  phase: AppQuitPhase,
  message?: string,
) => {
  if (!targetWindow || targetWindow.isDestroyed()) return;
  try {
    targetWindow.webContents.send(IPC_CHANNELS.APP_QUIT_PHASE, { phase, message });
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

      const { autoSaveManager } = await import("../manager/autoSaveManager.js");
      const { snapshotService } = await import("../services/features/snapshotService.js");
      const { projectService } = await import("../services/core/projectService.js");
      const mainWindow = windowManager.getMainWindow();

      sendQuitPhase(mainWindow, "prepare", "데이터를 안전하게 정리하고 있습니다...");

      let rendererFlushed = false;
      let rendererHadQueued = false;
      let rendererDirty = false;

      if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
        try {
          rendererFlushed = await new Promise<boolean>((resolve) => {
            const timeout = setTimeout(
              () => resolve(false),
              QUIT_RENDERER_FLUSH_TIMEOUT_MS,
            );
            ipcMain.once(IPC_CHANNELS.APP_FLUSH_COMPLETE, (_event, payload) => {
              rendererHadQueued = Boolean(
                (payload as { hadQueuedAutoSaves?: unknown } | undefined)?.hadQueuedAutoSaves,
              );
              rendererDirty = Boolean(
                (payload as { rendererDirty?: unknown } | undefined)?.rendererDirty,
              );
              clearTimeout(timeout);
              resolve(true);
            });
            mainWindow.webContents.send(IPC_CHANNELS.APP_BEFORE_QUIT);
          });
          logger.info("Renderer flush phase completed", {
            rendererFlushed,
            rendererHadQueued,
            rendererDirty,
          });
        } catch (error) {
          logger.warn("Renderer flush request failed", error);
        }
      }

      sendQuitPhase(mainWindow, "mirror-durable", "크래시 대비 미러를 먼저 보존하고 있습니다...");
      try {
        const { mirrored } = await autoSaveManager.flushCritical();
        logger.info("Pre-dialog mirror flush completed", { mirrored });
      } catch (error) {
        logger.error("Pre-dialog mirror flush failed", error);
      }

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
            try {
              await Promise.race([
                autoSaveManager.flushAll(),
                new Promise((resolve) => setTimeout(resolve, QUIT_SAVE_TIMEOUT_MS)),
              ]);
              await autoSaveManager.flushMirrorsToSnapshots("session-end");
            } catch (error) {
              logger.error("Save during quit failed", error);
            }
          } else {
            logger.info("User chose: quit without saving (mirrors already on disk)");
            try {
              await autoSaveManager.flushMirrorsToSnapshots("session-end-no-save");
            } catch (error) {
              logger.warn("Mirror-to-snapshot conversion failed", error);
            }
          }
        } catch (dialogError) {
          logger.error("Quit dialog failed; exiting with mirrors on disk", dialogError);
        }
      } else {
        try {
          await autoSaveManager.flushMirrorsToSnapshots("session-end");
        } catch (error) {
          logger.warn("Session-end mirror flush failed", error);
        }
      }

      sendQuitPhase(mainWindow, "export-flush", "프로젝트 파일(.luie)을 안전하게 저장 중입니다...");
      let exportDecision: "continue" | "cancel" = "continue";
      const softFlush = await projectService.flushPendingExports(QUIT_EXPORT_SOFT_TIMEOUT_MS);
      if (softFlush.timedOut) {
        const response = await showQuitDialog(mainWindow, {
          type: "question",
          title: "저장 지연 감지",
          message: "프로젝트 파일 저장이 지연되고 있습니다.",
          detail: "기본값은 종료 취소입니다. 계속 대기할지, 저장을 생략하고 종료할지 선택하세요.",
          buttons: ["재시도", "종료 취소", "저장 생략 후 종료"],
          defaultId: 1,
          cancelId: 1,
          noLink: true,
        });

        if (response.response === 1) {
          exportDecision = "cancel";
        } else if (response.response === 0) {
          const hardFlush = await projectService.flushPendingExports(QUIT_EXPORT_HARD_TIMEOUT_MS);
          if (hardFlush.timedOut) {
            const hardResponse = await showQuitDialog(mainWindow, {
              type: "warning",
              title: "저장 지연 지속",
              message: "저장이 아직 완료되지 않았습니다.",
              detail: "안전을 위해 종료를 취소하는 것을 권장합니다.",
              buttons: ["종료 취소", "저장 생략 후 종료"],
              defaultId: 0,
              cancelId: 0,
              noLink: true,
            });
            if (hardResponse.response === 0) {
              exportDecision = "cancel";
            }
          }
        }
      }

      if (exportDecision === "cancel") {
        logger.info("Quit cancelled by user during export flush");
        isQuitting = false;
        sendQuitPhase(mainWindow, "aborted", "종료가 취소되었습니다.");
        return;
      }

      sendQuitPhase(mainWindow, "finalize", "마무리 정리 중입니다...");
      try {
        await snapshotService.pruneSnapshotsAllProjects();
      } catch (error) {
        logger.warn("Snapshot pruning failed during quit", error);
      }

      try {
        const { db } = await import("../database/index.js");
        await db.disconnect();
      } catch (error) {
        logger.warn("DB disconnect failed during quit", error);
      }

      sendQuitPhase(mainWindow, "completed", "안전하게 종료합니다.");
      app.exit(0);
    })().catch((error) => {
      logger.error("Quit guard failed", error);
      isQuitting = false;
      const mainWindow = windowManager.getMainWindow();
      sendQuitPhase(mainWindow, "aborted", "종료 중 오류가 발생해 취소되었습니다.");
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
