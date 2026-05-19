import crypto from "node:crypto";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "../../database/index.js";
import {
  character,
  chapter,
  chapterBody,
  event,
  faction,
  memoryBuildJob,
  memoryEmbedding,
  note,
  plot,
  scene,
  scrapMemo,
  searchDirtyQueue,
  synopsis,
} from "../../database/schema.js";
import { chapterSearchCacheService } from "./chapterSearchCacheService.js";
import { createLogger } from "../../../shared/logger/index.js";
import {
  MEMORY_JOB_PRIORITY,
  MEMORY_JOB_TYPES,
  MEMORY_TARGET_TYPES,
} from "./memory/memoryJobConstants.js";

function hash(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

const logger = createLogger("DbMaintenanceService");
const MAX_SEARCH_ATTEMPTS = 5;
const SEARCH_RETRY_BASE_BACKOFF_MS = 2_000;
const STALE_RUNNING_THRESHOLD_MS = 30_000;
const LONG_PENDING_THRESHOLD_MS = 60_000;
const EMBEDDING_VECTOR_ELEMENT_BYTES = Float32Array.BYTES_PER_ELEMENT;
const HEALTH_SCAN_PAGE_SIZE = 100;

class DbMaintenanceService {
  async purgeOrphanDerivedRows(options?: {
    dryRun?: boolean;
  }): Promise<{
    dryRun: boolean;
    orphanSearchDirtyQueueCount: number;
    orphanMemoryChunkCount: number;
    orphanMemoryBuildJobCount: number;
    orphanMemoryEmbeddingCount: number;
    purgedCount: number;
  }> {
    const dryRun = options?.dryRun ?? false;
    const client = db.getClient();
    const [searchRows, chunkRows, jobRows, embeddingRows] = await Promise.all([
      client.all<{ count: number }>(sql`
        SELECT COUNT(*) as count
        FROM "SearchDirtyQueue" q
        WHERE NOT EXISTS (SELECT 1 FROM "Project" p WHERE p."id" = q."projectId");
      `),
      client.all<{ count: number }>(sql`
        SELECT COUNT(*) as count
        FROM "MemoryChunk" c
        WHERE NOT EXISTS (SELECT 1 FROM "Project" p WHERE p."id" = c."projectId");
      `),
      client.all<{ count: number }>(sql`
        SELECT COUNT(*) as count
        FROM "MemoryBuildJob" j
        WHERE NOT EXISTS (SELECT 1 FROM "Project" p WHERE p."id" = j."projectId");
      `),
      client.all<{ count: number }>(sql`
        SELECT COUNT(*) as count
        FROM "MemoryEmbedding" e
        WHERE NOT EXISTS (SELECT 1 FROM "Project" p WHERE p."id" = e."projectId");
      `),
    ]);
    const orphanSearchDirtyQueueCount = Number(searchRows[0]?.count ?? 0);
    const orphanMemoryChunkCount = Number(chunkRows[0]?.count ?? 0);
    const orphanMemoryBuildJobCount = Number(jobRows[0]?.count ?? 0);
    const orphanMemoryEmbeddingCount = Number(embeddingRows[0]?.count ?? 0);
    if (dryRun) {
      return {
        dryRun,
        orphanSearchDirtyQueueCount,
        orphanMemoryChunkCount,
        orphanMemoryBuildJobCount,
        orphanMemoryEmbeddingCount,
        purgedCount: 0,
      };
    }
    await client.run(sql`
      DELETE FROM "MemoryEmbedding"
      WHERE NOT EXISTS (SELECT 1 FROM "Project" p WHERE p."id" = "MemoryEmbedding"."projectId");
    `);
    await client.run(sql`
      DELETE FROM "MemoryChunk"
      WHERE NOT EXISTS (SELECT 1 FROM "Project" p WHERE p."id" = "MemoryChunk"."projectId");
    `);
    await client.run(sql`
      DELETE FROM "MemoryBuildJob"
      WHERE NOT EXISTS (SELECT 1 FROM "Project" p WHERE p."id" = "MemoryBuildJob"."projectId");
    `);
    await client.run(sql`
      DELETE FROM "SearchDirtyQueue"
      WHERE NOT EXISTS (SELECT 1 FROM "Project" p WHERE p."id" = "SearchDirtyQueue"."projectId");
    `);
    return {
      dryRun,
      orphanSearchDirtyQueueCount,
      orphanMemoryChunkCount,
      orphanMemoryBuildJobCount,
      orphanMemoryEmbeddingCount,
      purgedCount:
        orphanSearchDirtyQueueCount +
        orphanMemoryChunkCount +
        orphanMemoryBuildJobCount +
        orphanMemoryEmbeddingCount,
    };
  }

  async purgeInvalidEmbeddings(options?: {
    dryRun?: boolean;
    limit?: number;
  }): Promise<{ dryRun: boolean; invalidCount: number; purgedCount: number }> {
    const dryRun = options?.dryRun ?? false;
    const limit = Math.max(1, options?.limit ?? 2000);
    const client = db.getClient();
    const invalidRows = await client.all<{ id: string }>(sql`
      SELECT "id"
      FROM "MemoryEmbedding"
      WHERE "dimension" <= 0
        OR length("vec") != "dimension" * ${EMBEDDING_VECTOR_ELEMENT_BYTES}
      LIMIT ${limit};
    `);
    const invalidCount = invalidRows.length;
    if (invalidCount === 0 || dryRun) {
      return { dryRun, invalidCount, purgedCount: 0 };
    }
    const ids = invalidRows.map((row) => row.id);
    const result = await client
      .delete(memoryEmbedding)
      .where(inArray(memoryEmbedding.id, ids));
    return {
      dryRun,
      invalidCount,
      purgedCount: result.changes,
    };
  }

  private async upsertPendingSearchJob(input: {
    projectId: string;
    sourceType: string;
    sourceId: string;
    reason: string;
    now: string;
  }): Promise<void> {
    const client = db.getClient();
    const existing = await client.all<{ id: string }>(
      sql`SELECT "id" FROM "SearchDirtyQueue"
          WHERE "projectId" = ${input.projectId}
            AND "sourceType" = ${input.sourceType}
            AND "sourceId" = ${input.sourceId}
            AND "status" = 'pending'
          ORDER BY "updatedAt" DESC
          LIMIT 1;`,
    );
    if (existing.length > 0) {
      await client.run(
        sql`UPDATE "SearchDirtyQueue"
            SET "reason" = ${input.reason},
                "updatedAt" = ${input.now}
            WHERE "id" = ${existing[0].id};`,
      );
      return;
    }
    await client.run(
      sql`INSERT INTO "SearchDirtyQueue" ("id","projectId","sourceType","sourceId","reason","status","attempts","createdAt","updatedAt")
          VALUES (${crypto.randomUUID()}, ${input.projectId}, ${input.sourceType}, ${input.sourceId}, ${input.reason}, 'pending', 0, ${input.now}, ${input.now});`,
    );
  }

  private async upsertPendingMemoryBuildJob(input: {
    projectId: string;
    targetType: string;
    targetId: string;
    priority: number;
    now: string;
  }): Promise<void> {
    const client = db.getClient();
    const existing = await client.all<{ id: string }>(
      sql`SELECT "id" FROM "MemoryBuildJob"
          WHERE "projectId" = ${input.projectId}
            AND "targetType" = ${input.targetType}
            AND "targetId" = ${input.targetId}
            AND "jobType" = ${MEMORY_JOB_TYPES.REBUILD_CHUNKS}
            AND "status" = 'pending'
          ORDER BY "updatedAt" DESC
          LIMIT 1;`,
    );
    if (existing.length > 0) {
      await client.run(
        sql`UPDATE "MemoryBuildJob"
            SET "priority" = ${input.priority},
                "updatedAt" = ${input.now}
            WHERE "id" = ${existing[0].id};`,
      );
      return;
    }
    await client.run(
      sql`INSERT INTO "MemoryBuildJob" ("id","projectId","targetType","targetId","jobType","status","priority","attempts","createdAt","updatedAt")
          VALUES (${crypto.randomUUID()}, ${input.projectId}, ${input.targetType}, ${input.targetId}, ${MEMORY_JOB_TYPES.REBUILD_CHUNKS}, 'pending', ${input.priority}, 0, ${input.now}, ${input.now});`,
    );
  }

  async recoverStaleRunningJobs(): Promise<void> {
    const client = db.getClient();
    const now = Date.now();
    const runningSearch = await client
      .select()
      .from(searchDirtyQueue)
      .where(eq(searchDirtyQueue.status, "running"));
    const staleSearchIds = runningSearch
      .filter((row) => {
        const updatedAtMs = Date.parse(row.updatedAt);
        return Number.isFinite(updatedAtMs) && now - updatedAtMs >= STALE_RUNNING_THRESHOLD_MS;
      })
      .map((row) => row.id);
    if (staleSearchIds.length > 0) {
      await client
        .update(searchDirtyQueue)
        .set({ status: "pending", updatedAt: new Date().toISOString() })
        .where(inArray(searchDirtyQueue.id, staleSearchIds));
    }
    const runningMemory = await client
      .select()
      .from(memoryBuildJob)
      .where(eq(memoryBuildJob.status, "running"));
    const staleMemoryIds = runningMemory
      .filter((row) => {
        const updatedAtMs = Date.parse(row.updatedAt);
        return Number.isFinite(updatedAtMs) && now - updatedAtMs >= STALE_RUNNING_THRESHOLD_MS;
      })
      .map((row) => row.id);
    if (staleMemoryIds.length > 0) {
      await client
        .update(memoryBuildJob)
        .set({ status: "pending", updatedAt: new Date().toISOString() })
        .where(inArray(memoryBuildJob.id, staleMemoryIds));
    }
  }

  async markChapterSearchDirty(input: {
    projectId: string;
    chapterId: string;
    reason: string;
  }): Promise<void> {
    const now = new Date().toISOString();
    await this.upsertPendingSearchJob({
      projectId: input.projectId,
      sourceType: MEMORY_TARGET_TYPES.CHAPTER,
      sourceId: input.chapterId,
      reason: input.reason,
      now,
    });
  }

  async rebuildSearchIndex(projectId: string): Promise<{ success: boolean }> {
    const now = new Date().toISOString();
    await this.upsertPendingSearchJob({
      projectId,
      sourceType: MEMORY_TARGET_TYPES.CHAPTER,
      sourceId: projectId,
      reason: "search:rebuild-all",
      now,
    });
    return { success: true };
  }

  async getSearchIndexStatus(projectId: string) {
    const base = await chapterSearchCacheService.getIndexStatus(projectId);
    const rows = await db.getClient()
      .select({
        status: searchDirtyQueue.status,
        count: sql<number>`count(*)`,
      })
      .from(searchDirtyQueue)
      .where(eq(searchDirtyQueue.projectId, projectId))
      .groupBy(searchDirtyQueue.status);
    const grouped = new Map(rows.map((row) => [row.status, Number(row.count ?? 0)]));
    const pendingCount = grouped.get("pending") ?? 0;
    const runningCount = grouped.get("running") ?? 0;
    const failedCount = grouped.get("failed") ?? 0;
    const lastProcessedRows = await db.getClient()
      .select({ updatedAt: searchDirtyQueue.updatedAt })
      .from(searchDirtyQueue)
      .where(
        and(
          eq(searchDirtyQueue.projectId, projectId),
          inArray(searchDirtyQueue.status, ["completed", "failed"]),
        ),
      )
      .orderBy(sql`${searchDirtyQueue.updatedAt} DESC`)
      .limit(1);
    return {
      ...base,
      pendingCount,
      runningCount,
      failedCount,
      lastProcessedAt:
        lastProcessedRows.length > 0 ? lastProcessedRows[0].updatedAt : null,
    };
  }

  async rebuildMemoryChunks(input: {
    projectId: string;
    sourceType?: string;
    sourceId?: string;
  }): Promise<{ queued: number; processed: number }> {
    const client = db.getClient();
    const now = new Date().toISOString();
    if (input.sourceType && input.sourceId) {
      await this.upsertPendingMemoryBuildJob({
        projectId: input.projectId,
        targetType: input.sourceType,
        targetId: input.sourceId,
        priority: MEMORY_JOB_PRIORITY.CHUNKS,
        now,
      });
      return { queued: 1, processed: 0 };
    } else {
      const chapters = await client
        .select({ id: chapter.id })
        .from(chapter)
        .where(eq(chapter.projectId, input.projectId))
        .orderBy(asc(chapter.order));
      const scenes = await client
        .select({ id: scene.id })
        .from(scene)
        .where(and(eq(scene.projectId, input.projectId), isNull(scene.deletedAt)))
        .orderBy(asc(scene.order));
      const notes = await client
        .select({ id: note.id })
        .from(note)
        .where(and(eq(note.projectId, input.projectId), isNull(note.deletedAt)))
        .orderBy(asc(note.updatedAt));
      const synopses = await client
        .select({ id: synopsis.id })
        .from(synopsis)
        .where(and(eq(synopsis.projectId, input.projectId), isNull(synopsis.deletedAt)))
        .orderBy(asc(synopsis.updatedAt));
      const plots = await client
        .select({ id: plot.id })
        .from(plot)
        .where(and(eq(plot.projectId, input.projectId), isNull(plot.deletedAt)))
        .orderBy(asc(plot.updatedAt));
      const events = await client
        .select({ id: event.id })
        .from(event)
        .where(and(eq(event.projectId, input.projectId), isNull(event.deletedAt)))
        .orderBy(asc(event.updatedAt));
      const factions = await client
        .select({ id: faction.id })
        .from(faction)
        .where(and(eq(faction.projectId, input.projectId), isNull(faction.deletedAt)))
        .orderBy(asc(faction.updatedAt));
      const scraps = await client
        .select({ id: scrapMemo.id })
        .from(scrapMemo)
        .where(and(eq(scrapMemo.projectId, input.projectId), isNull(scrapMemo.deletedAt)))
        .orderBy(asc(scrapMemo.updatedAt));
      const characters = await client
        .select({ id: character.id })
        .from(character)
        .where(and(eq(character.projectId, input.projectId), isNull(character.deletedAt)))
        .orderBy(asc(character.updatedAt));

      const targets: Array<{ targetType: string; targetId: string }> = [
        ...chapters.map((row) => ({ targetType: MEMORY_TARGET_TYPES.CHAPTER, targetId: row.id })),
        ...scenes.map((row) => ({ targetType: MEMORY_TARGET_TYPES.SCENE, targetId: row.id })),
        ...notes.map((row) => ({ targetType: MEMORY_TARGET_TYPES.NOTE, targetId: row.id })),
        ...synopses.map((row) => ({ targetType: MEMORY_TARGET_TYPES.SYNOPSIS, targetId: row.id })),
        ...plots.map((row) => ({ targetType: MEMORY_TARGET_TYPES.PLOT, targetId: row.id })),
        ...events.map((row) => ({ targetType: MEMORY_TARGET_TYPES.EVENT, targetId: row.id })),
        ...factions.map((row) => ({ targetType: MEMORY_TARGET_TYPES.FACTION, targetId: row.id })),
        ...characters.map((row) => ({ targetType: MEMORY_TARGET_TYPES.CHARACTER, targetId: row.id })),
        ...scraps.map((row) => ({ targetType: MEMORY_TARGET_TYPES.SCRAP_MEMO, targetId: row.id })),
      ];

      const existingPending = await client
        .select({
          targetType: memoryBuildJob.targetType,
          targetId: memoryBuildJob.targetId,
        })
        .from(memoryBuildJob)
        .where(
          and(
            eq(memoryBuildJob.projectId, input.projectId),
            eq(memoryBuildJob.jobType, MEMORY_JOB_TYPES.REBUILD_CHUNKS),
            eq(memoryBuildJob.status, "pending"),
          ),
        );

      const existingKeys = new Set(
        existingPending.map((row) => `${row.targetType}:${row.targetId}`),
      );

      const toInsert = targets.filter(
        (target) => !existingKeys.has(`${target.targetType}:${target.targetId}`),
      );

      if (toInsert.length > 0) {
        await client.insert(memoryBuildJob).values(
          toInsert.map((target) => ({
            id: crypto.randomUUID(),
            projectId: input.projectId,
            targetType: target.targetType,
            targetId: target.targetId,
            jobType: MEMORY_JOB_TYPES.REBUILD_CHUNKS,
            status: "pending",
            priority: MEMORY_JOB_PRIORITY.CHUNKS,
            attempts: 0,
            createdAt: now,
            updatedAt: now,
          })),
        );
      }
      return { queued: targets.length, processed: 0 };
    }
  }

  private canRetrySearchRow(row: {
    status: string;
    attempts: number;
    updatedAt: string;
  }): boolean {
    if (row.status === "pending") return true;
    if (row.status !== "failed") return false;
    if (row.attempts >= MAX_SEARCH_ATTEMPTS) return false;
    const updatedAtMs = Date.parse(row.updatedAt);
    if (!Number.isFinite(updatedAtMs)) return true;
    const backoffMs = SEARCH_RETRY_BASE_BACKOFF_MS * Math.max(1, row.attempts);
    return Date.now() - updatedAtMs >= backoffMs;
  }

  async processPendingSearchJobs(input: {
    limit?: number;
  } = {}): Promise<{ queued: number; processed: number; failed: number }> {
    const client = db.getClient();
    const limit = input.limit ?? 20;
    const candidates = await client
      .select()
      .from(searchDirtyQueue)
      .where(inArray(searchDirtyQueue.status, ["pending", "failed"]))
      .orderBy(asc(searchDirtyQueue.updatedAt))
      .limit(Math.max(limit * 3, 30));
    const rows = candidates.filter((row) => this.canRetrySearchRow(row)).slice(0, limit);
    if (rows.length === 0) {
      return { queued: 0, processed: 0, failed: 0 };
    }

    const projects = Array.from(new Set(rows.map((row) => row.projectId)));
    const results = await Promise.all(
      projects.map(async (projectId) => {
        const projectRows = rows.filter((row) => row.projectId === projectId);
        const now = new Date().toISOString();
        await client
          .update(searchDirtyQueue)
          .set({ status: "running", updatedAt: now })
          .where(
            and(
              eq(searchDirtyQueue.projectId, projectId),
              inArray(
                searchDirtyQueue.id,
                projectRows.map((row) => row.id),
              ),
            ),
          );
        try {
          await chapterSearchCacheService.rebuildProjectIndex(projectId);
          await Promise.all(
            projectRows.map(async (row) =>
              client
                .update(searchDirtyQueue)
                .set({
                  status: "completed",
                  attempts: row.attempts + 1,
                  error: null,
                  updatedAt: now,
                })
                .where(eq(searchDirtyQueue.id, row.id)),
            ),
          );
          return { processed: projectRows.length, failed: 0 };
        } catch (error) {
          await Promise.all(
            projectRows.map(async (row) => {
              const attempts = row.attempts + 1;
              const nextStatus = attempts >= MAX_SEARCH_ATTEMPTS ? "failed" : "pending";
              await client
                .update(searchDirtyQueue)
                .set({
                  status: nextStatus,
                  attempts,
                  error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
                  updatedAt: now,
                })
                .where(eq(searchDirtyQueue.id, row.id));
            }),
          );
          return { processed: 0, failed: projectRows.length };
        }
      }),
    );
    const processed = results.reduce((sum, item) => sum + item.processed, 0);
    const failed = results.reduce((sum, item) => sum + item.failed, 0);
    logger.info("Processed search dirty queue", {
      queued: rows.length,
      processed,
      failed,
      projectCount: projects.length,
    });
    return { queued: rows.length, processed, failed };
  }

  async getMemoryJobStatus(projectId: string): Promise<{
    projectId: string;
    pendingCount: number;
    runningCount: number;
    failedCount: number;
    lastProcessedAt: string | null;
  }> {
    const client = db.getClient();
    const rows = await client
      .select({
        status: memoryBuildJob.status,
        count: sql<number>`count(*)`,
      })
      .from(memoryBuildJob)
      .where(eq(memoryBuildJob.projectId, projectId))
      .groupBy(memoryBuildJob.status);
    const grouped = new Map(rows.map((row) => [row.status, Number(row.count ?? 0)]));
    const lastRows = await client
      .select({ updatedAt: memoryBuildJob.updatedAt })
      .from(memoryBuildJob)
      .where(
        and(
          eq(memoryBuildJob.projectId, projectId),
          inArray(memoryBuildJob.status, ["completed", "failed"]),
        ),
      )
      .orderBy(sql`${memoryBuildJob.updatedAt} DESC`)
      .limit(1);
    return {
      projectId,
      pendingCount: grouped.get("pending") ?? 0,
      runningCount: grouped.get("running") ?? 0,
      failedCount: grouped.get("failed") ?? 0,
      lastProcessedAt: lastRows[0]?.updatedAt ?? null,
    };
  }

  async listProjectsWithPendingMemoryJobs(limit = 20): Promise<string[]> {
    const client = db.getClient();
    const rows = await client.all<{ projectId: string }>(
      sql`SELECT "projectId"
          FROM "MemoryBuildJob"
          WHERE "status" IN ('pending', 'failed')
          GROUP BY "projectId"
          ORDER BY MAX("updatedAt") DESC
          LIMIT ${limit};`,
    );
    return rows.map((row) => row.projectId);
  }

  async getLongPendingStats(): Promise<{
    searchLongPendingCount: number;
    memoryLongPendingCount: number;
  }> {
    const cutoffIso = new Date(Date.now() - LONG_PENDING_THRESHOLD_MS).toISOString();
    const client = db.getClient();
    const [searchRows, memoryRows] = await Promise.all([
      client
        .select({ count: sql<number>`count(*)` })
        .from(searchDirtyQueue)
        .where(
          and(
            eq(searchDirtyQueue.status, "pending"),
            sql`${searchDirtyQueue.updatedAt} <= ${cutoffIso}`,
          ),
        ),
      client
        .select({ count: sql<number>`count(*)` })
        .from(memoryBuildJob)
        .where(
          and(
            eq(memoryBuildJob.status, "pending"),
            sql`${memoryBuildJob.updatedAt} <= ${cutoffIso}`,
          ),
        ),
    ]);
    return {
      searchLongPendingCount: Number(searchRows[0]?.count ?? 0),
      memoryLongPendingCount: Number(memoryRows[0]?.count ?? 0),
    };
  }

  async runIntegrityCheck(): Promise<{ ok: boolean; rows: string[] }> {
    const rows = db.getClient().all<{ integrity_check: string }>(
      sql`PRAGMA integrity_check;`,
    );
    const values = rows.map((row) => row.integrity_check);
    const ok = values.every((value) => String(value).trim().toLowerCase() === "ok");
    return { ok, rows: values };
  }

  async getMigrationHealth(): Promise<{
    chapterCount: number;
    chapterBodyCount: number;
    missingBodyCount: number;
    hashMismatchCount: number;
    vectorSearchEnabled: boolean;
    invalidEmbeddingCount: number;
  }> {
    const client = db.getClient();
    const chapterCountRows = await client.all<{ count: number }>(
      sql`SELECT COUNT(*) as count FROM "Chapter";`,
    );
    const chapterBodyCountRows = await client.all<{ count: number }>(
      sql`SELECT COUNT(*) as count FROM "ChapterBody";`,
    );
    const missingBodyCountRows = await client.all<{ count: number }>(sql`
      SELECT COUNT(*) as count
      FROM "Chapter" c
      LEFT JOIN "ChapterBody" b ON b."chapterId" = c."id"
      WHERE b."chapterId" IS NULL;
    `);
    let hashMismatchCount = 0;
    let cursor: string | null = null;
    while (true) {
      const batch = await client
        .select({
          chapterId: chapterBody.chapterId,
          content: chapterBody.content,
          contentHash: chapterBody.contentHash,
        })
        .from(chapterBody)
        .where(cursor ? sql`${chapterBody.chapterId} > ${cursor}` : undefined)
        .orderBy(asc(chapterBody.chapterId))
        .limit(HEALTH_SCAN_PAGE_SIZE);
      if (batch.length === 0) break;
      for (const row of batch) {
        const canonicalHash = hash(String(row.content ?? ""));
        if (row.contentHash !== canonicalHash) {
          hashMismatchCount += 1;
        }
      }
      cursor = batch[batch.length - 1]?.chapterId ?? null;
      if (!cursor) break;
    }

    const invalidEmbeddingRows = await client.all<{ count: number }>(sql`
      SELECT COUNT(*) as count
      FROM "MemoryEmbedding"
      WHERE "dimension" <= 0
         OR length("vec") != "dimension" * ${EMBEDDING_VECTOR_ELEMENT_BYTES};
    `);

    return {
      chapterCount: Number(chapterCountRows[0]?.count ?? 0),
      chapterBodyCount: Number(chapterBodyCountRows[0]?.count ?? 0),
      missingBodyCount: Number(missingBodyCountRows[0]?.count ?? 0),
      hashMismatchCount,
      vectorSearchEnabled: db.isVectorSearchEnabled(),
      invalidEmbeddingCount: Number(invalidEmbeddingRows[0]?.count ?? 0),
    };
  }
}

export const dbMaintenanceService = new DbMaintenanceService();
