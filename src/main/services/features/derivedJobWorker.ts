import { createLogger } from "../../../shared/logger/index.js";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, memoryBuildJob } from "../../infra/database/index.js";
import { dbMaintenanceService } from "./dbMaintenanceService.js";
import { embeddingProjector } from "./memory/embeddingProjector.js";
import { chapterSummaryProjector } from "./memory/chapterSummaryProjector.js";
import { MEMORY_JOB_TYPES } from "./memory/memoryJobConstants.js";
import { memoryProjectionService } from "./memory/memoryProjectionService.js";
import {
  listProjectsWithPendingEpisodeExtractionJobs,
  processPendingLlmEpisodeExtractionJobs,
} from "./memory/episode/memoryEpisodeExtractionProcessor.js";
import {
  listProjectsWithPendingTemporalFactEvidence,
  processPendingLlmTemporalFactExtraction,
} from "./memory/temporal/memoryTemporalFactExtractionRunner.js";
import { generateProjectNarrativeSummaryHierarchy } from "./memory/summary/memoryNarrativeSummaryRunner.js";
import { refreshStaleProjectNarrativeSummaries } from "./memory/summary/memoryNarrativeSummaryDrift.js";
import {
  scheduleProjectNarrativeCommunities,
  scheduleProjectNarrativeHierarchyScopes,
} from "./memory/summary/memoryNarrativeSummaryScheduler.js";

const logger = createLogger("DerivedJobWorker");
const loadAutoSaveManager = async () =>
  (await import("../../manager/autoSave/index.js")).autoSaveManager;
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
  isStressMode ? 500 : 500,
);
const SEARCH_BATCH_SIZE = toPositiveInt(
  process.env.LUIE_DERIVED_SEARCH_BATCH,
  isStressMode ? 50 : 50,
);
const MEMORY_BATCH_SIZE = toPositiveInt(
  process.env.LUIE_DERIVED_MEMORY_BATCH,
  isStressMode ? 50 : 50,
);
const MEMORY_PROJECTS_PER_TICK = toPositiveInt(
  process.env.LUIE_DERIVED_MEMORY_PROJECTS_PER_TICK,
  isStressMode ? 4 : 2,
);
const SUMMARY_BATCH_SIZE = toPositiveInt(
  process.env.LUIE_DERIVED_SUMMARY_BATCH,
  isStressMode ? 20 : 10,
);
const EMBEDDING_BATCH_SIZE = toPositiveInt(
  process.env.LUIE_DERIVED_EMBEDDING_BATCH,
  isStressMode ? 25 : 5,
);
const EPISODE_BATCH_SIZE = toPositiveInt(
  process.env.LUIE_DERIVED_EPISODE_BATCH,
  isStressMode ? 10 : 2,
);
const TEMPORAL_FACT_BATCH_SIZE = toPositiveInt(
  process.env.LUIE_DERIVED_TEMPORAL_FACT_BATCH,
  isStressMode ? 10 : 2,
);
const TICK_WARN_THRESHOLD_MS = toPositiveInt(
  process.env.LUIE_DERIVED_TICK_WARN_MS,
  100,
);
const TICK_WARN_THRESHOLD_WITH_SUMMARY_MS = toPositiveInt(
  process.env.LUIE_DERIVED_TICK_WARN_SUMMARY_MS,
  5000,
);
const TICK_WARN_THRESHOLD_WITH_EMBEDDING_MS = toPositiveInt(
  process.env.LUIE_DERIVED_TICK_WARN_EMBEDDING_MS,
  8000,
);

const countPendingMemoryJobs = async (
  projectId: string,
  jobType: string,
): Promise<number> => {
  const rows = await db
    .getClient()
    .select({ count: sql<number>`count(*)` })
    .from(memoryBuildJob)
    .where(
      and(
        eq(memoryBuildJob.projectId, projectId),
        eq(memoryBuildJob.jobType, jobType),
        inArray(memoryBuildJob.status, ["pending", "failed", "running"]),
      ),
    );
  return Number(rows[0]?.count ?? 0);
};

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
      const episodeProjectsToProcess = await listProjectsWithPendingEpisodeExtractionJobs(
        MEMORY_PROJECTS_PER_TICK,
      );
      const temporalFactProjectsToProcess = await listProjectsWithPendingTemporalFactEvidence(
        MEMORY_PROJECTS_PER_TICK,
      );
      const projectIdsToProcess = Array.from(
        new Set([
          ...projectsToProcess,
          ...episodeProjectsToProcess,
          ...temporalFactProjectsToProcess,
        ]),
      ).slice(0, MEMORY_PROJECTS_PER_TICK);

      let memoryQueued = 0;
      let memoryProcessed = 0;
      let summaryQueued = 0;
      let summaryProcessed = 0;
      let narrativeSummaryGenerated = 0;
      let embeddingQueued = 0;
      let embeddingProcessed = 0;
      let episodeQueued = 0;
      let episodeProcessed = 0;
      let temporalFactProcessed = 0;
      await projectIdsToProcess.reduce<Promise<void>>(async (prev, projectId) => {
        await prev;
        const result = await memoryProjectionService.processPendingChunkJobs({
          projectId,
          limit: MEMORY_BATCH_SIZE,
        });
        memoryQueued += result.queued;
        memoryProcessed += result.processed;
        const chunkBacklog = await countPendingMemoryJobs(
          projectId,
          MEMORY_JOB_TYPES.REBUILD_CHUNKS,
        );
        if (chunkBacklog === 0) {
          const episodeResult = await processPendingLlmEpisodeExtractionJobs({
            projectId,
            limit: EPISODE_BATCH_SIZE,
          });
          episodeQueued += episodeResult.queued;
          episodeProcessed += episodeResult.processed;

          const temporalFactResult = await processPendingLlmTemporalFactExtraction({
            projectId,
            limit: TEMPORAL_FACT_BATCH_SIZE,
          });
          temporalFactProcessed += temporalFactResult.extracted;

          const summaryResult = await chapterSummaryProjector.processPendingSummaryJobs({
            projectId,
            limit: SUMMARY_BATCH_SIZE,
          });
          summaryQueued += summaryResult.queued;
          summaryProcessed += summaryResult.processed;
          const summaryBacklog = await countPendingMemoryJobs(
            projectId,
            MEMORY_JOB_TYPES.REBUILD_SUMMARY,
          );
          if (summaryBacklog === 0) {
            const narrativeSummaryRefresh =
              await refreshStaleProjectNarrativeSummaries({ projectId });
            if (narrativeSummaryRefresh.inspected === 0) {
              const narrativeSummaryResult =
                await generateProjectNarrativeSummaryHierarchy({ projectId });
              narrativeSummaryGenerated += narrativeSummaryResult.generated;
            } else {
              narrativeSummaryGenerated += narrativeSummaryRefresh.refreshed;
            }
            const scopedNarrativeSummaryResult =
              await scheduleProjectNarrativeHierarchyScopes({ projectId });
            narrativeSummaryGenerated += scopedNarrativeSummaryResult.generated;
            const communityNarrativeSummaryResult =
              await scheduleProjectNarrativeCommunities({ projectId });
            narrativeSummaryGenerated += communityNarrativeSummaryResult.generated;

            const embeddingResult = await embeddingProjector.processPendingEmbeddingJobs({
              projectId,
              limit: EMBEDDING_BATCH_SIZE,
            });
            embeddingQueued += embeddingResult.queued;
            embeddingProcessed += embeddingResult.processed;
          }
        }
      }, Promise.resolve());

      if (
        search.queued > 0 ||
        memoryQueued > 0 ||
        episodeQueued > 0 ||
        temporalFactProcessed > 0 ||
        summaryQueued > 0 ||
        narrativeSummaryGenerated > 0 ||
        embeddingQueued > 0
      ) {
        logger.info("Derived job worker tick processed", {
          elapsedMs: Date.now() - startedAt,
          searchQueued: search.queued,
          searchProcessed: search.processed,
          searchFailed: search.failed,
          memoryQueued,
          memoryProcessed,
          episodeQueued,
          episodeProcessed,
          temporalFactProcessed,
          summaryQueued,
          summaryProcessed,
          narrativeSummaryGenerated,
          embeddingQueued,
          embeddingProcessed,
          projectCount: projectIdsToProcess.length,
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
      const thresholdMs =
        embeddingQueued > 0 || embeddingProcessed > 0
          ? TICK_WARN_THRESHOLD_WITH_EMBEDDING_MS
          : summaryQueued > 0 ||
              summaryProcessed > 0 ||
              narrativeSummaryGenerated > 0 ||
              episodeQueued > 0 ||
              episodeProcessed > 0 ||
              temporalFactProcessed > 0
            ? TICK_WARN_THRESHOLD_WITH_SUMMARY_MS
            : TICK_WARN_THRESHOLD_MS;
      if (
        elapsedMs >= thresholdMs &&
        Date.now() - this.lastTickSlowWarnAt >= 10_000
      ) {
        this.lastTickSlowWarnAt = Date.now();
        logger.warn("Derived job worker tick elapsed exceeded threshold", {
          elapsedMs,
          thresholdMs,
          searchBatchSize: SEARCH_BATCH_SIZE,
          memoryBatchSize: MEMORY_BATCH_SIZE,
          summaryBatchSize: SUMMARY_BATCH_SIZE,
          embeddingBatchSize: EMBEDDING_BATCH_SIZE,
          episodeBatchSize: EPISODE_BATCH_SIZE,
          temporalFactBatchSize: TEMPORAL_FACT_BATCH_SIZE,
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
