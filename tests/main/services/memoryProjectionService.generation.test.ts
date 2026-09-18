import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  chapter,
  chapterBody,
  db,
  memoryBuildJob,
  memoryChunk,
} from "../../../src/main/infra/database/index.js";
import { enqueueChapterDerivedJobs } from "../../../src/main/services/core/chapter/chapterDerivedJobs.js";
import { ChapterService } from "../../../src/main/services/features/manuscript/chapterService.js";
import { MEMORY_JOB_TYPES } from "../../../src/main/services/features/memory/memoryJobConstants.js";
import { memoryProjectionService } from "../../../src/main/services/features/memory/memoryProjectionService.js";
import {
  ProjectService,
  projectService,
} from "../../../src/main/services/features/project/projectService.js";

describe("memoryProjectionService generation", () => {
  const localProjectService = new ProjectService();
  const chapterService = new ChapterService();

  beforeAll(() => {
    vi.spyOn(projectService, "schedulePackageExport").mockImplementation(
      () => {},
    );
    vi.spyOn(projectService, "attemptImmediatePackageExport").mockResolvedValue(
      { exported: false },
    );
    vi.spyOn(projectService, "persistPackageAfterMutation").mockResolvedValue(
      undefined,
    );
    vi.spyOn(localProjectService, "schedulePackageExport").mockImplementation(
      () => {},
    );
  });

  it("keeps a pending successor when the source changes after selection and before claim", async () => {
    const project = await localProjectService.createProject({
      title: "Memory pre-claim generation",
      projectPath: "/tmp/memory-pre-claim-generation.luie",
    });
    const projectId = String(project.id);
    const created = await chapterService.createChapter({
      projectId,
      title: "generation chapter",
    });
    const chapterId = String(created.id);
    await chapterService.updateChapter({ id: chapterId, content: "source A" });
    const initialJobs = await db
      .getClient()
      .select()
      .from(memoryBuildJob)
      .where(
        and(
          eq(memoryBuildJob.targetId, chapterId),
          eq(memoryBuildJob.jobType, MEMORY_JOB_TYPES.REBUILD_CHUNKS),
        ),
      );
    expect(initialJobs).toHaveLength(1);

    const originalSetImmediate = globalThis.setImmediate;
    const immediateSpy = vi.spyOn(globalThis, "setImmediate");
    immediateSpy.mockImplementationOnce((callback, ...args) => {
      const changedAt = new Date().toISOString();
      db.getClient().transaction((tx) => {
        tx.update(chapter)
          .set({ content: "source B", updatedAt: changedAt })
          .where(eq(chapter.id, chapterId))
          .run();
        tx.update(chapterBody)
          .set({
            content: "source B",
            contentHash: "source-b-hash",
            updatedAt: changedAt,
          })
          .where(eq(chapterBody.chapterId, chapterId))
          .run();
        enqueueChapterDerivedJobs({
          projectId,
          chapterId,
          reason: "source-b-saved-before-claim",
          tx,
        });
      });
      return originalSetImmediate(callback, ...args);
    });

    const firstRun = await memoryProjectionService
      .processPendingChunkJobs({
        projectId,
        sourceType: "chapter",
        sourceId: chapterId,
        limit: 1,
      })
      .finally(() => immediateSpy.mockRestore());

    const jobsAfterFirstRun = await db
      .getClient()
      .select()
      .from(memoryBuildJob)
      .where(
        and(
          eq(memoryBuildJob.targetId, chapterId),
          eq(memoryBuildJob.jobType, MEMORY_JOB_TYPES.REBUILD_CHUNKS),
        ),
      );
    const chunksAfterFirstRun = await db
      .getClient()
      .select()
      .from(memoryChunk)
      .where(eq(memoryChunk.sourceId, chapterId));

    expect(firstRun.processed).toBe(0);
    expect(jobsAfterFirstRun.map((job) => job.status)).toEqual(["pending"]);
    expect(jobsAfterFirstRun[0]?.id).not.toBe(initialJobs[0]?.id);
    expect(chunksAfterFirstRun).toHaveLength(0);

    const secondRun = await memoryProjectionService.processPendingChunkJobs({
      projectId,
      sourceType: "chapter",
      sourceId: chapterId,
      limit: 1,
    });
    const finalChunks = await db
      .getClient()
      .select()
      .from(memoryChunk)
      .where(eq(memoryChunk.sourceId, chapterId));
    const finalJobs = await db
      .getClient()
      .select()
      .from(memoryBuildJob)
      .where(
        and(
          eq(memoryBuildJob.targetId, chapterId),
          eq(memoryBuildJob.jobType, MEMORY_JOB_TYPES.REBUILD_CHUNKS),
        ),
      );

    expect(secondRun.processed).toBe(1);
    expect(finalChunks.map((chunk) => chunk.content)).toEqual(["source B"]);
    expect(finalJobs.map((job) => job.status)).toEqual(["completed"]);
  });
});
