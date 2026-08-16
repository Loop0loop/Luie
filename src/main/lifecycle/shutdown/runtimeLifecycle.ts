import { utilityProcessBridge } from "../../infra/utility-process/index.js";
import { syncService } from "../../domains/sync/index.js";
import {
  pauseDeferredStartupMaintenance,
  resumeDeferredStartupMaintenance,
} from "../app-ready/index.js";
import type { createLogger } from "../../../shared/logger/index.js";

type Logger = ReturnType<typeof createLogger>;

export const pauseShutdownBackgroundWork = async (): Promise<void> => {
  await Promise.all([
    syncService.pauseForShutdown(),
    pauseDeferredStartupMaintenance(),
  ]);
};

export const resumeShutdownBackgroundWork = (): void => {
  syncService.resumeAfterShutdownCancel();
  resumeDeferredStartupMaintenance();
};

export const stopUtilityProcess = async (): Promise<void> => {
  await utilityProcessBridge.stop();
};

export const stopShutdownRuntimeServices = async (
  logger: Logger,
): Promise<void> => {
  try {
    const { derivedJobWorker } =
      await import("../../domains/manuscript/index.js");
    await derivedJobWorker.stop();
  } catch (error) {
    logger.warn("Failed to stop derived job worker during quit", error);
  }
  try {
    const { sidecarManager } = await import("../../domains/settings/llm.js");
    await sidecarManager.stop();
  } catch (error) {
    logger.warn("Failed to stop local LLM sidecar during quit", error);
  }
  try {
    await stopUtilityProcess();
  } catch (error) {
    logger.warn("Failed to stop utility process during quit", error);
  }
};
