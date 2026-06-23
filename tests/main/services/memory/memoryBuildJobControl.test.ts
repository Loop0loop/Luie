import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  db,
  character,
  chapter,
  event,
  faction,
  memoryChunk,
  memoryBuildJob,
  note,
  plot,
  project,
  scrapMemo,
  scene,
  synopsis,
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

const MEMORY_TARGET_TYPE_CHUNK = "chunk";

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
  targetType?: string;
  targetId?: string;
  attempts?: number;
  error?: string | null;
  updatedAt?: string;
}): Promise<string> {
  const id = input.id ?? crypto.randomUUID();
  await db.getClient().insert(memoryBuildJob).values({
    id,
    projectId: input.projectId,
    targetType: input.targetType ?? MEMORY_TARGET_TYPES.CHAPTER,
    targetId: input.targetId ?? `chapter-${id}`,
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

async function seedChapter(input: {
  projectId: string;
  id: string;
  title: string;
  order: number;
}): Promise<void> {
  await db.getClient().insert(chapter).values({
    id: input.id,
    projectId: input.projectId,
    title: input.title,
    content: "",
    synopsis: null,
    order: input.order,
    wordCount: 0,
    createdAt: "2026-06-11T00:00:00.000Z",
    updatedAt: "2026-06-11T00:00:00.000Z",
    deletedAt: null,
  });
}

async function seedScene(input: {
  projectId: string;
  id: string;
  chapterId: string;
  title: string;
  order: number;
}): Promise<void> {
  await db.getClient().insert(scene).values({
    id: input.id,
    projectId: input.projectId,
    chapterId: input.chapterId,
    title: input.title,
    body: "",
    startOffset: null,
    endOffset: null,
    order: input.order,
    createdAt: "2026-06-11T00:00:00.000Z",
    updatedAt: "2026-06-11T00:00:00.000Z",
    deletedAt: null,
  });
}

async function seedNote(input: {
  projectId: string;
  id: string;
  title: string;
  chapterId?: string | null;
}): Promise<void> {
  await db.getClient().insert(note).values({
    id: input.id,
    projectId: input.projectId,
    chapterId: input.chapterId ?? null,
    title: input.title,
    body: "",
    createdAt: "2026-06-11T00:00:00.000Z",
    updatedAt: "2026-06-11T00:00:00.000Z",
    deletedAt: null,
  });
}

async function seedMemoryChunk(input: {
  projectId: string;
  id: string;
  sourceType: string;
  sourceId: string;
  chapterId?: string | null;
  sceneId?: string | null;
  chunkIndex: number;
  contextLabel?: string | null;
}): Promise<void> {
  await db.getClient().insert(memoryChunk).values({
    id: input.id,
    projectId: input.projectId,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    chapterId: input.chapterId ?? null,
    sceneId: input.sceneId ?? null,
    chunkIndex: input.chunkIndex,
    content: "기억 chunk 본문",
    contentHash: `${input.id}:content`,
    indexText: "기억 chunk 본문",
    indexTextHash: `${input.id}:index`,
    contextLabel: input.contextLabel ?? null,
    sourceContentHash: `${input.sourceId}:source`,
    startOffset: 120,
    endOffset: 240,
    paragraphStartIndex: 3,
    paragraphEndIndex: 4,
    tokenCount: 42,
    createdAt: "2026-06-11T00:00:00.000Z",
    updatedAt: "2026-06-11T00:00:00.000Z",
  });
}

async function seedTitledDocument(input: {
  table: typeof synopsis | typeof plot | typeof scrapMemo;
  projectId: string;
  id: string;
  title: string;
}): Promise<void> {
  await db.getClient().insert(input.table).values({
    id: input.id,
    projectId: input.projectId,
    title: input.title,
    body: "",
    content: "",
    tags: "[]",
    sortOrder: 0,
    createdAt: "2026-06-11T00:00:00.000Z",
    updatedAt: "2026-06-11T00:00:00.000Z",
    deletedAt: null,
  });
}

async function seedWorldEntry(input: {
  table: typeof character | typeof faction | typeof event;
  projectId: string;
  id: string;
  name: string;
}): Promise<void> {
  await db.getClient().insert(input.table).values({
    id: input.id,
    projectId: input.projectId,
    name: input.name,
    description: null,
    firstAppearance: null,
    attributes: null,
    createdAt: "2026-06-11T00:00:00.000Z",
    updatedAt: "2026-06-11T00:00:00.000Z",
    deletedAt: null,
  });
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

  it("reports progress grouped by target type so writers can see which manuscript unit is blocked", async () => {
    const projectId = crypto.randomUUID();
    await seedProject(projectId);
    await seedJob({
      projectId,
      status: "pending",
      targetType: MEMORY_TARGET_TYPES.CHAPTER,
    });
    await seedJob({
      projectId,
      status: "completed",
      targetType: MEMORY_TARGET_TYPES.CHAPTER,
    });
    await seedJob({
      projectId,
      status: "running",
      targetType: MEMORY_TARGET_TYPES.SCENE,
    });
    await seedJob({
      projectId,
      status: "canceled",
      targetType: MEMORY_TARGET_TYPES.NOTE,
    });

    const progress = await getMemoryBuildJobProgress({ projectId });

    expect(progress.byTargetType).toEqual({
      [MEMORY_TARGET_TYPES.CHAPTER]: {
        total: 2,
        activeCount: 1,
        doneCount: 1,
        byStatus: {
          pending: 1,
          completed: 1,
        },
      },
      [MEMORY_TARGET_TYPES.SCENE]: {
        total: 1,
        activeCount: 1,
        doneCount: 0,
        byStatus: {
          running: 1,
        },
      },
      [MEMORY_TARGET_TYPES.NOTE]: {
        total: 1,
        activeCount: 0,
        doneCount: 1,
        byStatus: {
          canceled: 1,
        },
      },
    });
  });

  it("reports progress grouped by individual target id for chapter-level visibility", async () => {
    const projectId = crypto.randomUUID();
    await seedProject(projectId);
    await seedChapter({
      projectId,
      id: "chapter-12",
      title: "검은 기사",
      order: 12,
    });
    await seedScene({
      projectId,
      id: "scene-1",
      chapterId: "chapter-12",
      title: "골목 추격",
      order: 3,
    });
    await seedNote({
      projectId,
      id: "note-1",
      title: "폐기 후보 설정",
    });
    await seedJob({
      projectId,
      status: "pending",
      targetType: MEMORY_TARGET_TYPES.CHAPTER,
      targetId: "chapter-12",
    });
    await seedJob({
      projectId,
      status: "running",
      targetType: MEMORY_TARGET_TYPES.CHAPTER,
      targetId: "chapter-12",
    });
    await seedJob({
      projectId,
      status: "completed",
      targetType: MEMORY_TARGET_TYPES.CHAPTER,
      targetId: "chapter-13",
    });
    await seedJob({
      projectId,
      status: "pending",
      targetType: MEMORY_TARGET_TYPES.SCENE,
      targetId: "scene-1",
    });
    await seedJob({
      projectId,
      status: "pending",
      targetType: MEMORY_TARGET_TYPES.NOTE,
      targetId: "note-1",
    });

    const progress = await getMemoryBuildJobProgress({ projectId });

    expect(progress.byTarget).toEqual({
      "chapter:chapter-12": {
        targetType: MEMORY_TARGET_TYPES.CHAPTER,
        targetId: "chapter-12",
        label: "12화 · 검은 기사",
        total: 2,
        activeCount: 2,
        doneCount: 0,
        byStatus: {
          pending: 1,
          running: 1,
        },
      },
      "chapter:chapter-13": {
        targetType: MEMORY_TARGET_TYPES.CHAPTER,
        targetId: "chapter-13",
        label: null,
        total: 1,
        activeCount: 0,
        doneCount: 1,
        byStatus: {
          completed: 1,
        },
      },
      "scene:scene-1": {
        targetType: MEMORY_TARGET_TYPES.SCENE,
        targetId: "scene-1",
        label: "12화 · 장면 3 · 골목 추격",
        total: 1,
        activeCount: 1,
        doneCount: 0,
        byStatus: {
          pending: 1,
        },
      },
      "note:note-1": {
        targetType: MEMORY_TARGET_TYPES.NOTE,
        targetId: "note-1",
        label: "노트 · 폐기 후보 설정",
        total: 1,
        activeCount: 1,
        doneCount: 0,
        byStatus: {
          pending: 1,
        },
      },
    });
  });

  it("labels worldbuilding and reference targets with writer-facing names", async () => {
    const projectId = crypto.randomUUID();
    await seedProject(projectId);
    await seedTitledDocument({
      table: synopsis,
      projectId,
      id: "synopsis-1",
      title: "2막 전개안",
    });
    await seedTitledDocument({
      table: plot,
      projectId,
      id: "plot-1",
      title: "배신 반전",
    });
    await seedTitledDocument({
      table: scrapMemo,
      projectId,
      id: "scrap-1",
      title: "독자 댓글 아이디어",
    });
    await seedWorldEntry({
      table: character,
      projectId,
      id: "character-1",
      name: "유리아",
    });
    await seedWorldEntry({
      table: faction,
      projectId,
      id: "faction-1",
      name: "흑월회",
    });
    await seedWorldEntry({
      table: event,
      projectId,
      id: "event-1",
      name: "왕도 습격",
    });

    await seedJob({
      projectId,
      status: "pending",
      targetType: MEMORY_TARGET_TYPES.SYNOPSIS,
      targetId: "synopsis-1",
    });
    await seedJob({
      projectId,
      status: "pending",
      targetType: MEMORY_TARGET_TYPES.PLOT,
      targetId: "plot-1",
    });
    await seedJob({
      projectId,
      status: "pending",
      targetType: MEMORY_TARGET_TYPES.CHARACTER,
      targetId: "character-1",
    });
    await seedJob({
      projectId,
      status: "pending",
      targetType: MEMORY_TARGET_TYPES.FACTION,
      targetId: "faction-1",
    });
    await seedJob({
      projectId,
      status: "pending",
      targetType: MEMORY_TARGET_TYPES.EVENT,
      targetId: "event-1",
    });
    await seedJob({
      projectId,
      status: "pending",
      targetType: MEMORY_TARGET_TYPES.SCRAP_MEMO,
      targetId: "scrap-1",
    });

    const progress = await getMemoryBuildJobProgress({ projectId });

    expect(progress.byTarget["synopsis:synopsis-1"]?.label).toBe(
      "시놉시스 · 2막 전개안",
    );
    expect(progress.byTarget["plot:plot-1"]?.label).toBe("플롯 · 배신 반전");
    expect(progress.byTarget["character:character-1"]?.label).toBe(
      "인물 · 유리아",
    );
    expect(progress.byTarget["faction:faction-1"]?.label).toBe(
      "세력 · 흑월회",
    );
    expect(progress.byTarget["event:event-1"]?.label).toBe(
      "사건 · 왕도 습격",
    );
    expect(progress.byTarget["scrapMemo:scrap-1"]?.label).toBe(
      "자료 메모 · 독자 댓글 아이디어",
    );
  });

  it("labels chunk targets with chapter and context so writers can locate the blocked source", async () => {
    const projectId = crypto.randomUUID();
    await seedProject(projectId);
    await seedChapter({
      projectId,
      id: "chapter-7",
      title: "비밀의 문",
      order: 7,
    });
    await seedMemoryChunk({
      projectId,
      id: "chunk-7-3",
      sourceType: MEMORY_TARGET_TYPES.CHAPTER,
      sourceId: "chapter-7",
      chapterId: "chapter-7",
      chunkIndex: 3,
      contextLabel: "회상 장면",
    });
    await seedJob({
      projectId,
      status: "pending",
      targetType: MEMORY_TARGET_TYPE_CHUNK,
      targetId: "chunk-7-3",
    });

    const progress = await getMemoryBuildJobProgress({ projectId });

    expect(progress.byTarget["chunk:chunk-7-3"]?.label).toBe(
      "7화 · 비밀의 문 · chunk 4 · 회상 장면",
    );
  });

  it("limits individual target progress to the busiest targets for large projects", async () => {
    const projectId = crypto.randomUUID();
    await seedProject(projectId);
    await Promise.all(
      Array.from({ length: 25 }, (_, index) =>
        seedJob({
          projectId,
          status: "pending",
          targetType: MEMORY_TARGET_TYPES.CHAPTER,
          targetId: `chapter-${index}`,
        }),
      ),
    );
    await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        seedJob({
          projectId,
          status: "running",
          targetType: MEMORY_TARGET_TYPES.CHAPTER,
          targetId: `chapter-${index}`,
        }),
      ),
    );

    const progress = await getMemoryBuildJobProgress({ projectId });

    expect(progress.total).toBe(30);
    expect(progress.byTargetType[MEMORY_TARGET_TYPES.CHAPTER]?.total).toBe(30);
    expect(Object.keys(progress.byTarget)).toHaveLength(20);
    expect(progress.byTarget["chapter:chapter-0"]?.activeCount).toBe(2);
    expect(progress.byTarget["chapter:chapter-4"]?.activeCount).toBe(2);
    expect(progress.byTarget["chapter:chapter-5"]).toBeUndefined();
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
    await seedJob({
      projectId,
      status: "pending",
      error: "RECOVERED_STALE_RUNNING_JOB",
      updatedAt: "2026-06-11T00:00:09.000Z",
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
      recoveredStaleRunningCount: 1,
      nextRetryAt: "2026-06-11T00:00:13.000Z",
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
