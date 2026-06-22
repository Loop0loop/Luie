import { and, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  memoryBuildJob,
} from "../../../infra/database/index.js";
import {
  getMemoryBuildJobRetryBackoffMs,
  MAX_JOB_ATTEMPTS,
} from "./projection/jobPolicy.js";
import { loadMemoryBuildJobTargetLabels } from "./job/targetLabels.js";
import type { MemoryBuildJobProgress } from "./job/progressTypes.js";

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
  const targetLabels = await loadMemoryBuildJobTargetLabels({
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
