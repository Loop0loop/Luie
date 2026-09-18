import { beforeAll, describe, expect, it, vi } from "vitest";
import crypto from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { ProjectService } from "../../../src/main/services/features/project/projectService.js";
import { ChapterService } from "../../../src/main/services/features/manuscript/chapterService.js";
import { dbMaintenanceService } from "../../../src/main/services/features/dbMaintenance/index.js";
import { db } from "../../../src/main/database/index.js";
import {
  cacheDb,
  chapterSearchDocument,
} from "../../../src/main/database/cache/index.js";
import {
  chapterBody,
  memoryBuildJob,
  searchDirtyQueue,
} from "../../../src/main/database/schema/index.js";
import { projectService } from "../../../src/main/services/features/project/projectService.js";
import { chapterSearchCacheService } from "../../../src/main/services/features/search/chapterSearchCacheService.js";
import {
  MEMORY_JOB_TYPES,
  MEMORY_TARGET_TYPES,
} from "../../../src/main/services/features/memory/memoryJobConstants.js";

describe("dbMaintenanceService", () => {
  const localProjectService = new ProjectService();
  const chapterService = new ChapterService();

  beforeAll(() => {
    vi.spyOn(projectService, "schedulePackageExport").mockImplementation(
      () => {},
    );
    vi.spyOn(projectService, "attemptImmediatePackageExport").mockResolvedValue(
      {
        exported: false,
      },
    );
    vi.spyOn(projectService, "persistPackageAfterMutation").mockResolvedValue(
      undefined,
    );
    vi.spyOn(localProjectService, "schedulePackageExport").mockImplementation(
      () => {},
    );
  });

  it("enqueues rebuildSearchIndex and reports status counts", async () => {
    const project = await localProjectService.createProject({
      title: "DB Maintenance Search",
      description: "unit",
      projectPath: "/tmp/db-maint-search.luie",
    });

    const rebuild = await dbMaintenanceService.rebuildSearchIndex(
      String(project.id),
    );
    expect(rebuild.success).toBe(true);

    const status = await dbMaintenanceService.getSearchIndexStatus(
      String(project.id),
    );
    expect(status.pendingCount).toBeGreaterThanOrEqual(1);
  });

  it("processes search queue and marks completed", async () => {
    const project = await localProjectService.createProject({
      title: "DB Maintenance Search Process",
      description: "unit",
      projectPath: "/tmp/db-maint-search-process.luie",
    });

    const chapter = await chapterService.createChapter({
      projectId: String(project.id),
      title: "queue chapter",
    });
    await chapterService.updateChapter({
      id: String(chapter.id),
      content: "검색 인덱스 큐 처리 테스트 텍스트",
    });

    const result = await dbMaintenanceService.processPendingSearchJobs({
      limit: 10,
    });
    expect(result.queued).toBeGreaterThanOrEqual(1);

    const rows = await db.getClient().select().from(searchDirtyQueue);
    expect(rows.some((row) => row.status === "completed")).toBe(true);
  });

  it("refreshes only dirty chapter sources unless an explicit full rebuild is queued", async () => {
    const project = await localProjectService.createProject({
      title: "DB Maintenance Scoped Search",
      description: "unit",
      projectPath: "/tmp/db-maint-scoped-search.luie",
    });
    const target = await chapterService.createChapter({
      projectId: String(project.id),
      title: "target chapter",
    });
    const unrelated = await chapterService.createChapter({
      projectId: String(project.id),
      title: "unrelated chapter",
    });
    await dbMaintenanceService.processPendingSearchJobs({ limit: 1000 });
    await cacheDb
      .getClient()
      .update(chapterSearchDocument)
      .set({ searchText: "unrelated sentinel" })
      .where(eq(chapterSearchDocument.chapterId, String(unrelated.id)));
    await db
      .getClient()
      .update(chapterBody)
      .set({ content: "latest target body" })
      .where(eq(chapterBody.chapterId, String(target.id)));
    await dbMaintenanceService.markChapterSearchDirty({
      projectId: String(project.id),
      chapterId: String(target.id),
      reason: "chapter:update",
    });
    const refreshSpy = vi.spyOn(chapterSearchCacheService, "refreshChapter");
    const rebuildSpy = vi.spyOn(
      chapterSearchCacheService,
      "rebuildProjectIndex",
    );

    await dbMaintenanceService.processPendingSearchJobs({ limit: 1000 });

    const documents = await cacheDb
      .getClient()
      .select()
      .from(chapterSearchDocument)
      .where(eq(chapterSearchDocument.projectId, String(project.id)));
    expect(
      documents.find((row) => row.chapterId === String(target.id))?.searchText,
    ).toContain("latest target body");
    expect(
      documents.find((row) => row.chapterId === String(unrelated.id))
        ?.searchText,
    ).toBe("unrelated sentinel");
    expect(refreshSpy).toHaveBeenCalledWith(String(target.id));
    expect(rebuildSpy).not.toHaveBeenCalledWith(String(project.id));

    await dbMaintenanceService.rebuildSearchIndex(String(project.id));
    await dbMaintenanceService.processPendingSearchJobs({ limit: 1000 });
    expect(rebuildSpy).toHaveBeenCalledWith(String(project.id));
  });

  it("enqueues chunk and embedding rebuild jobs without synchronous processing", async () => {
    const project = await localProjectService.createProject({
      title: "DB Maintenance Memory",
      description: "unit",
      projectPath: "/tmp/db-maint-memory.luie",
    });

    const chapter = await chapterService.createChapter({
      projectId: String(project.id),
      title: "memory queue chapter",
    });

    const enqueue = await dbMaintenanceService.rebuildMemoryChunks({
      projectId: String(project.id),
      sourceType: "chapter",
      sourceId: String(chapter.id),
    });

    expect(enqueue.queued).toBe(1);
    expect(enqueue.processed).toBe(0);

    const jobs = await db.getClient().select().from(memoryBuildJob);
    expect(jobs.some((job) => job.status === "pending")).toBe(true);
    expect(
      jobs.some(
        (job) =>
          job.targetId === String(chapter.id) &&
          job.jobType === MEMORY_JOB_TYPES.REBUILD_CHUNKS,
      ),
    ).toBe(true);
    expect(
      jobs.some(
        (job) =>
          job.targetId === String(chapter.id) &&
          job.jobType === MEMORY_JOB_TYPES.REBUILD_EMBEDDING,
      ),
    ).toBe(true);

    await db
      .getClient()
      .update(memoryBuildJob)
      .set({ status: "running" })
      .where(
        and(
          eq(memoryBuildJob.projectId, String(project.id)),
          eq(memoryBuildJob.targetId, String(chapter.id)),
          inArray(memoryBuildJob.jobType, [
            MEMORY_JOB_TYPES.REBUILD_CHUNKS,
            MEMORY_JOB_TYPES.REBUILD_EMBEDDING,
          ]),
        ),
      );

    await dbMaintenanceService.rebuildMemoryChunks({
      projectId: String(project.id),
    });

    const regeneratedJobs = await db
      .getClient()
      .select()
      .from(memoryBuildJob)
      .where(
        and(
          eq(memoryBuildJob.targetId, String(chapter.id)),
          inArray(memoryBuildJob.jobType, [
            MEMORY_JOB_TYPES.REBUILD_CHUNKS,
            MEMORY_JOB_TYPES.REBUILD_EMBEDDING,
          ]),
        ),
      );
    for (const jobType of [
      MEMORY_JOB_TYPES.REBUILD_CHUNKS,
      MEMORY_JOB_TYPES.REBUILD_EMBEDDING,
    ]) {
      expect(
        regeneratedJobs
          .filter((job) => job.jobType === jobType)
          .map((job) => job.status)
          .sort(),
      ).toEqual(["pending", "running"]);
    }
  });

  it("reactivates failed jobs and preserves paused jobs during a full memory rebuild", async () => {
    const project = await localProjectService.createProject({
      title: "DB Maintenance Full Retry",
      projectPath: "/tmp/db-maint-full-retry.luie",
    });
    const chapter = await chapterService.createChapter({
      projectId: String(project.id),
      title: "failed rebuild target",
    });
    const projectId = String(project.id);
    const chapterId = String(chapter.id);
    await db
      .getClient()
      .update(memoryBuildJob)
      .set({
        status: "failed",
        attempts: 5,
        error: "TERMINAL_CHUNK",
      })
      .where(
        and(
          eq(memoryBuildJob.projectId, projectId),
          eq(memoryBuildJob.targetId, chapterId),
          eq(memoryBuildJob.jobType, MEMORY_JOB_TYPES.REBUILD_CHUNKS),
        ),
      );
    await db
      .getClient()
      .update(memoryBuildJob)
      .set({
        status: "paused",
        attempts: 3,
        error: "USER_PAUSED",
      })
      .where(
        and(
          eq(memoryBuildJob.projectId, projectId),
          eq(memoryBuildJob.targetId, chapterId),
          eq(memoryBuildJob.jobType, MEMORY_JOB_TYPES.REBUILD_EMBEDDING),
        ),
      );
    const before = await db
      .getClient()
      .select()
      .from(memoryBuildJob)
      .where(eq(memoryBuildJob.targetId, chapterId));
    const failedBefore = before.find(
      (job) => job.jobType === MEMORY_JOB_TYPES.REBUILD_CHUNKS,
    );
    const pausedBefore = before.find(
      (job) => job.jobType === MEMORY_JOB_TYPES.REBUILD_EMBEDDING,
    );

    const result = await dbMaintenanceService.rebuildMemoryChunks({
      projectId,
    });

    const after = await db
      .getClient()
      .select()
      .from(memoryBuildJob)
      .where(eq(memoryBuildJob.targetId, chapterId));
    const reactivated = after.find(
      (job) => job.jobType === MEMORY_JOB_TYPES.REBUILD_CHUNKS,
    );
    const pausedAfter = after.find(
      (job) => job.jobType === MEMORY_JOB_TYPES.REBUILD_EMBEDDING,
    );
    expect(result).toEqual({ queued: 1, processed: 0 });
    expect(reactivated).toMatchObject({
      status: "pending",
      attempts: 0,
      error: null,
    });
    expect(reactivated?.id).not.toBe(failedBefore?.id);
    expect(pausedAfter).toMatchObject({
      id: pausedBefore?.id,
      status: "paused",
      attempts: 3,
      error: "USER_PAUSED",
    });
  });

  it("recovers stale running memory jobs with an explicit recovery marker", async () => {
    const project = await localProjectService.createProject({
      title: "DB Maintenance Memory Recovery",
      description: "unit",
      projectPath: "/tmp/db-maint-memory-recovery.luie",
    });
    const staleJobId = crypto.randomUUID();
    const freshJobId = crypto.randomUUID();

    await db
      .getClient()
      .insert(memoryBuildJob)
      .values([
        {
          id: staleJobId,
          projectId: String(project.id),
          targetType: MEMORY_TARGET_TYPES.CHAPTER,
          targetId: crypto.randomUUID(),
          jobType: MEMORY_JOB_TYPES.REBUILD_CHUNKS,
          status: "running",
          priority: 80,
          attempts: 1,
          error: null,
          createdAt: "2026-06-10T00:00:00.000Z",
          updatedAt: "2026-06-10T00:00:00.000Z",
        },
        {
          id: freshJobId,
          projectId: String(project.id),
          targetType: MEMORY_TARGET_TYPES.CHAPTER,
          targetId: crypto.randomUUID(),
          jobType: MEMORY_JOB_TYPES.REBUILD_CHUNKS,
          status: "running",
          priority: 80,
          attempts: 1,
          error: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);

    await dbMaintenanceService.recoverStaleRunningJobs();

    const rows = await db.getClient().select().from(memoryBuildJob);
    const staleJob = rows.find((row) => row.id === staleJobId);
    const freshJob = rows.find((row) => row.id === freshJobId);

    expect(staleJob).toMatchObject({
      status: "pending",
      error: "RECOVERED_STALE_RUNNING_JOB",
    });
    expect(freshJob).toMatchObject({
      status: "running",
      error: null,
    });
  });
});
