import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import {
  db,
  memoryBuildJob,
  project,
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
  await db.getClient().insert(memoryBuildJob).values({
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

describe("enqueueChapterDerivedJobs", () => {
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

  it("updates a matching failed memory job instead of creating a duplicate retry job", async () => {
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
      id: failedJobId,
      status: "failed",
      priority: MEMORY_JOB_PRIORITY.EMBEDDING,
    });
  });
});
