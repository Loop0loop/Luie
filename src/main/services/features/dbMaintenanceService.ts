import crypto from "node:crypto";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../database/index.js";
import {
  chapter,
  chapterBody,
  memoryBuildJob,
  searchDirtyQueue,
} from "../../database/schema.js";
import { chapterSearchCacheService } from "./chapterSearchCacheService.js";
import { createLogger } from "../../../shared/logger/index.js";

function hash(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

const logger = createLogger("DbMaintenanceService");
const MAX_SEARCH_ATTEMPTS = 5;
const SEARCH_RETRY_BASE_BACKOFF_MS = 2_000;
const STALE_RUNNING_THRESHOLD_MS = 30_000;
const LONG_PENDING_THRESHOLD_MS = 60_000;

class DbMaintenanceService {
  async recoverStaleRunningJobs(): Promise<void> {
    const client = db.getClient();
    const now = Date.now();
    const runningSearch = await client
      .select()
      .from(searchDirtyQueue)
      .where(eq(searchDirtyQueue.status, "running"));
    for (const row of runningSearch) {
      const updatedAtMs = Date.parse(row.updatedAt);
      if (!Number.isFinite(updatedAtMs) || now - updatedAtMs < STALE_RUNNING_THRESHOLD_MS) {
        continue;
      }
      await client
        .update(searchDirtyQueue)
        .set({ status: "pending", updatedAt: new Date().toISOString() })
        .where(eq(searchDirtyQueue.id, row.id));
    }
    const runningMemory = await client
      .select()
      .from(memoryBuildJob)
      .where(eq(memoryBuildJob.status, "running"));
    for (const row of runningMemory) {
      const updatedAtMs = Date.parse(row.updatedAt);
      if (!Number.isFinite(updatedAtMs) || now - updatedAtMs < STALE_RUNNING_THRESHOLD_MS) {
        continue;
      }
      await client
        .update(memoryBuildJob)
        .set({ status: "pending", updatedAt: new Date().toISOString() })
        .where(eq(memoryBuildJob.id, row.id));
    }
  }

  async markChapterSearchDirty(input: {
    projectId: string;
    chapterId: string;
    reason: string;
  }): Promise<void> {
    const now = new Date().toISOString();
    await db.getClient().insert(searchDirtyQueue).values({
      id: crypto.randomUUID(),
      projectId: input.projectId,
      sourceType: "chapter",
      sourceId: input.chapterId,
      reason: input.reason,
      status: "pending",
      attempts: 0,
      error: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  async rebuildSearchIndex(projectId: string): Promise<{ success: boolean }> {
    const now = new Date().toISOString();
    await db.getClient().insert(searchDirtyQueue).values({
      id: crypto.randomUUID(),
      projectId,
      sourceType: "chapter",
      sourceId: projectId,
      reason: "search:rebuild-all",
      status: "pending",
      attempts: 0,
      error: null,
      createdAt: now,
      updatedAt: now,
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
    let queued = 0;
    if (input.sourceType && input.sourceId) {
      await client.insert(memoryBuildJob).values({
        id: crypto.randomUUID(),
        projectId: input.projectId,
        targetType: input.sourceType,
        targetId: input.sourceId,
        jobType: "rebuild_chunks",
        status: "pending",
        priority: 100,
        attempts: 0,
        error: null,
        createdAt: now,
        updatedAt: now,
      });
      queued = 1;
    } else {
      const chapters = await client
        .select({ id: chapter.id })
        .from(chapter)
        .where(eq(chapter.projectId, input.projectId))
        .orderBy(asc(chapter.order));
      if (chapters.length > 0) {
        await client.insert(memoryBuildJob).values(
          chapters.map((row) => ({
            id: crypto.randomUUID(),
            projectId: input.projectId,
            targetType: "chapter",
            targetId: row.id,
            jobType: "rebuild_chunks",
            status: "pending",
            priority: 100,
            attempts: 0,
            error: null,
            createdAt: now,
            updatedAt: now,
          })),
        );
      }
      queued = chapters.length;
    }
    return { queued, processed: 0 };
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
    let processed = 0;
    let failed = 0;
    for (const projectId of projects) {
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
        for (const row of projectRows) {
          await client
            .update(searchDirtyQueue)
            .set({
              status: "completed",
              attempts: row.attempts + 1,
              error: null,
              updatedAt: now,
            })
            .where(eq(searchDirtyQueue.id, row.id));
        }
        processed += projectRows.length;
      } catch (error) {
        for (const row of projectRows) {
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
        }
        failed += projectRows.length;
      }
    }
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
    const rows = await client
      .select({ projectId: memoryBuildJob.projectId })
      .from(memoryBuildJob)
      .where(inArray(memoryBuildJob.status, ["pending", "failed"]))
      .groupBy(memoryBuildJob.projectId)
      .orderBy(asc(memoryBuildJob.projectId))
      .limit(limit);
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
  }> {
    const client = db.getClient();
    const chapters = await client.select({ id: chapter.id, content: chapter.content }).from(chapter);
    const bodies = await client.select().from(chapterBody);
    const bodyMap = new Map(bodies.map((item) => [item.chapterId, item]));

    let missingBodyCount = 0;
    let hashMismatchCount = 0;

    for (const row of chapters) {
      const body = bodyMap.get(row.id);
      if (!body) {
        missingBodyCount += 1;
        continue;
      }
      const canonical = String(body.content ?? row.content ?? "");
      const canonicalHash = hash(canonical);
      if (body.contentHash !== canonicalHash) {
        hashMismatchCount += 1;
      }
    }

    return {
      chapterCount: chapters.length,
      chapterBodyCount: bodies.length,
      missingBodyCount,
      hashMismatchCount,
    };
  }
}

export const dbMaintenanceService = new DbMaintenanceService();
