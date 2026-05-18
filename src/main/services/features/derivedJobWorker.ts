import { createLogger } from "../../../shared/logger/index.js";
import { dbMaintenanceService } from "./dbMaintenanceService.js";
import { memoryProjectionService } from "./memory/memoryProjectionService.js";

const logger = createLogger("DerivedJobWorker");
const loadAutoSaveManager = async () =>
  (await import("../../manager/autoSaveManager.js")).autoSaveManager;
const isStressMode =
  process.env.LUIE_E2E_STRESS_MODE === "1" ||
  process.env.LUIE_DERIVED_STRESS_MODE === "1";

const toPositiveInt = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const TICK_INTERVAL_MS = toPositiveInt(
  process.env.LUIE_DERIVED_TICK_MS,
  isStressMode ? 500 : 2000,
);
const SEARCH_BATCH_SIZE = toPositiveInt(
  process.env.LUIE_DERIVED_SEARCH_BATCH,
  isStressMode ? 50 : 5,
);
const MEMORY_BATCH_SIZE = toPositiveInt(
  process.env.LUIE_DERIVED_MEMORY_BATCH,
  isStressMode ? 50 : 2,
);
const MEMORY_PROJECTS_PER_TICK = toPositiveInt(
  process.env.LUIE_DERIVED_MEMORY_PROJECTS_PER_TICK,
  isStressMode ? 4 : 1,
);
const TICK_WARN_THRESHOLD_MS = toPositiveInt(
  process.env.LUIE_DERIVED_TICK_WARN_MS,
  100,
);

class DerivedJobWorker {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private inTick = false;
  private lastEditDeferLogAt = 0;
  private lastTickSlowWarnAt = 0;

  start(): void {
    if (this.running) return;
    this.running = true;
    this.timer = setInterval(() => {
      void this.tick();
    }, TICK_INTERVAL_MS);
    void dbMaintenanceService.recoverStaleRunningJobs();
    void this.tick();
    logger.info("Derived job worker started", {
      tickIntervalMs: TICK_INTERVAL_MS,
      searchBatchSize: SEARCH_BATCH_SIZE,
      memoryBatchSize: MEMORY_BATCH_SIZE,
      memoryProjectsPerTick: MEMORY_PROJECTS_PER_TICK,
    });
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    const startedAt = Date.now();
    await new Promise<void>((resolve) => {
      const poll = () => {
        if (!this.inTick || Date.now() - startedAt >= 5_000) {
          resolve();
          return;
        }
        setTimeout(poll, 50);
      };
      poll();
    });

    logger.info("Derived job worker stopped", {
      drained: !this.inTick,
      waitedMs: Date.now() - startedAt,
    });
  }

  private async tick(): Promise<void> {
    if (!this.running || this.inTick) return;
    this.inTick = true;
    const startedAt = Date.now();

    try {
      const autoSaveManager = await loadAutoSaveManager();
      const pendingSaveCount = autoSaveManager.getPendingSaveCount();
      if (!isStressMode && pendingSaveCount > 0) {
        if (Date.now() - this.lastEditDeferLogAt >= 10_000) {
          this.lastEditDeferLogAt = Date.now();
          logger.info("Derived job worker tick deferred for active editing", {
            pendingSaveCount,
          });
        }
        return;
      }

      const search = await dbMaintenanceService.processPendingSearchJobs({
        limit: SEARCH_BATCH_SIZE,
      });

      const projectsToProcess = await dbMaintenanceService.listProjectsWithPendingMemoryJobs(
        MEMORY_PROJECTS_PER_TICK,
      );

      let memoryQueued = 0;
      let memoryProcessed = 0;
      await projectsToProcess.reduce<Promise<void>>(async (prev, projectId) => {
        await prev;
        const result = await memoryProjectionService.processPendingChunkJobs({
          projectId,
          limit: MEMORY_BATCH_SIZE,
        });
        memoryQueued += result.queued;
        memoryProcessed += result.processed;
      }, Promise.resolve());

      if (search.queued > 0 || memoryQueued > 0) {
        logger.info("Derived job worker tick processed", {
          elapsedMs: Date.now() - startedAt,
          searchQueued: search.queued,
          searchProcessed: search.processed,
          searchFailed: search.failed,
          memoryQueued,
          memoryProcessed,
          projectCount: projectsToProcess.length,
        });
      }
      if (search.failed > 0) {
        logger.warn("Derived job worker search failures detected", {
          failed: search.failed,
          queued: search.queued,
        });
      }
      const longPending = await dbMaintenanceService.getLongPendingStats();
      if (
        longPending.searchLongPendingCount > 0 ||
        longPending.memoryLongPendingCount > 0
      ) {
        logger.warn("Derived job worker long pending detected", {
          searchLongPendingCount: longPending.searchLongPendingCount,
          memoryLongPendingCount: longPending.memoryLongPendingCount,
        });
      }
      const elapsedMs = Date.now() - startedAt;
      if (
        elapsedMs >= TICK_WARN_THRESHOLD_MS &&
        Date.now() - this.lastTickSlowWarnAt >= 10_000
      ) {
        this.lastTickSlowWarnAt = Date.now();
        logger.warn("Derived job worker tick elapsed exceeded threshold", {
          elapsedMs,
          thresholdMs: TICK_WARN_THRESHOLD_MS,
          searchBatchSize: SEARCH_BATCH_SIZE,
          memoryBatchSize: MEMORY_BATCH_SIZE,
          memoryProjectsPerTick: MEMORY_PROJECTS_PER_TICK,
        });
      }
    } catch (error) {
      logger.warn("Derived job worker tick failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.inTick = false;
    }
  }
}

export const derivedJobWorker = new DerivedJobWorker();
