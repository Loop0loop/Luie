import { createLogger } from "../../../shared/logger/index.js";
import { dbMaintenanceService } from "./dbMaintenanceService.js";
import { memoryProjectionService } from "./memory/memoryProjectionService.js";

const logger = createLogger("DerivedJobWorker");

const TICK_INTERVAL_MS = 1500;
const SEARCH_BATCH_SIZE = 20;
const MEMORY_BATCH_SIZE = 20;

class DerivedJobWorker {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private inTick = false;

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
    });
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    const startedAt = Date.now();
    while (this.inTick && Date.now() - startedAt < 5_000) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

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
      const search = await dbMaintenanceService.processPendingSearchJobs({
        limit: SEARCH_BATCH_SIZE,
      });

      const projectsToProcess = await dbMaintenanceService.listProjectsWithPendingMemoryJobs(
        MEMORY_BATCH_SIZE,
      );

      let memoryQueued = 0;
      let memoryProcessed = 0;
      for (const projectId of projectsToProcess) {
        const result = await memoryProjectionService.processPendingChunkJobs({
          projectId,
          limit: MEMORY_BATCH_SIZE,
        });
        memoryQueued += result.queued;
        memoryProcessed += result.processed;
      }

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
