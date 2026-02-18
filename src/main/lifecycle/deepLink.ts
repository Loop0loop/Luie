import { createLogger } from "../../shared/logger/index.js";
import { syncService } from "../services/features/syncService.js";

const logger = createLogger("DeepLink");

const OAUTH_CALLBACK_PREFIX = "luie://auth/callback";

export const extractAuthCallbackUrl = (argv: string[]): string | null => {
  for (const arg of argv) {
    if (typeof arg !== "string") continue;
    if (arg.startsWith(OAUTH_CALLBACK_PREFIX)) {
      return arg;
    }
  }
  return null;
};

export const handleDeepLinkUrl = async (url: string): Promise<boolean> => {
  if (!url.startsWith(OAUTH_CALLBACK_PREFIX)) {
    return false;
  }

  try {
    await syncService.handleOAuthCallback(url);
    logger.info("OAuth callback processed", { url });
    return true;
  } catch (error) {
    logger.error("Failed to process OAuth callback", { url, error });
    return false;
  }
};
