import { beforeAll, describe, expect, it, vi } from "vitest";
import crypto from "node:crypto";
import { ProjectService } from "../../../src/main/services/features/project/projectService.js";
import { ChapterService } from "../../../src/main/services/features/manuscript/chapterService.js";
import { dbMaintenanceService } from "../../../src/main/services/features/dbMaintenance/index.js";
import { db } from "../../../src/main/database/index.js";
import {
  memoryBuildJob,
  searchDirtyQueue,
} from "../../../src/main/database/schema/index.js";
import { autoExtractService } from "../../../src/main/services/features/autoExtract/autoExtractService.js";
import { projectService } from "../../../src/main/services/features/project/projectService.js";
import {
  MEMORY_JOB_TYPES,
  MEMORY_TARGET_TYPES,
} from "../../../src/main/services/features/memory/memoryJobConstants.js";

describe("dbMaintenanceService", () => {
  const localProjectService = new ProjectService();
  const chapterService = new ChapterService();

  beforeAll(() => {
    vi.spyOn(autoExtractService, "scheduleAnalysis").mockImplementation(
      () => {},
    );
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
  });

  it("recovers stale running memory jobs with an explicit recovery marker", async () => {
    const project = await localProjectService.createProject({
      title: "DB Maintenance Memory Recovery",
      description: "unit",
      projectPath: "/tmp/db-maint-memory-recovery.luie",
    });
    const staleJobId = crypto.randomUUID();
    const freshJobId = crypto.randomUUID();

    await db.getClient().insert(memoryBuildJob).values([
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
