import { BrowserWindow } from "electron";
import { IPC_CHANNELS } from "../../shared/ipc/channels.js";
import { createLogger } from "../../shared/logger/index.js";
import type { SyncAuthResult, SyncAuthResultReason } from "../../shared/types/index.js";
import { windowManager } from "../manager/index.js";
import { syncService } from "../services/features/sync/syncService.js";

const logger = createLogger("DeepLink");

const OAUTH_CALLBACK_PREFIX = "luie://auth/callback";
const OAUTH_RETURN_PREFIX = "luie://auth/return";
const OAUTH_AUTH_PREFIX = "luie://auth/";

const focusMainWindow = (): void => {
  const mainWindow = windowManager.getMainWindow();
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    return;
  }

  const wizardWindow = windowManager.getStartupWizardWindow();
  if (wizardWindow && !wizardWindow.isDestroyed()) {
    if (wizardWindow.isMinimized()) wizardWindow.restore();
    wizardWindow.focus();
  }
};

const broadcastAuthResult = (result: SyncAuthResult): void => {
  const targets = BrowserWindow.getAllWindows();
  for (const win of targets) {
    if (win.isDestroyed()) continue;
    try {
      win.webContents.send(IPC_CHANNELS.SYNC_AUTH_RESULT, result);
    } catch (error) {
      logger.warn("Failed to broadcast OAuth result", { error });
    }
  }
};

type OAuthCallbackFailureReason = "NO_PENDING" | "EXPIRED" | "STATE_MISMATCH" | "UNKNOWN";

const classifyCallbackFailure = (error: unknown): OAuthCallbackFailureReason => {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("SYNC_AUTH_NO_PENDING_SESSION")) return "NO_PENDING";
  if (message.includes("SYNC_AUTH_REQUEST_EXPIRED")) return "EXPIRED";
  if (message.includes("SYNC_AUTH_STATE_MISMATCH")) return "STATE_MISMATCH";
  return "UNKNOWN";
};

const isStaleCallbackFailure = (reason: OAuthCallbackFailureReason): boolean =>
  reason === "NO_PENDING" || reason === "EXPIRED" || reason === "STATE_MISMATCH";

const toSyncAuthReason = (reason: OAuthCallbackFailureReason): SyncAuthResultReason => {
  if (reason === "NO_PENDING") return "NO_PENDING";
  if (reason === "EXPIRED") return "EXPIRED";
  if (reason === "STATE_MISMATCH") return "STATE_MISMATCH";
  return "UNKNOWN";
};

export const extractAuthCallbackUrl = (argv: string[]): string | null => {
  for (const arg of argv) {
    if (typeof arg !== "string") continue;
    if (arg.startsWith(OAUTH_AUTH_PREFIX)) {
      return arg;
    }
  }
  return null;
};

export const handleDeepLinkUrl = async (url: string): Promise<boolean> => {
  if (url.startsWith(OAUTH_RETURN_PREFIX)) {
    focusMainWindow();
    logger.info("OAuth return deep link handled", { url });
    return true;
  }

  if (!url.startsWith(OAUTH_CALLBACK_PREFIX)) {
    return false;
  }

  try {
    await syncService.handleOAuthCallback(url);
    focusMainWindow();
    broadcastAuthResult({
      status: "success",
      timestamp: new Date().toISOString(),
    });
    logger.info("OAuth callback processed", { url });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const reason = classifyCallbackFailure(error);
    const status = syncService.getStatus();
    if (status.connected && isStaleCallbackFailure(reason)) {
      focusMainWindow();
      broadcastAuthResult({
        status: "stale",
        reason: toSyncAuthReason(reason),
        detail: message,
        timestamp: new Date().toISOString(),
      });
      logger.warn("OAuth callback arrived after connection was already established", {
        url,
        reason,
        error,
      });
      return true;
    }

    focusMainWindow();
    broadcastAuthResult({
      status: "error",
      reason: toSyncAuthReason(reason),
      detail: message,
      timestamp: new Date().toISOString(),
    });
    logger.error(status.connected
      ? "Failed to process OAuth callback even though sync is connected"
      : "Failed to process OAuth callback", {
      url,
      reason,
      error,
    });
    return false;
  }
};
