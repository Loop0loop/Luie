import { BrowserWindow } from "electron";
import { createLogger } from "../../shared/logger/index.js";
import { IPC_CHANNELS } from "../../shared/ipc/channels.js";
import type { AppBootstrapStatus } from "../../shared/types/index.js";
import { db } from "../database/index.js";

const logger = createLogger("BootstrapLifecycle");

let bootstrapStatus: AppBootstrapStatus = { isReady: false };
let bootstrapPromise: Promise<AppBootstrapStatus> | null = null;

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Failed to initialize database";
};

const broadcastBootstrapStatus = (): void => {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue;
    try {
      win.webContents.send(IPC_CHANNELS.APP_BOOTSTRAP_STATUS_CHANGED, bootstrapStatus);
    } catch (error) {
      logger.warn("Failed to broadcast bootstrap status", error);
    }
  }
};

const updateBootstrapStatus = (nextStatus: AppBootstrapStatus): void => {
  bootstrapStatus = nextStatus;
  broadcastBootstrapStatus();
};

export const getBootstrapStatus = (): AppBootstrapStatus => bootstrapStatus;

export const ensureBootstrapReady = async (): Promise<AppBootstrapStatus> => {
  if (bootstrapStatus.isReady) {
    return bootstrapStatus;
  }
  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  updateBootstrapStatus({ isReady: false });

  bootstrapPromise = db
    .initialize()
    .then(() => {
      updateBootstrapStatus({ isReady: true });
      logger.info("Bootstrap completed");
      return bootstrapStatus;
    })
    .catch((error) => {
      const message = getErrorMessage(error);
      updateBootstrapStatus({ isReady: false, error: message });
      logger.error("Bootstrap failed", error);
      return bootstrapStatus;
    })
    .finally(() => {
      bootstrapPromise = null;
    });

  return bootstrapPromise;
};
