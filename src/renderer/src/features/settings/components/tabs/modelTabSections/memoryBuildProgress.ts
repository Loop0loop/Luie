import type { MemoryBuildJobProgress } from "@shared/types";

export type MemoryBuildProgressView = {
  total: number;
  doneCount: number;
  activeCount: number;
  percent: number;
  pendingCount: number;
  runningCount: number;
  pausedCount: number;
  failedCount: number;
  cancellationRequestedCount: number;
  canceledCount: number;
  recoveredCount: number;
  hasActiveWork: boolean;
  jobTypeItems: MemoryBuildJobTypeProgressView[];
  targetTypeItems: MemoryBuildTargetTypeProgressView[];
  targetItems: MemoryBuildTargetProgressView[];
  attentionItems: MemoryBuildAttentionItemView[];
  nextRetryAt: string | null;
  latestError: string | null;
};

export type MemoryBuildJobTypeProgressView = {
  jobType: string;
  label: string;
  total: number;
  activeCount: number;
  doneCount: number;
  percent: number;
};

export type MemoryBuildTargetTypeProgressView = {
  targetType: string;
  label: string;
  total: number;
  activeCount: number;
  doneCount: number;
  percent: number;
};

export type MemoryBuildTargetProgressView = {
  targetKey: string;
  targetType: string;
  targetId: string;
  label: string;
  total: number;
  activeCount: number;
  doneCount: number;
  percent: number;
};

export type MemoryBuildAttentionItemView = {
  key:
    | "retryable_failed"
    | "retry_backoff"
    | "exhausted_failed"
    | "stale_cancel_requested";
  label: string;
  count: number;
};

const JOB_TYPE_ORDER = [
  "rebuild_chunks",
  "rebuild_summary",
  "rebuild_embedding",
] as const;
const TARGET_TYPE_ORDER = [
  "chapter",
  "scene",
  "note",
  "synopsis",
  "plot",
  "character",
  "faction",
  "event",
  "scrapMemo",
  "chunk",
] as const;
const MANY_ACTIVE_JOBS_THRESHOLD = 50;
const HEAVY_ACTIVE_JOBS_THRESHOLD = 200;

function countStatus(
  progress: MemoryBuildJobProgress | null,
  status: string,
): number {
  return progress?.byStatus[status] ?? 0;
}

function getJobTypeOrder(jobType: string): number {
  const index = JOB_TYPE_ORDER.indexOf(jobType as (typeof JOB_TYPE_ORDER)[number]);
  return index === -1 ? JOB_TYPE_ORDER.length : index;
}

function getTargetTypeOrder(targetType: string): number {
  const index = TARGET_TYPE_ORDER.indexOf(targetType as (typeof TARGET_TYPE_ORDER)[number]);
  return index === -1 ? TARGET_TYPE_ORDER.length : index;
}

export function getMemoryBuildJobTypeLabel(jobType: string): string {
  switch (jobType) {
    case "rebuild_chunks":
      return "원고 기억화";
    case "rebuild_summary":
      return "회차 요약";
    case "rebuild_embedding":
      return "의미 검색 준비";
    default:
      return jobType;
  }
}

export function getMemoryBuildTargetTypeLabel(targetType: string): string {
  switch (targetType) {
    case "chapter":
      return "회차";
    case "scene":
      return "장면";
    case "note":
      return "노트";
    case "synopsis":
      return "시놉시스";
    case "plot":
      return "플롯";
    case "character":
      return "인물";
    case "faction":
      return "세력";
    case "event":
      return "사건";
    case "scrapMemo":
      return "자료 메모";
    case "chunk":
      return "기억 조각";
    default:
      return targetType;
  }
}

function buildJobTypeItems(
  progress: MemoryBuildJobProgress | null,
): MemoryBuildJobTypeProgressView[] {
  return Object.entries(progress?.byJobType ?? {})
    .map(([jobType, item]) => ({
      jobType,
      label: getMemoryBuildJobTypeLabel(jobType),
      total: item.total,
      activeCount: item.activeCount,
      doneCount: item.doneCount,
      percent: item.total > 0 ? Math.round((item.doneCount / item.total) * 100) : 0,
    }))
    .sort((left, right) => {
      if (right.activeCount !== left.activeCount) {
        return right.activeCount - left.activeCount;
      }
      return getJobTypeOrder(left.jobType) - getJobTypeOrder(right.jobType);
    });
}

function buildTargetTypeItems(
  progress: MemoryBuildJobProgress | null,
): MemoryBuildTargetTypeProgressView[] {
  return Object.entries(progress?.byTargetType ?? {})
    .map(([targetType, item]) => ({
      targetType,
      label: getMemoryBuildTargetTypeLabel(targetType),
      total: item.total,
      activeCount: item.activeCount,
      doneCount: item.doneCount,
      percent: item.total > 0 ? Math.round((item.doneCount / item.total) * 100) : 0,
    }))
    .sort((left, right) => {
      if (right.activeCount !== left.activeCount) {
        return right.activeCount - left.activeCount;
      }
      return getTargetTypeOrder(left.targetType) - getTargetTypeOrder(right.targetType);
    });
}

function buildTargetItems(
  progress: MemoryBuildJobProgress | null,
): MemoryBuildTargetProgressView[] {
  return Object.entries(progress?.byTarget ?? {})
    .map(([targetKey, item]) => ({
      targetKey,
      targetType: item.targetType,
      targetId: item.targetId,
      label: item.label ?? `${getMemoryBuildTargetTypeLabel(item.targetType)} ${item.targetId}`,
      total: item.total,
      activeCount: item.activeCount,
      doneCount: item.doneCount,
      percent: item.total > 0 ? Math.round((item.doneCount / item.total) * 100) : 0,
    }))
    .sort((left, right) => {
      if (right.activeCount !== left.activeCount) {
        return right.activeCount - left.activeCount;
      }
      return left.targetKey.localeCompare(right.targetKey);
    })
    .slice(0, 5);
}

function buildAttentionItems(
  progress: MemoryBuildJobProgress | null,
): MemoryBuildAttentionItemView[] {
  const attention = progress?.attention;
  if (!attention) return [];
  return [
    {
      key: "retryable_failed" as const,
      label: "재시도 가능",
      count: attention.retryableFailedCount,
    },
    {
      key: "retry_backoff" as const,
      label: "재시도 대기",
      count: attention.retryBackoffCount,
    },
    {
      key: "exhausted_failed" as const,
      label: "재시도 한도 도달",
      count: attention.exhaustedFailedCount,
    },
    {
      key: "stale_cancel_requested" as const,
      label: "취소 지연",
      count: attention.staleCancellationRequestedCount,
    },
  ].filter((item) => item.count > 0);
}

export function buildMemoryBuildProgressView(
  progress: MemoryBuildJobProgress | null,
): MemoryBuildProgressView {
  const total = progress?.total ?? 0;
  const doneCount = progress?.doneCount ?? 0;
  const activeCount = progress?.activeCount ?? 0;
  return {
    total,
    doneCount,
    activeCount,
    percent: total > 0 ? Math.round((doneCount / total) * 100) : 0,
    pendingCount: countStatus(progress, "pending"),
    runningCount: countStatus(progress, "running"),
    pausedCount: countStatus(progress, "paused"),
    failedCount: countStatus(progress, "failed"),
    cancellationRequestedCount: countStatus(progress, "cancel_requested"),
    canceledCount: countStatus(progress, "canceled"),
    recoveredCount: progress?.attention.recoveredStaleRunningCount ?? 0,
    hasActiveWork: activeCount > 0,
    jobTypeItems: buildJobTypeItems(progress),
    targetTypeItems: buildTargetTypeItems(progress),
    targetItems: buildTargetItems(progress),
    attentionItems: buildAttentionItems(progress),
    nextRetryAt: progress?.attention.nextRetryAt ?? null,
    latestError: progress?.attention.latestError ?? null,
  };
}

export function getMemoryBuildStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "대기 중";
    case "running":
      return "처리 중";
    case "paused":
      return "일시정지";
    case "failed":
      return "실패";
    case "cancel_requested":
      return "취소 준비 중";
    case "canceled":
      return "취소됨";
    case "completed":
      return "완료";
    case "skipped":
      return "건너뜀";
    case "RECOVERED_STALE_RUNNING_JOB":
      return "중단된 작업 복구됨";
    default:
      return status;
  }
}

export function shouldPollMemoryBuildProgress(
  progress: MemoryBuildJobProgress | null,
): boolean {
  return (progress?.activeCount ?? 0) > 0;
}

function hasMemoryBuildProgressChanged(
  progress: MemoryBuildJobProgress | null,
  previousProgress: MemoryBuildJobProgress | null,
): boolean {
  if (!progress || !previousProgress) return true;
  return (
    progress.total !== previousProgress.total ||
    progress.activeCount !== previousProgress.activeCount ||
    progress.doneCount !== previousProgress.doneCount ||
    JSON.stringify(progress.byStatus) !== JSON.stringify(previousProgress.byStatus)
  );
}

export function getMemoryBuildProgressPollIntervalMs(
  progress: MemoryBuildJobProgress | null,
  previousProgress: MemoryBuildJobProgress | null = null,
): number | null {
  if (!shouldPollMemoryBuildProgress(progress)) return null;
  if ((progress?.attention.staleCancellationRequestedCount ?? 0) > 0) {
    return 2_000;
  }
  if (!hasMemoryBuildProgressChanged(progress, previousProgress)) {
    return 5_000;
  }
  const activeCount = progress?.activeCount ?? 0;
  if (activeCount >= HEAVY_ACTIVE_JOBS_THRESHOLD) {
    return 10_000;
  }
  if (activeCount >= MANY_ACTIVE_JOBS_THRESHOLD) {
    return 5_000;
  }
  const runningCount = progress?.byStatus.running ?? 0;
  const cancellationRequestedCount = progress?.byStatus.cancel_requested ?? 0;
  if (runningCount > 0 || cancellationRequestedCount > 0) {
    return 2_000;
  }
  return 5_000;
}
