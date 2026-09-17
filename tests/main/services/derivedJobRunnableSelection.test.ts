import crypto from "node:crypto";
import { performance } from "node:perf_hooks";
import { and, eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "../../../src/main/database/index.js";
import {
  memoryBuildJob,
  searchDirtyQueue,
} from "../../../src/main/database/schema/index.js";
import { dbMaintenanceService } from "../../../src/main/services/features/dbMaintenance/index.js";
import { ChapterService } from "../../../src/main/services/features/manuscript/chapterService.js";
import {
  MEMORY_JOB_TYPES,
  MEMORY_TARGET_TYPES,
} from "../../../src/main/services/features/memory/memoryJobConstants.js";
import { memoryProjectionService } from "../../../src/main/services/features/memory/memoryProjectionService.js";
import { retryableMemoryBuildJobCondition } from "../../../src/main/services/features/memory/projection/jobPolicy.js";
import { ProjectService } from "../../../src/main/services/features/project/projectService.js";
import { projectService } from "../../../src/main/services/features/project/projectService.js";

describe("derived job runnable SQL selection", () => {
  const projects = new ProjectService();
  const chapters = new ChapterService();

  beforeAll(() => {
    vi.spyOn(projectService, "schedulePackageExport").mockImplementation(
      () => {},
    );
    vi.spyOn(projectService, "persistPackageAfterMutation").mockResolvedValue(
      undefined,
    );
  });

  it("processes a pending search row behind more than one candidate window of exhausted failures", async () => {
    const project = await projects.createProject({
      title: "DB-12 search starvation",
      projectPath: "/tmp/db-12-search-starvation.luie",
    });
    const chapter = await chapters.createChapter({
      projectId: String(project.id),
      title: "runnable target",
    });
    const projectId = String(project.id);
    const chapterId = String(chapter.id);
    const oldIso = "2020-01-01T00:00:00.000Z";
    await db.getClient().insert(searchDirtyQueue).values(
      Array.from({ length: 40 }, () => ({
        id: crypto.randomUUID(),
        projectId,
        sourceType: MEMORY_TARGET_TYPES.CHAPTER,
        sourceId: crypto.randomUUID(),
        reason: "exhausted fixture",
        status: "failed",
        attempts: 5,
        error: "TERMINAL",
        createdAt: oldIso,
        updatedAt: oldIso,
      })),
    );

    const result = await dbMaintenanceService.processPendingSearchJobs({
      limit: 1,
    });

    const [target] = await db
      .getClient()
      .select()
      .from(searchDirtyQueue)
      .where(
        and(
          eq(searchDirtyQueue.projectId, projectId),
          eq(searchDirtyQueue.sourceId, chapterId),
        ),
      );
    expect(result).toMatchObject({ queued: 1, processed: 1 });
    expect(target?.status).toBe("completed");
  });

  it("selects a runnable chunk job behind terminal failures and resets a failed generation on enqueue", async () => {
    const project = await projects.createProject({
      title: "DB-12 memory starvation",
      projectPath: "/tmp/db-12-memory-starvation.luie",
    });
    const chapter = await chapters.createChapter({
      projectId: String(project.id),
      title: "memory target",
    });
    const projectId = String(project.id);
    const chapterId = String(chapter.id);
    const oldIso = "2020-01-01T00:00:00.000Z";
    await db.getClient().insert(memoryBuildJob).values(
      Array.from({ length: 40 }, () => ({
        id: crypto.randomUUID(),
        projectId,
        targetType: MEMORY_TARGET_TYPES.CHAPTER,
        targetId: crypto.randomUUID(),
        jobType: MEMORY_JOB_TYPES.REBUILD_CHUNKS,
        status: "failed",
        priority: 1,
        attempts: 5,
        error: "TERMINAL",
        createdAt: oldIso,
        updatedAt: oldIso,
      })),
    );

    const processed = await memoryProjectionService.processPendingChunkJobs({
      projectId,
      limit: 1,
    });
    expect(processed).toEqual({ queued: 1, processed: 1 });

    const targetFilter = and(
      eq(memoryBuildJob.projectId, projectId),
      eq(memoryBuildJob.targetId, chapterId),
      eq(memoryBuildJob.jobType, MEMORY_JOB_TYPES.REBUILD_CHUNKS),
    );
    await db
      .getClient()
      .update(memoryBuildJob)
      .set({ status: "failed", attempts: 5, error: "OLD_GENERATION" })
      .where(targetFilter);
    await memoryProjectionService.enqueueChapterChunkRebuild({
      projectId,
      chapterId,
      reason: "new source generation",
    });

    const [requeued] = await db
      .getClient()
      .select()
      .from(memoryBuildJob)
      .where(targetFilter);
    expect(requeued).toMatchObject({
      status: "pending",
      attempts: 0,
      error: null,
    });
  });

  it("installs runnable indexes used by representative ready-row lookups", async () => {
    const searchPlan = await db.getClient().all<{ detail: string }>(sql`
      EXPLAIN QUERY PLAN
      SELECT "id" FROM "SearchDirtyQueue"
      WHERE "status" = 'failed' AND "attempts" = 4
        AND "updatedAt" <= '2026-01-01T00:00:00.000Z'
      ORDER BY "updatedAt" LIMIT 1;
    `);
    const memoryPlan = await db.getClient().all<{ detail: string }>(sql`
      EXPLAIN QUERY PLAN
      SELECT "id" FROM "MemoryBuildJob"
      WHERE "projectId" = 'fixture' AND "jobType" = 'rebuild_chunks'
        AND "status" = 'failed' AND "attempts" = 4
      ORDER BY "priority", "createdAt" LIMIT 1;
    `);

    expect(searchPlan.map((row) => row.detail).join(" ")).toContain(
      "SearchDirtyQueue_runnable_idx",
    );
    expect(memoryPlan.map((row) => row.detail).join(" ")).toContain(
      "MemoryBuildJob_runnable_idx",
    );
  });

  it("uses the actual global runnable query without scanning terminal history", async () => {
    const project = await projects.createProject({
      title: "DB-12 global runnable plan",
      projectPath: "/tmp/db-12-global-runnable-plan.luie",
    });
    const projectId = String(project.id);
    const client = db.getClient();
    await client.run(sql`
      WITH RECURSIVE seq(n) AS (
        SELECT 1
        UNION ALL
        SELECT n + 1 FROM seq WHERE n < 50000
      )
      INSERT INTO "MemoryBuildJob"
        ("id", "projectId", "targetType", "targetId", "jobType", "status", "priority", "attempts", "error", "createdAt", "updatedAt")
      SELECT
        'terminal-' || n,
        ${projectId},
        'chapter',
        'terminal-target-' || n,
        'rebuild_chunks',
        'completed',
        80,
        1,
        NULL,
        '2020-01-01T00:00:00.000Z',
        '2020-01-01T00:00:00.000Z'
      FROM seq;
    `);
    await client.insert(memoryBuildJob).values({
      id: crypto.randomUUID(),
      projectId,
      targetType: MEMORY_TARGET_TYPES.CHAPTER,
      targetId: "runnable-target",
      jobType: MEMORY_JOB_TYPES.REBUILD_CHUNKS,
      status: "pending",
      priority: 80,
      attempts: 0,
      createdAt: "2026-09-13T00:00:00.000Z",
      updatedAt: "2026-09-13T00:00:00.000Z",
    });
    await client.run(sql`ANALYZE;`);

    const durations = await Promise.all(
      Array.from({ length: 20 }, async () => {
        const startedAt = performance.now();
        expect(
          await dbMaintenanceService.listProjectsWithPendingMemoryJobs(20),
        ).toEqual([projectId]);
        return performance.now() - startedAt;
      }),
    );
    durations.sort((a, b) => a - b);
    const p95 = durations[Math.ceil(durations.length * 0.95) - 1] ?? Infinity;

    const plan = await client.all<{ detail: string }>(sql`
      EXPLAIN QUERY PLAN
      SELECT "projectId"
      FROM "MemoryBuildJob" INDEXED BY "MemoryBuildJob_global_runnable_idx"
      WHERE ${retryableMemoryBuildJobCondition()}
      GROUP BY "projectId"
      ORDER BY max("updatedAt") DESC
      LIMIT 20;
    `);
    const indexRows = await client.all<{ sql: string }>(sql`
      SELECT "sql" FROM sqlite_master
      WHERE "type" = 'index' AND "name" = 'MemoryBuildJob_global_runnable_idx';
    `);
    expect(indexRows[0]?.sql).toContain("WHERE");
    expect(indexRows[0]?.sql).toContain("attempts");
    expect(plan.map((row) => row.detail).join(" ")).toContain(
      "MemoryBuildJob_global_runnable_idx",
    );
    expect(p95).toBeLessThan(50);
  });
});
