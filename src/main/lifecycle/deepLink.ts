import { app, shell } from "electron";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createLogger } from "../../shared/logger/index.js";
import { windowManager } from "../manager/index.js";
import { syncService } from "../services/features/syncService.js";

const logger = createLogger("DeepLink");

const OAUTH_CALLBACK_PREFIX = "luie://auth/callback";
const OAUTH_RETURN_PREFIX = "luie://auth/return";
const OAUTH_AUTH_PREFIX = "luie://auth/";

const focusMainWindow = (): void => {
  const mainWindow = windowManager.getMainWindow();
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
};

const buildAuthResultPageUrl = (status: "success" | "error", detail?: string): string => {
  const query = new URLSearchParams({ status });
  if (detail) {
    query.set("detail", detail);
  }

  const queryString = query.toString();
  const devServerUrl = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";
  const useDevServer = !app.isPackaged && process.env.NODE_ENV !== "production";
  if (useDevServer) {
    return `${devServerUrl}/auth-result.html?${queryString}`;
  }

  const rendererEntry = pathToFileURL(path.join(__dirname, "../renderer/auth-result.html")).toString();
  return `${rendererEntry}?${queryString}`;
};

const openAuthResultPage = async (status: "success" | "error", detail?: string): Promise<void> => {
  try {
    await shell.openExternal(buildAuthResultPageUrl(status, detail));
  } catch (error) {
    logger.warn("Failed to open auth result page", { error, status });
  }
};

const classifyCallbackFailure = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("SYNC_AUTH_NO_PENDING_SESSION")) return "NO_PENDING";
  if (message.includes("SYNC_AUTH_REQUEST_EXPIRED")) return "EXPIRED";
  if (message.includes("SYNC_AUTH_STATE_MISMATCH")) return "STATE_MISMATCH";
  if (message.includes("bad_oauth_state")) return "STATE_MISMATCH";
  if (message.includes("OAuth callback with invalid state")) return "STATE_MISMATCH";
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
    void openAuthResultPage("success");
    logger.info("OAuth callback processed", { url });
    return true;
  } catch (error) {
    focusMainWindow();
    const message = error instanceof Error ? error.message : String(error);
    void openAuthResultPage("error", message);
    logger.error("Failed to process OAuth callback", {
      url,
      reason: classifyCallbackFailure(error),
      error,
    });
    return false;
  }
};
