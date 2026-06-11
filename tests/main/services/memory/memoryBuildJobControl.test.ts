import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  db,
  memoryBuildJob,
  project,
} from "../../../../src/main/infra/database/index.js";
import {
  cancelMemoryBuildJobs,
  claimMemoryBuildJob,
  finalizeMemoryBuildJobCancellation,
  getMemoryBuildJobProgress,
  isMemoryBuildJobCancellationRequested,
  pauseMemoryBuildJobs,
  recoverStaleRunningMemoryBuildJobs,
  resumeMemoryBuildJobs,
} from "../../../../src/main/services/features/memory/jobControl.js";
import {
  MEMORY_JOB_TYPES,
  MEMORY_TARGET_TYPES,
} from "../../../../src/main/services/features/memory/memoryJobConstants.js";

async function seedProject(projectId: string): Promise<void> {
  await db.getClient().insert(project).values({
    id: projectId,
    title: "Job Control",
    description: null,
    projectPath: null,
    updatedAt: "2026-06-11T00:00:00.000Z",
  });
}

async function seedJob(input: {
  projectId: string;
  status: string;
  id?: string;
  jobType?: string;
  attempts?: number;
  error?: string | null;
  updatedAt?: string;
}): Promise<string> {
  const id = input.id ?? crypto.randomUUID();
  await db.getClient().insert(memoryBuildJob).values({
    id,
    projectId: input.projectId,
    targetType: MEMORY_TARGET_TYPES.CHAPTER,
    targetId: `chapter-${id}`,
    jobType: input.jobType ?? MEMORY_JOB_TYPES.REBUILD_SUMMARY,
    status: input.status,
    priority: 50,
    attempts: input.attempts ?? 0,
    error: input.error ?? null,
    createdAt: "2026-06-11T00:00:00.000Z",
    updatedAt: input.updatedAt ?? "2026-06-11T00:00:00.000Z",
  });
  return id;
}

async function getJobStatus(id: string): Promise<string | undefined> {
  const [row] = await db
    .getClient()
    .select({ status: memoryBuildJob.status })
    .from(memoryBuildJob)
    .where(eq(memoryBuildJob.id, id));
  return row?.status;
}

describe("memory build job control", () => {
  it("pauses, resumes, cancels and reports progress without claiming jobs", async () => {
    const projectId = crypto.randomUUID();
    await seedProject(projectId);
    const pendingId = await seedJob({ projectId, status: "pending" });
    const failedId = await seedJob({ projectId, status: "failed" });
    const runningId = await seedJob({ projectId, status: "running" });

    await expect(pauseMemoryBuildJobs({ projectId })).resolves.toMatchObject({
      paused: 2,
    });
    await expect(getJobStatus(pendingId)).resolves.toBe("paused");
    await expect(getJobStatus(failedId)).resolves.toBe("paused");
    await expect(getJobStatus(runningId)).resolves.toBe("running");

    await expect(resumeMemoryBuildJobs({ projectId })).resolves.toMatchObject({
      resumed: 2,
    });
    await expect(getJobStatus(pendingId)).resolves.toBe("pending");
    await expect(getJobStatus(failedId)).resolves.toBe("pending");

    await expect(cancelMemoryBuildJobs({ projectId })).resolves.toMatchObject({
      canceled: 2,
      cancellationRequested: 1,
    });
    await expect(getJobStatus(pendingId)).resolves.toBe("canceled");
    await expect(getJobStatus(failedId)).resolves.toBe("canceled");
    await expect(getJobStatus(runningId)).resolves.toBe("cancel_requested");
    await expect(
      isMemoryBuildJobCancellationRequested({ jobId: runningId }),
    ).resolves.toBe(true);

    const recovered = await recoverStaleRunningMemoryBuildJobs({
      projectId,
      staleBeforeIso: "2026-06-11T00:01:00.000Z",
    });
    expect(recovered).toEqual({ recovered: 0 });
    await expect(getJobStatus(runningId)).resolves.toBe("cancel_requested");

    await expect(
      finalizeMemoryBuildJobCancellation({ jobId: runningId }),
    ).resolves.toEqual({ canceled: true });
    await expect(getJobStatus(runningId)).resolves.toBe("canceled");

    const progress = await getMemoryBuildJobProgress({ projectId });
    expect(progress.total).toBe(3);
    expect(progress.byStatus).toMatchObject({ canceled: 3 });
    expect(progress.activeCount).toBe(0);
    expect(progress.doneCount).toBe(3);
  });

  it("claims only pending or failed jobs and leaves paused/canceled/running jobs untouched", async () => {
    const projectId = crypto.randomUUID();
    await seedProject(projectId);
    const pendingId = await seedJob({ projectId, status: "pending" });
    const failedId = await seedJob({ projectId, status: "failed" });
    const pausedId = await seedJob({ projectId, status: "paused" });
    const canceledId = await seedJob({ projectId, status: "canceled" });
    const runningId = await seedJob({ projectId, status: "running" });

    await expect(claimMemoryBuildJob({ jobId: pendingId })).resolves.toEqual({
      claimed: true,
    });
    await expect(claimMemoryBuildJob({ jobId: failedId })).resolves.toEqual({
      claimed: true,
    });
    await expect(claimMemoryBuildJob({ jobId: pausedId })).resolves.toEqual({
      claimed: false,
    });
    await expect(claimMemoryBuildJob({ jobId: canceledId })).resolves.toEqual({
      claimed: false,
    });
    await expect(claimMemoryBuildJob({ jobId: runningId })).resolves.toEqual({
      claimed: false,
    });

    await expect(getJobStatus(pendingId)).resolves.toBe("running");
    await expect(getJobStatus(failedId)).resolves.toBe("running");
    await expect(getJobStatus(pausedId)).resolves.toBe("paused");
    await expect(getJobStatus(canceledId)).resolves.toBe("canceled");
    await expect(getJobStatus(runningId)).resolves.toBe("running");
  });

  it("reports progress grouped by job type so writers can see the bottleneck", async () => {
    const projectId = crypto.randomUUID();
    await seedProject(projectId);
    await seedJob({
      projectId,
      status: "pending",
      jobType: MEMORY_JOB_TYPES.REBUILD_CHUNKS,
    });
    await seedJob({
      projectId,
      status: "running",
      jobType: MEMORY_JOB_TYPES.REBUILD_CHUNKS,
    });
    await seedJob({
      projectId,
      status: "completed",
      jobType: MEMORY_JOB_TYPES.REBUILD_SUMMARY,
    });
    await seedJob({
      projectId,
      status: "canceled",
      jobType: MEMORY_JOB_TYPES.REBUILD_EMBEDDING,
    });

    const progress = await getMemoryBuildJobProgress({ projectId });

    expect(progress.byJobType).toEqual({
      [MEMORY_JOB_TYPES.REBUILD_CHUNKS]: {
        total: 2,
        activeCount: 2,
        doneCount: 0,
        byStatus: {
          pending: 1,
          running: 1,
        },
      },
      [MEMORY_JOB_TYPES.REBUILD_SUMMARY]: {
        total: 1,
        activeCount: 0,
        doneCount: 1,
        byStatus: {
          completed: 1,
        },
      },
      [MEMORY_JOB_TYPES.REBUILD_EMBEDDING]: {
        total: 1,
        activeCount: 0,
        doneCount: 1,
        byStatus: {
          canceled: 1,
        },
      },
    });
  });

  it("reports retry and stale cancellation attention counts for writer-facing progress", async () => {
    const projectId = crypto.randomUUID();
    await seedProject(projectId);
    await seedJob({
      projectId,
      status: "failed",
      attempts: 1,
      error: "TEMPORARY_PROVIDER_ERROR",
      updatedAt: "2026-06-11T00:00:00.000Z",
    });
    await seedJob({
      projectId,
      status: "failed",
      attempts: 2,
      error: "WAITING_FOR_BACKOFF",
      updatedAt: "2026-06-11T00:00:09.000Z",
    });
    await seedJob({
      projectId,
      status: "failed",
      attempts: 5,
      error: "MAX_ATTEMPTS_REACHED",
      updatedAt: "2026-06-11T00:00:00.000Z",
    });
    await seedJob({
      projectId,
      status: "cancel_requested",
      updatedAt: "2026-06-11T00:00:00.000Z",
    });

    const progress = await getMemoryBuildJobProgress({
      projectId,
      nowIso: "2026-06-11T00:00:10.000Z",
    });

    expect(progress.attention).toEqual({
      retryableFailedCount: 1,
      retryBackoffCount: 1,
      exhaustedFailedCount: 1,
      staleCancellationRequestedCount: 1,
      latestError: "WAITING_FOR_BACKOFF",
    });
  });

  it("uses a short progress snapshot cache and refreshes it after ttl", async () => {
    const projectId = crypto.randomUUID();
    await seedProject(projectId);
    await seedJob({ projectId, status: "pending" });

    const first = await getMemoryBuildJobProgress({
      projectId,
      nowIso: "2026-06-11T00:00:00.000Z",
    });
    expect(first.total).toBe(1);

    await seedJob({ projectId, status: "pending" });

    const cached = await getMemoryBuildJobProgress({
      projectId,
      nowIso: "2026-06-11T00:00:00.500Z",
    });
    expect(cached.total).toBe(1);

    const refreshed = await getMemoryBuildJobProgress({
      projectId,
      nowIso: "2026-06-11T00:00:02.000Z",
    });
    expect(refreshed.total).toBe(2);
  });
});
