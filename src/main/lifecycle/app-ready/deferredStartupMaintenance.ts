import type { createLogger } from "../../../shared/logger/index.js";
import { projectService } from "../../domains/project/index.js";
import { snapshotService } from "../../domains/recovery/index.js";
import { ensureBootstrapReady } from "../bootstrap/index.js";

type Logger = ReturnType<typeof createLogger>;

const STARTUP_MAINTENANCE_DELAY_MS = 1500;
const isStartupMaintenanceDisabled =
  process.env.LUIE_DISABLE_STARTUP_MAINTENANCE === "1" ||
  process.env.LUIE_E2E_STRESS_MODE === "1";

const runDeferredStartupMaintenance = async (logger: Logger): Promise<void> => {
  const startedAt = Date.now();
  const status = await ensureBootstrapReady();
  if (!status.isReady) {
    logger.error("App bootstrap did not complete", status);
    return;
  }

  try {
    const { autoSaveManager } =
      await import("../../domains/manuscript/index.js");
    await autoSaveManager.flushMirrorsToSnapshots("startup-recovery");
    const results = await Promise.allSettled([
      snapshotService.pruneSnapshotsAllProjects(),
      snapshotService.cleanupOrphanArtifacts("startup"),
    ]);
    const failure = results.find((result) => result.status === "rejected");
    if (failure?.status === "rejected") throw failure.reason;
  } catch (error) {
    logger.warn("Snapshot recovery/pruning skipped", error);
  }

  try {
    await projectService.reconcileProjectPathDuplicates();
  } catch (error) {
    logger.warn("Project path duplicate reconciliation skipped", error);
  }

  try {
    const scheduledExports = await projectService.scheduleStalePackageExports();
    logger.info("Stale project checkpoint recovery scheduled", {
      scheduledExports,
    });
  } catch (error) {
    logger.warn("Stale project checkpoint recovery skipped", error);
  }

  try {
    const { entityRelationService } =
      await import("../../domains/world/index.js");
    await entityRelationService.cleanupOrphanRelationsAcrossProjects({
      dryRun: true,
    });
    await entityRelationService.cleanupOrphanRelationsAcrossProjects({
      dryRun: false,
    });
  } catch (error) {
    logger.warn("Entity relation orphan cleanup skipped", error);
  }

  try {
    const { dbMaintenanceService } =
      await import("../../services/features/dbMaintenance/index.js");
    await dbMaintenanceService.purgeOrphanDerivedRows({ dryRun: true });
    await dbMaintenanceService.purgeOrphanDerivedRows({ dryRun: false });
    await dbMaintenanceService.purgeInvalidEmbeddings({
      dryRun: true,
      limit: 5000,
    });
    await dbMaintenanceService.purgeInvalidEmbeddings({
      dryRun: false,
      limit: 5000,
    });
  } catch (error) {
    logger.warn("Invalid embedding cleanup skipped", error);
  }

  logger.info("Deferred startup maintenance completed", {
    elapsedMs: Date.now() - startedAt,
  });
};

let timer: ReturnType<typeof setTimeout> | null = null;
let running: Promise<void> | null = null;
let logger: Logger | null = null;
let pending = false;
let completed = false;
let paused = false;

const start = (): void => {
  const currentLogger = logger;
  if (!currentLogger || running || completed) return;
  timer = null;
  pending = false;
  const run = runDeferredStartupMaintenance(currentLogger);
  running = run;
  void run.then(
    () => {
      if (running !== run) return;
      running = null;
      logger = null;
      completed = true;
    },
    (error) => {
      if (running !== run) return;
      running = null;
      logger = null;
      completed = true;
      currentLogger.error("Deferred startup maintenance failed", error);
    },
  );
};

export const scheduleDeferredStartupMaintenance = (
  currentLogger: Logger,
  reason: string,
): void => {
  if (isStartupMaintenanceDisabled) {
    currentLogger.info("Deferred startup maintenance skipped", {
      reason: "runtime-flag",
      trigger: reason,
    });
    return;
  }
  if (pending || running || completed) return;
  pending = true;
  logger = currentLogger;
  currentLogger.info("Deferred startup maintenance scheduled", {
    reason,
    delayMs: STARTUP_MAINTENANCE_DELAY_MS,
  });
  if (!paused) timer = setTimeout(start, STARTUP_MAINTENANCE_DELAY_MS);
};

export const pauseDeferredStartupMaintenance = async (): Promise<void> => {
  paused = true;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (running) await running;
};

export const resumeDeferredStartupMaintenance = (): void => {
  paused = false;
  if (!pending || timer || running || completed || !logger) return;
  timer = setTimeout(start, STARTUP_MAINTENANCE_DELAY_MS);
};
