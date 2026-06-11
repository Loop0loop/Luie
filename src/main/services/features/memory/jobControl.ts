import { and, eq, inArray, sql } from "drizzle-orm";
import {
  character,
  db,
  chapter,
  event,
  faction,
  memoryChunk,
  memoryBuildJob,
  note,
  plot,
  scrapMemo,
  scene,
  synopsis,
} from "../../../infra/database/index.js";
import {
  getMemoryBuildJobRetryBackoffMs,
  MAX_JOB_ATTEMPTS,
} from "./projection/jobPolicy.js";

const PAUSABLE_STATUSES = ["pending", "failed"] as const;
const CLAIMABLE_STATUSES = ["pending", "failed"] as const;
const RESUMABLE_STATUSES = ["paused"] as const;
const CANCELABLE_STATUSES = ["pending", "failed", "paused"] as const;
const CANCELLATION_REQUESTABLE_STATUSES = ["running"] as const;
const DONE_STATUSES = ["completed", "skipped", "canceled"] as const;
const ACTIVE_STATUSES = [
  "pending",
  "failed",
  "running",
  "paused",
  "cancel_requested",
] as const;
const RECOVERED_STALE_RUNNING_JOB = "RECOVERED_STALE_RUNNING_JOB";
const STALE_CANCELLATION_REQUEST_MS = 5_000;
const PROGRESS_SNAPSHOT_TTL_MS = 1_000;
const TARGET_PROGRESS_LIMIT = 20;

const progressSnapshotCache = new Map<
  string,
  {
    capturedAtMs: number;
    progress: MemoryBuildJobProgress;
  }
>();

export type MemoryBuildJobProgress = {
  projectId: string;
  total: number;
  activeCount: number;
  doneCount: number;
  byStatus: Record<string, number>;
  attention: {
    retryableFailedCount: number;
    retryBackoffCount: number;
    exhaustedFailedCount: number;
    staleCancellationRequestedCount: number;
    recoveredStaleRunningCount: number;
    nextRetryAt: string | null;
    latestError: string | null;
  };
  byJobType: Record<
    string,
    {
      total: number;
      activeCount: number;
      doneCount: number;
      byStatus: Record<string, number>;
    }
  >;
  byTargetType: Record<
    string,
    {
      total: number;
      activeCount: number;
      doneCount: number;
      byStatus: Record<string, number>;
    }
  >;
  byTarget: Record<
    string,
    {
      targetType: string;
      targetId: string;
      label: string | null;
      total: number;
      activeCount: number;
      doneCount: number;
      byStatus: Record<string, number>;
    }
  >;
};

function nowIso(): string {
  return new Date().toISOString();
}

function nowMsFromIso(iso?: string): number {
  const timestamp = Date.parse(iso ?? nowIso());
  return Number.isFinite(timestamp) ? timestamp : Date.now();
}

function invalidateMemoryBuildProgressSnapshot(projectId?: string): void {
  if (projectId) {
    progressSnapshotCache.delete(projectId);
    return;
  }
  progressSnapshotCache.clear();
}

function createProgressBucket(): {
  total: number;
  activeCount: number;
  doneCount: number;
  byStatus: Record<string, number>;
} {
  return {
    total: 0,
    activeCount: 0,
    doneCount: 0,
    byStatus: {},
  };
}

function addStatusCount(
  bucket: ReturnType<typeof createProgressBucket>,
  status: string,
  count: number,
): void {
  bucket.total += count;
  bucket.byStatus[status] = count;
  if ((DONE_STATUSES as readonly string[]).includes(status)) {
    bucket.doneCount += count;
  }
  if ((ACTIVE_STATUSES as readonly string[]).includes(status)) {
    bucket.activeCount += count;
  }
}

function targetKey(targetType: string, targetId: string): string {
  return `${targetType}:${targetId}`;
}

async function loadTargetLabels(input: {
  projectId: string;
  targets: Array<{ targetType: string; targetId: string }>;
}): Promise<Map<string, string>> {
  const chapterIds = [
    ...new Set(
      input.targets
        .filter((target) => target.targetType === "chapter")
        .map((target) => target.targetId),
    ),
  ];
  const sceneIds = [
    ...new Set(
      input.targets
        .filter((target) => target.targetType === "scene")
        .map((target) => target.targetId),
    ),
  ];
  const noteIds = [
    ...new Set(
      input.targets
        .filter((target) => target.targetType === "note")
        .map((target) => target.targetId),
    ),
  ];
  const synopsisIds = [
    ...new Set(
      input.targets
        .filter((target) => target.targetType === "synopsis")
        .map((target) => target.targetId),
    ),
  ];
  const plotIds = [
    ...new Set(
      input.targets
        .filter((target) => target.targetType === "plot")
        .map((target) => target.targetId),
    ),
  ];
  const characterIds = [
    ...new Set(
      input.targets
        .filter((target) => target.targetType === "character")
        .map((target) => target.targetId),
    ),
  ];
  const factionIds = [
    ...new Set(
      input.targets
        .filter((target) => target.targetType === "faction")
        .map((target) => target.targetId),
    ),
  ];
  const eventIds = [
    ...new Set(
      input.targets
        .filter((target) => target.targetType === "event")
        .map((target) => target.targetId),
    ),
  ];
  const scrapMemoIds = [
    ...new Set(
      input.targets
        .filter((target) => target.targetType === "scrapMemo")
        .map((target) => target.targetId),
    ),
  ];
  const chunkIds = [
    ...new Set(
      input.targets
        .filter((target) => target.targetType === "chunk")
        .map((target) => target.targetId),
    ),
  ];
  const labels = new Map<string, string>();
  if (chapterIds.length > 0) {
    const rows = await db
      .getClient()
      .select({
        id: chapter.id,
        title: chapter.title,
        order: chapter.order,
      })
      .from(chapter)
      .where(
        and(
          eq(chapter.projectId, input.projectId),
          inArray(chapter.id, chapterIds),
        ),
      );
    for (const row of rows) {
      labels.set(`chapter:${row.id}`, `${row.order}화 · ${row.title}`);
    }
  }
  if (sceneIds.length > 0) {
    const rows = await db
      .getClient()
      .select({
        id: scene.id,
        title: scene.title,
        order: scene.order,
        chapterOrder: chapter.order,
      })
      .from(scene)
      .leftJoin(chapter, eq(chapter.id, scene.chapterId))
      .where(
        and(
          eq(scene.projectId, input.projectId),
          inArray(scene.id, sceneIds),
        ),
      );
    for (const row of rows) {
      const chapterPrefix =
        typeof row.chapterOrder === "number" ? `${row.chapterOrder}화 · ` : "";
      labels.set(
        `scene:${row.id}`,
        `${chapterPrefix}장면 ${row.order} · ${row.title}`,
      );
    }
  }
  if (noteIds.length > 0) {
    const rows = await db
      .getClient()
      .select({
        id: note.id,
        title: note.title,
      })
      .from(note)
      .where(
        and(
          eq(note.projectId, input.projectId),
          inArray(note.id, noteIds),
        ),
      );
    for (const row of rows) {
      labels.set(`note:${row.id}`, `노트 · ${row.title}`);
    }
  }
  if (synopsisIds.length > 0) {
    const rows = await db
      .getClient()
      .select({
        id: synopsis.id,
        title: synopsis.title,
      })
      .from(synopsis)
      .where(
        and(
          eq(synopsis.projectId, input.projectId),
          inArray(synopsis.id, synopsisIds),
        ),
      );
    for (const row of rows) {
      labels.set(`synopsis:${row.id}`, `시놉시스 · ${row.title}`);
    }
  }
  if (plotIds.length > 0) {
    const rows = await db
      .getClient()
      .select({
        id: plot.id,
        title: plot.title,
      })
      .from(plot)
      .where(
        and(eq(plot.projectId, input.projectId), inArray(plot.id, plotIds)),
      );
    for (const row of rows) {
      labels.set(`plot:${row.id}`, `플롯 · ${row.title}`);
    }
  }
  if (characterIds.length > 0) {
    const rows = await db
      .getClient()
      .select({
        id: character.id,
        name: character.name,
      })
      .from(character)
      .where(
        and(
          eq(character.projectId, input.projectId),
          inArray(character.id, characterIds),
        ),
      );
    for (const row of rows) {
      labels.set(`character:${row.id}`, `인물 · ${row.name}`);
    }
  }
  if (factionIds.length > 0) {
    const rows = await db
      .getClient()
      .select({
        id: faction.id,
        name: faction.name,
      })
      .from(faction)
      .where(
        and(
          eq(faction.projectId, input.projectId),
          inArray(faction.id, factionIds),
        ),
      );
    for (const row of rows) {
      labels.set(`faction:${row.id}`, `세력 · ${row.name}`);
    }
  }
  if (eventIds.length > 0) {
    const rows = await db
      .getClient()
      .select({
        id: event.id,
        name: event.name,
      })
      .from(event)
      .where(
        and(eq(event.projectId, input.projectId), inArray(event.id, eventIds)),
      );
    for (const row of rows) {
      labels.set(`event:${row.id}`, `사건 · ${row.name}`);
    }
  }
  if (scrapMemoIds.length > 0) {
    const rows = await db
      .getClient()
      .select({
        id: scrapMemo.id,
        title: scrapMemo.title,
      })
      .from(scrapMemo)
      .where(
        and(
          eq(scrapMemo.projectId, input.projectId),
          inArray(scrapMemo.id, scrapMemoIds),
        ),
      );
    for (const row of rows) {
      labels.set(`scrapMemo:${row.id}`, `자료 메모 · ${row.title}`);
    }
  }
  if (chunkIds.length > 0) {
    const rows = await db
      .getClient()
      .select({
        id: memoryChunk.id,
        chunkIndex: memoryChunk.chunkIndex,
        contextLabel: memoryChunk.contextLabel,
        chapterTitle: chapter.title,
        chapterOrder: chapter.order,
        sceneTitle: scene.title,
        sceneOrder: scene.order,
      })
      .from(memoryChunk)
      .leftJoin(chapter, eq(chapter.id, memoryChunk.chapterId))
      .leftJoin(scene, eq(scene.id, memoryChunk.sceneId))
      .where(
        and(
          eq(memoryChunk.projectId, input.projectId),
          inArray(memoryChunk.id, chunkIds),
        ),
      );
    for (const row of rows) {
      const parts = [
        typeof row.chapterOrder === "number"
          ? `${row.chapterOrder}화`
          : null,
        row.chapterTitle,
        typeof row.sceneOrder === "number" ? `장면 ${row.sceneOrder}` : null,
        row.sceneTitle,
        `chunk ${row.chunkIndex + 1}`,
        row.contextLabel,
      ].filter((part): part is string => typeof part === "string" && part.length > 0);
      labels.set(`chunk:${row.id}`, parts.join(" · "));
    }
  }
  return labels;
}

export async function pauseMemoryBuildJobs(input: {
  projectId: string;
}): Promise<{ paused: number }> {
  const result = await db
    .getClient()
    .update(memoryBuildJob)
    .set({
      status: "paused",
      error: null,
      updatedAt: nowIso(),
    })
    .where(
      and(
        eq(memoryBuildJob.projectId, input.projectId),
        inArray(memoryBuildJob.status, [...PAUSABLE_STATUSES]),
      ),
    );

  if (result.changes > 0) {
    invalidateMemoryBuildProgressSnapshot(input.projectId);
  }
  return { paused: result.changes };
}

export async function claimMemoryBuildJob(input: {
  jobId: string;
  nowIso?: string;
}): Promise<{ claimed: boolean }> {
  const claimed = await db
    .getClient()
    .update(memoryBuildJob)
    .set({
      status: "running",
      updatedAt: input.nowIso ?? nowIso(),
    })
    .where(
      and(
        eq(memoryBuildJob.id, input.jobId),
        inArray(memoryBuildJob.status, [...CLAIMABLE_STATUSES]),
      ),
    )
    .returning({ id: memoryBuildJob.id });

  if (claimed.length > 0) {
    invalidateMemoryBuildProgressSnapshot();
  }
  return { claimed: claimed.length > 0 };
}

export async function resumeMemoryBuildJobs(input: {
  projectId: string;
}): Promise<{ resumed: number }> {
  const result = await db
    .getClient()
    .update(memoryBuildJob)
    .set({
      status: "pending",
      error: null,
      updatedAt: nowIso(),
    })
    .where(
      and(
        eq(memoryBuildJob.projectId, input.projectId),
        inArray(memoryBuildJob.status, [...RESUMABLE_STATUSES]),
      ),
    );

  if (result.changes > 0) {
    invalidateMemoryBuildProgressSnapshot(input.projectId);
  }
  return { resumed: result.changes };
}

export async function cancelMemoryBuildJobs(input: {
  projectId: string;
}): Promise<{ canceled: number; cancellationRequested: number }> {
  const client = db.getClient();
  const canceledResult = await client
    .update(memoryBuildJob)
    .set({
      status: "canceled",
      error: "CANCELED_BY_USER",
      updatedAt: nowIso(),
    })
    .where(
      and(
        eq(memoryBuildJob.projectId, input.projectId),
        inArray(memoryBuildJob.status, [...CANCELABLE_STATUSES]),
      ),
    );

  const cancellationRequestedResult = await client
    .update(memoryBuildJob)
    .set({
      status: "cancel_requested",
      error: "CANCELLATION_REQUESTED_BY_USER",
      updatedAt: nowIso(),
    })
    .where(
      and(
        eq(memoryBuildJob.projectId, input.projectId),
        inArray(memoryBuildJob.status, [...CANCELLATION_REQUESTABLE_STATUSES]),
      ),
    );

  if (canceledResult.changes > 0 || cancellationRequestedResult.changes > 0) {
    invalidateMemoryBuildProgressSnapshot(input.projectId);
  }
  return {
    canceled: canceledResult.changes,
    cancellationRequested: cancellationRequestedResult.changes,
  };
}

export async function isMemoryBuildJobCancellationRequested(input: {
  jobId: string;
}): Promise<boolean> {
  const rows = await db
    .getClient()
    .select({ status: memoryBuildJob.status })
    .from(memoryBuildJob)
    .where(eq(memoryBuildJob.id, input.jobId))
    .limit(1);
  const status = rows[0]?.status;
  return status === "cancel_requested" || status === "canceled";
}

export async function finalizeMemoryBuildJobCancellation(input: {
  jobId: string;
  nowIso?: string;
}): Promise<{ canceled: boolean }> {
  const result = await db
    .getClient()
    .update(memoryBuildJob)
    .set({
      status: "canceled",
      error: "CANCELED_BY_USER",
      updatedAt: input.nowIso ?? nowIso(),
    })
    .where(
      and(
        eq(memoryBuildJob.id, input.jobId),
        eq(memoryBuildJob.status, "cancel_requested"),
      ),
    );

  if (result.changes > 0) {
    invalidateMemoryBuildProgressSnapshot();
  }
  return { canceled: result.changes > 0 };
}

export async function recoverStaleRunningMemoryBuildJobs(input: {
  projectId: string;
  staleBeforeIso: string;
}): Promise<{ recovered: number }> {
  const result = await db
    .getClient()
    .update(memoryBuildJob)
    .set({
      status: "pending",
      error: "RECOVERED_STALE_RUNNING_JOB",
      updatedAt: nowIso(),
    })
    .where(
      and(
        eq(memoryBuildJob.projectId, input.projectId),
        eq(memoryBuildJob.status, "running"),
        sql`${memoryBuildJob.updatedAt} <= ${input.staleBeforeIso}`,
      ),
    );

  if (result.changes > 0) {
    invalidateMemoryBuildProgressSnapshot(input.projectId);
  }
  return { recovered: result.changes };
}

export async function getMemoryBuildJobProgress(input: {
  projectId: string;
  nowIso?: string;
}): Promise<MemoryBuildJobProgress> {
  const requestedNowMs = nowMsFromIso(input.nowIso);
  const cached = progressSnapshotCache.get(input.projectId);
  if (
    cached &&
    requestedNowMs - cached.capturedAtMs >= 0 &&
    requestedNowMs - cached.capturedAtMs < PROGRESS_SNAPSHOT_TTL_MS
  ) {
    return cached.progress;
  }
  const rows = await db
    .getClient()
    .select({
      status: memoryBuildJob.status,
      count: sql<number>`count(*)`,
    })
    .from(memoryBuildJob)
    .where(eq(memoryBuildJob.projectId, input.projectId))
    .groupBy(memoryBuildJob.status);
  const jobTypeRows = await db
    .getClient()
    .select({
      jobType: memoryBuildJob.jobType,
      status: memoryBuildJob.status,
      count: sql<number>`count(*)`,
    })
    .from(memoryBuildJob)
    .where(eq(memoryBuildJob.projectId, input.projectId))
    .groupBy(memoryBuildJob.jobType, memoryBuildJob.status);
  const targetTypeRows = await db
    .getClient()
    .select({
      targetType: memoryBuildJob.targetType,
      status: memoryBuildJob.status,
      count: sql<number>`count(*)`,
    })
    .from(memoryBuildJob)
    .where(eq(memoryBuildJob.projectId, input.projectId))
    .groupBy(memoryBuildJob.targetType, memoryBuildJob.status);
  const activeStatusSql = sql.join(
    ACTIVE_STATUSES.map((status) => sql`${status}`),
    sql`, `,
  );
  const candidateTargetRows = await db
    .getClient()
    .select({
      targetType: memoryBuildJob.targetType,
      targetId: memoryBuildJob.targetId,
      activeCount: sql<number>`sum(case when ${memoryBuildJob.status} in (${activeStatusSql}) then 1 else 0 end)`,
      total: sql<number>`count(*)`,
    })
    .from(memoryBuildJob)
    .where(eq(memoryBuildJob.projectId, input.projectId))
    .groupBy(memoryBuildJob.targetType, memoryBuildJob.targetId)
    .orderBy(
      sql`sum(case when ${memoryBuildJob.status} in (${activeStatusSql}) then 1 else 0 end) desc`,
      sql`count(*) desc`,
      memoryBuildJob.targetType,
      memoryBuildJob.targetId,
    )
    .limit(TARGET_PROGRESS_LIMIT);
  const candidateTargetKeys = new Set(
    candidateTargetRows.map((row) => targetKey(row.targetType, row.targetId)),
  );
  const candidateTargetKeySql = sql.join(
    [...candidateTargetKeys].map((key) => sql`${key}`),
    sql`, `,
  );
  const targetRows =
    candidateTargetKeys.size === 0
      ? []
      : await db
    .getClient()
    .select({
      targetType: memoryBuildJob.targetType,
      targetId: memoryBuildJob.targetId,
      status: memoryBuildJob.status,
      count: sql<number>`count(*)`,
    })
    .from(memoryBuildJob)
    .where(
      and(
        eq(memoryBuildJob.projectId, input.projectId),
        sql`${memoryBuildJob.targetType} || ':' || ${memoryBuildJob.targetId} in (${candidateTargetKeySql})`,
      ),
    )
    .groupBy(
      memoryBuildJob.targetType,
      memoryBuildJob.targetId,
      memoryBuildJob.status,
    );
  const targetLabels = await loadTargetLabels({
    projectId: input.projectId,
    targets: targetRows.map((row) => ({
      targetType: row.targetType,
      targetId: row.targetId,
    })),
  });
  const attentionRows = await db
    .getClient()
    .select({
      status: memoryBuildJob.status,
      attempts: memoryBuildJob.attempts,
      error: memoryBuildJob.error,
      updatedAt: memoryBuildJob.updatedAt,
    })
    .from(memoryBuildJob)
    .where(
      and(
        eq(memoryBuildJob.projectId, input.projectId),
        inArray(memoryBuildJob.status, ["failed", "cancel_requested", "pending"]),
      ),
    );

  const byStatus = Object.fromEntries(
    rows.map((row) => [row.status, Number(row.count ?? 0)]),
  );
  const total = Object.values(byStatus).reduce((sum, count) => sum + count, 0);
  const doneCount = DONE_STATUSES.reduce(
    (sum, status) => sum + (byStatus[status] ?? 0),
    0,
  );
  const activeCount = ACTIVE_STATUSES.reduce(
    (sum, status) => sum + (byStatus[status] ?? 0),
    0,
  );
  const byJobType: MemoryBuildJobProgress["byJobType"] = {};
  for (const row of jobTypeRows) {
    const jobType = row.jobType;
    const status = row.status;
    const count = Number(row.count ?? 0);
    const current = byJobType[jobType] ?? createProgressBucket();
    addStatusCount(current, status, count);
    byJobType[jobType] = current;
  }
  const byTargetType: MemoryBuildJobProgress["byTargetType"] = {};
  for (const row of targetTypeRows) {
    const targetType = row.targetType;
    const status = row.status;
    const count = Number(row.count ?? 0);
    const current = byTargetType[targetType] ?? createProgressBucket();
    addStatusCount(current, status, count);
    byTargetType[targetType] = current;
  }
  const byTarget: MemoryBuildJobProgress["byTarget"] = {};
  for (const row of targetRows) {
    const key = targetKey(row.targetType, row.targetId);
    const current = byTarget[key] ?? {
      targetType: row.targetType,
      targetId: row.targetId,
      label: targetLabels.get(key) ?? null,
      ...createProgressBucket(),
    };
    addStatusCount(current, row.status, Number(row.count ?? 0));
    byTarget[key] = current;
  }
  const nowMs = requestedNowMs;
  const attention = {
    retryableFailedCount: 0,
    retryBackoffCount: 0,
    exhaustedFailedCount: 0,
    staleCancellationRequestedCount: 0,
    recoveredStaleRunningCount: 0,
    nextRetryAt: null as string | null,
    latestError: null as string | null,
  };
  let latestErrorUpdatedAtMs = Number.NEGATIVE_INFINITY;
  let nextRetryAtMs = Number.POSITIVE_INFINITY;
  for (const row of attentionRows) {
    const updatedAtMs = Date.parse(row.updatedAt);
    const ageMs =
      Number.isFinite(nowMs) && Number.isFinite(updatedAtMs)
        ? nowMs - updatedAtMs
        : Number.POSITIVE_INFINITY;
    if (row.status === "failed") {
      if (row.error && updatedAtMs >= latestErrorUpdatedAtMs) {
        attention.latestError = row.error;
        latestErrorUpdatedAtMs = updatedAtMs;
      }
      if (row.attempts >= MAX_JOB_ATTEMPTS) {
        attention.exhaustedFailedCount += 1;
        continue;
      }
      const backoffMs = getMemoryBuildJobRetryBackoffMs(row.attempts);
      if (ageMs >= backoffMs) {
        attention.retryableFailedCount += 1;
      } else {
        attention.retryBackoffCount += 1;
        if (Number.isFinite(updatedAtMs)) {
          nextRetryAtMs = Math.min(nextRetryAtMs, updatedAtMs + backoffMs);
        }
      }
      continue;
    }
    if (
      row.status === "cancel_requested" &&
      ageMs >= STALE_CANCELLATION_REQUEST_MS
    ) {
      attention.staleCancellationRequestedCount += 1;
    }
    if (row.status === "pending" && row.error === RECOVERED_STALE_RUNNING_JOB) {
      attention.recoveredStaleRunningCount += 1;
    }
  }
  if (Number.isFinite(nextRetryAtMs)) {
    attention.nextRetryAt = new Date(nextRetryAtMs).toISOString();
  }

  const progress = {
    projectId: input.projectId,
    total,
    activeCount,
    doneCount,
    byStatus,
    attention,
    byJobType,
    byTargetType,
    byTarget,
  };
  progressSnapshotCache.set(input.projectId, {
    capturedAtMs: requestedNowMs,
    progress,
  });
  return progress;
}
