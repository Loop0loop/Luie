import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import {
  db,
  memoryBuildJob,
  project,
  searchDirtyQueue,
} from "../../../../../src/main/infra/database/index.js";
import { enqueueChapterDerivedJobs } from "../../../../../src/main/services/core/chapter/chapterDerivedJobs.js";
import {
  MEMORY_JOB_PRIORITY,
  MEMORY_JOB_TYPES,
  MEMORY_TARGET_TYPES,
} from "../../../../../src/main/services/features/memory/memoryJobConstants.js";

async function seedProject(projectId: string): Promise<void> {
  await db.getClient().insert(project).values({
    id: projectId,
    title: "Derived Jobs",
    description: null,
    projectPath: null,
    updatedAt: "2026-06-11T00:00:00.000Z",
  });
}

async function seedMemoryJob(input: {
  projectId: string;
  chapterId: string;
  jobType: string;
  status: string;
  priority?: number;
}): Promise<string> {
  const id = crypto.randomUUID();
  await db
    .getClient()
    .insert(memoryBuildJob)
    .values({
      id,
      projectId: input.projectId,
      targetType: MEMORY_TARGET_TYPES.CHAPTER,
      targetId: input.chapterId,
      jobType: input.jobType,
      status: input.status,
      priority: input.priority ?? 100,
      attempts: 1,
      error: input.status === "failed" ? "TEST_FAILURE" : null,
      createdAt: "2026-06-11T00:00:00.000Z",
      updatedAt: "2026-06-11T00:00:00.000Z",
    });
  return id;
}

async function listMemoryJobs(input: {
  projectId: string;
  chapterId: string;
  jobType: string;
}) {
  return db
    .getClient()
    .select()
    .from(memoryBuildJob)
    .where(
      and(
        eq(memoryBuildJob.projectId, input.projectId),
        eq(memoryBuildJob.targetType, MEMORY_TARGET_TYPES.CHAPTER),
        eq(memoryBuildJob.targetId, input.chapterId),
        eq(memoryBuildJob.jobType, input.jobType),
      ),
    );
}

async function seedRunningSearchJob(input: {
  projectId: string;
  chapterId: string;
}): Promise<string> {
  const id = crypto.randomUUID();
  await db.getClient().insert(searchDirtyQueue).values({
    id,
    projectId: input.projectId,
    sourceType: MEMORY_TARGET_TYPES.CHAPTER,
    sourceId: input.chapterId,
    reason: "processing-source-a",
    status: "running",
    attempts: 0,
    createdAt: "2026-06-11T00:00:00.000Z",
    updatedAt: "2026-06-11T00:00:00.000Z",
  });
  return id;
}

describe("enqueueChapterDerivedJobs", () => {
  it("keeps one pending successor when source changes during running jobs", async () => {
    const projectId = crypto.randomUUID();
    const chapterId = crypto.randomUUID();
    await seedProject(projectId);
    const runningMemoryJobIds = await Promise.all(
      Object.values(MEMORY_JOB_TYPES).map((jobType) =>
        seedMemoryJob({
          projectId,
          chapterId,
          jobType,
          status: "running",
        }),
      ),
    );
    const runningSearchJobId = await seedRunningSearchJob({
      projectId,
      chapterId,
    });

    enqueueChapterDerivedJobs({
      projectId,
      chapterId,
      reason: "source-b-saved",
    });
    enqueueChapterDerivedJobs({
      projectId,
      chapterId,
      reason: "source-c-saved",
    });

    const jobsByType = await Promise.all(
      Object.values(MEMORY_JOB_TYPES).map(async (jobType) => ({
        jobType,
        jobs: await listMemoryJobs({ projectId, chapterId, jobType }),
      })),
    );
    for (const { jobs } of jobsByType) {
      expect(jobs.map((job) => job.status).sort()).toEqual([
        "pending",
        "running",
      ]);
    }
    const searchJobs = await db
      .getClient()
      .select()
      .from(searchDirtyQueue)
      .where(
        and(
          eq(searchDirtyQueue.projectId, projectId),
          eq(searchDirtyQueue.sourceId, chapterId),
        ),
      );
    expect(searchJobs.map((job) => job.status).sort()).toEqual([
      "pending",
      "running",
    ]);
    expect(searchJobs.find((job) => job.status === "pending")?.reason).toBe(
      "source-c-saved",
    );

    await db
      .getClient()
      .update(memoryBuildJob)
      .set({ status: "completed" })
      .where(inArray(memoryBuildJob.id, runningMemoryJobIds));
    await db
      .getClient()
      .update(searchDirtyQueue)
      .set({ status: "completed" })
      .where(eq(searchDirtyQueue.id, runningSearchJobId));

    const remainingMemoryJobs = await db
      .getClient()
      .select()
      .from(memoryBuildJob)
      .where(eq(memoryBuildJob.status, "pending"));
    const remainingSearchJobs = await db
      .getClient()
      .select()
      .from(searchDirtyQueue)
      .where(eq(searchDirtyQueue.status, "pending"));
    expect(remainingMemoryJobs).toHaveLength(runningMemoryJobIds.length);
    expect(remainingSearchJobs).toHaveLength(1);
  });

  it("does not create a new pending memory job when a matching paused job exists", async () => {
    const projectId = crypto.randomUUID();
    const chapterId = crypto.randomUUID();
    await seedProject(projectId);
    const pausedJobId = await seedMemoryJob({
      projectId,
      chapterId,
      jobType: MEMORY_JOB_TYPES.REBUILD_SUMMARY,
      status: "paused",
      priority: 90,
    });

    await enqueueChapterDerivedJobs({
      projectId,
      chapterId,
      reason: "writer-edited-earlier-chapter",
    });

    const jobs = await listMemoryJobs({
      projectId,
      chapterId,
      jobType: MEMORY_JOB_TYPES.REBUILD_SUMMARY,
    });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      id: pausedJobId,
      status: "paused",
      priority: MEMORY_JOB_PRIORITY.SUMMARY,
    });
  });

  it("replaces a failed memory job with one pending generation", async () => {
    const projectId = crypto.randomUUID();
    const chapterId = crypto.randomUUID();
    await seedProject(projectId);
    const failedJobId = await seedMemoryJob({
      projectId,
      chapterId,
      jobType: MEMORY_JOB_TYPES.REBUILD_EMBEDDING,
      status: "failed",
      priority: 90,
    });

    await enqueueChapterDerivedJobs({
      projectId,
      chapterId,
      reason: "writer-edited-earlier-chapter",
    });

    const jobs = await listMemoryJobs({
      projectId,
      chapterId,
      jobType: MEMORY_JOB_TYPES.REBUILD_EMBEDDING,
    });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      status: "pending",
      priority: MEMORY_JOB_PRIORITY.EMBEDDING,
      attempts: 0,
      error: null,
    });
    expect(jobs[0].id).not.toBe(failedJobId);
  });
});
