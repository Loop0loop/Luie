import { createLogger } from "../shared/logger/index.js";
import type {
  ElectrobunDeepLinkPort,
  ElectrobunShellCallbacks,
} from "./types.js";

const logger = createLogger("ElectrobunMain");

type StartElectrobunShellInput = {
  argv: string[];
  lifecycle: ElectrobunShellCallbacks;
  deepLink: ElectrobunDeepLinkPort;
};

/**
 * Electrobun bootstrap scaffold.
 * Mirrors the Electron main startup order so runtime adapters can swap in
 * without changing domain and lifecycle code paths.
 */
export const startElectrobunShell = ({
  argv,
  lifecycle,
  deepLink,
}: StartElectrobunShellInput): void => {
  lifecycle.registerProtocol();

  if (!lifecycle.registerSingleInstance()) {
    logger.warn("Electrobun shell aborted: single-instance lock failed");
    return;
  }

  lifecycle.initializeSync();

  const callbackUrl = deepLink.extractAuthCallbackUrl(argv);
  if (callbackUrl) {
    void deepLink.handleDeepLinkUrl(callbackUrl);
  }

  lifecycle.registerAppReady();
  lifecycle.registerShutdownHandlers();
  logger.info("Electrobun shell scaffold initialized");
};
