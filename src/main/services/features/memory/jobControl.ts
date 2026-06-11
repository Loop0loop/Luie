import { and, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  memoryBuildJob,
} from "../../../infra/database/index.js";

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
const MAX_JOB_ATTEMPTS = 5;
const BASE_RETRY_BACKOFF_MS = 2_000;
const STALE_CANCELLATION_REQUEST_MS = 5_000;
const PROGRESS_SNAPSHOT_TTL_MS = 1_000;

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
        inArray(memoryBuildJob.status, ["failed", "cancel_requested"]),
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
    const current = byJobType[jobType] ?? {
      total: 0,
      activeCount: 0,
      doneCount: 0,
      byStatus: {},
    };
    current.total += count;
    current.byStatus[status] = count;
    if ((DONE_STATUSES as readonly string[]).includes(status)) {
      current.doneCount += count;
    }
    if ((ACTIVE_STATUSES as readonly string[]).includes(status)) {
      current.activeCount += count;
    }
    byJobType[jobType] = current;
  }
  const nowMs = requestedNowMs;
  const attention = {
    retryableFailedCount: 0,
    retryBackoffCount: 0,
    exhaustedFailedCount: 0,
    staleCancellationRequestedCount: 0,
    latestError: null as string | null,
  };
  let latestErrorUpdatedAtMs = Number.NEGATIVE_INFINITY;
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
      const backoffMs = BASE_RETRY_BACKOFF_MS * Math.max(1, row.attempts);
      if (ageMs >= backoffMs) {
        attention.retryableFailedCount += 1;
      } else {
        attention.retryBackoffCount += 1;
      }
      continue;
    }
    if (
      row.status === "cancel_requested" &&
      ageMs >= STALE_CANCELLATION_REQUEST_MS
    ) {
      attention.staleCancellationRequestedCount += 1;
    }
  }

  const progress = {
    projectId: input.projectId,
    total,
    activeCount,
    doneCount,
    byStatus,
    attention,
    byJobType,
  };
  progressSnapshotCache.set(input.projectId, {
    capturedAtMs: requestedNowMs,
    progress,
  });
  return progress;
}
