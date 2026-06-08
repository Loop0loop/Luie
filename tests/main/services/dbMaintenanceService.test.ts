import { beforeAll, describe, expect, it, vi } from "vitest";
import { ProjectService } from "../../../src/main/services/core/projectService.js";
import { ChapterService } from "../../../src/main/services/core/chapterService.js";
import { dbMaintenanceService } from "../../../src/main/services/features/dbMaintenanceService.js";
import { db } from "../../../src/main/database/index.js";
import { memoryBuildJob, searchDirtyQueue } from "../../../src/main/database/schema/index.js";
import { autoExtractService } from "../../../src/main/services/features/autoExtract/autoExtractService.js";
import { projectService } from "../../../src/main/services/core/projectService.js";
import { MEMORY_JOB_TYPES } from "../../../src/main/services/features/memory/memoryJobConstants.js";

describe("dbMaintenanceService", () => {
  const localProjectService = new ProjectService();
  const chapterService = new ChapterService();

  beforeAll(() => {
    vi.spyOn(autoExtractService, "scheduleAnalysis").mockImplementation(() => {});
    vi.spyOn(projectService, "schedulePackageExport").mockImplementation(() => {});
    vi.spyOn(projectService, "attemptImmediatePackageExport").mockResolvedValue({
      exported: false,
    });
    vi
      .spyOn(projectService, "persistPackageAfterMutation")
      .mockResolvedValue(undefined);
    vi.spyOn(localProjectService, "schedulePackageExport").mockImplementation(() => {});
  });

  it("enqueues rebuildSearchIndex and reports status counts", async () => {
    const project = await localProjectService.createProject({
      title: "DB Maintenance Search",
      description: "unit",
      projectPath: "/tmp/db-maint-search.luie",
    });

    const rebuild = await dbMaintenanceService.rebuildSearchIndex(String(project.id));
    expect(rebuild.success).toBe(true);

    const status = await dbMaintenanceService.getSearchIndexStatus(String(project.id));
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

    const result = await dbMaintenanceService.processPendingSearchJobs({ limit: 10 });
    expect(result.queued).toBeGreaterThanOrEqual(1);

    const rows = await db.getClient()
      .select()
      .from(searchDirtyQueue);
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
});
