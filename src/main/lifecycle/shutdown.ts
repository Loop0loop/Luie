import { app, ipcMain, dialog } from "electron";
import { windowManager } from "../manager/index.js";
import { IPC_CHANNELS } from "../../shared/ipc/channels.js";
import {
  QUIT_RENDERER_FLUSH_TIMEOUT_MS,
  QUIT_SAVE_TIMEOUT_MS,
} from "../../shared/constants/index.js";
import type { createLogger } from "../../shared/logger/index.js";
import { consumeRestartRequest } from "./restart.js";

type Logger = ReturnType<typeof createLogger>;

export const registerShutdownHandlers = (logger: Logger): void => {
  let isQuitting = false;

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("before-quit", (event) => {
    if (isQuitting) return;

    if (consumeRestartRequest()) {
      isQuitting = true;
      event.preventDefault();
      logger.info("App is restarting, skipping graceful quit flow");
      app.exit(0);
      return;
    }

    isQuitting = true;
    event.preventDefault();

    void (async () => {
      logger.info("App is quitting");

      const { autoSaveManager } = await import("../manager/autoSaveManager.js");
      const { snapshotService } = await import(
        "../services/features/snapshotService.js"
      );
      const mainWindow = windowManager.getMainWindow();

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
                (payload as { hadQueuedAutoSaves?: unknown } | undefined)
                  ?.hadQueuedAutoSaves,
              );
              rendererDirty = Boolean(
                (payload as { rendererDirty?: unknown } | undefined)
                  ?.rendererDirty,
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
          const dialogTarget =
            mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined;
          const response = dialogTarget
            ? await dialog.showMessageBox(dialogTarget, {
                type: "question",
                title: "저장되지 않은 변경사항",
                message,
                detail: "저장하지 않으면 변경사항이 손실될 수 있습니다.",
                buttons: ["저장 후 종료", "저장하지 않고 종료", "취소"],
                defaultId: 0,
                cancelId: 2,
                noLink: true,
              })
            : await dialog.showMessageBox({
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
            return;
          }

          if (response.response === 0) {
            logger.info("User chose: save and quit");
            try {
              await Promise.race([
                autoSaveManager.flushAll(),
                new Promise((resolve) =>
                  setTimeout(resolve, QUIT_SAVE_TIMEOUT_MS),
                ),
              ]);
              await autoSaveManager.flushMirrorsToSnapshots("session-end");
            } catch (error) {
              logger.error("Save during quit failed", error);
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
          logger.error(
            "Quit dialog failed; exiting with mirrors on disk",
            dialogError,
          );
        }
      } else {
        try {
          await autoSaveManager.flushMirrorsToSnapshots("session-end");
        } catch (error) {
          logger.warn("Session-end mirror flush failed", error);
        }
      }

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
      app.exit(0);
    })();
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
