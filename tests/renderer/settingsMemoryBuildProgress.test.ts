import { describe, expect, it } from "vitest";
import {
  buildMemoryBuildProgressView,
  getMemoryBuildProgressPollIntervalMs,
  getMemoryBuildStatusLabel,
  shouldPollMemoryBuildProgress,
} from "../../src/renderer/src/features/settings/components/tabs/modelTabSections/memoryBuildProgress";

describe("settings memory build progress view", () => {
  it("counts active jobs and exposes a completed percentage", () => {
    const view = buildMemoryBuildProgressView({
      projectId: "project-1",
      total: 10,
      activeCount: 4,
      doneCount: 6,
      byStatus: {
        pending: 2,
        running: 1,
        cancel_requested: 1,
        completed: 5,
        canceled: 1,
      },
      byJobType: {},
      attention: {
        retryableFailedCount: 0,
        retryBackoffCount: 0,
        exhaustedFailedCount: 0,
        staleCancellationRequestedCount: 0,
        latestError: null,
      },
    });

    expect(view).toMatchObject({
      total: 10,
      doneCount: 6,
      activeCount: 4,
      percent: 60,
      pendingCount: 2,
      runningCount: 1,
      cancellationRequestedCount: 1,
      canceledCount: 1,
      hasActiveWork: true,
    });
  });

  it("exposes job type progress items in writer-facing order", () => {
    const view = buildMemoryBuildProgressView({
      projectId: "project-1",
      total: 5,
      activeCount: 3,
      doneCount: 2,
      byStatus: {
        pending: 2,
        running: 1,
        completed: 2,
      },
      byJobType: {
        rebuild_embedding: {
          total: 3,
          activeCount: 3,
          doneCount: 0,
          byStatus: {
            pending: 2,
            running: 1,
          },
        },
        rebuild_summary: {
          total: 2,
          activeCount: 0,
          doneCount: 2,
          byStatus: {
            completed: 2,
          },
        },
      },
      attention: {
        retryableFailedCount: 0,
        retryBackoffCount: 0,
        exhaustedFailedCount: 0,
        staleCancellationRequestedCount: 0,
        latestError: null,
      },
    });

    expect(view.jobTypeItems).toEqual([
      {
        jobType: "rebuild_embedding",
        label: "의미 검색 준비",
        total: 3,
        activeCount: 3,
        doneCount: 0,
        percent: 0,
      },
      {
        jobType: "rebuild_summary",
        label: "회차 요약",
        total: 2,
        activeCount: 0,
        doneCount: 2,
        percent: 100,
      },
    ]);
  });

  it("labels cancellation and recovery markers in writer-facing language", () => {
    expect(getMemoryBuildStatusLabel("cancel_requested")).toBe("취소 준비 중");
    expect(getMemoryBuildStatusLabel("RECOVERED_STALE_RUNNING_JOB")).toBe(
      "중단된 작업 복구됨",
    );
    expect(getMemoryBuildStatusLabel("unknown_status")).toBe("unknown_status");
  });

  it("exposes retry and stalled cancellation alerts for writers", () => {
    const view = buildMemoryBuildProgressView({
      projectId: "project-1",
      total: 4,
      activeCount: 2,
      doneCount: 0,
      byStatus: {
        failed: 3,
        cancel_requested: 1,
      },
      byJobType: {},
      attention: {
        retryableFailedCount: 1,
        retryBackoffCount: 1,
        exhaustedFailedCount: 1,
        staleCancellationRequestedCount: 1,
        latestError: "MAX_ATTEMPTS_REACHED",
      },
    });

    expect(view.attentionItems).toEqual([
      {
        key: "retryable_failed",
        label: "재시도 가능",
        count: 1,
      },
      {
        key: "retry_backoff",
        label: "재시도 대기",
        count: 1,
      },
      {
        key: "exhausted_failed",
        label: "재시도 한도 도달",
        count: 1,
      },
      {
        key: "stale_cancel_requested",
        label: "취소 지연",
        count: 1,
      },
    ]);
    expect(view.latestError).toBe("MAX_ATTEMPTS_REACHED");
  });

  it("polls only while memory build jobs are active", () => {
    expect(
      shouldPollMemoryBuildProgress({
        projectId: "project-1",
        total: 3,
        activeCount: 1,
        doneCount: 2,
        byStatus: { running: 1, completed: 2 },
        byJobType: {},
        attention: {
          retryableFailedCount: 0,
          retryBackoffCount: 0,
          exhaustedFailedCount: 0,
          staleCancellationRequestedCount: 0,
          latestError: null,
        },
      }),
    ).toBe(true);
    expect(
      shouldPollMemoryBuildProgress({
        projectId: "project-1",
        total: 3,
        activeCount: 0,
        doneCount: 3,
        byStatus: { completed: 3 },
        byJobType: {},
        attention: {
          retryableFailedCount: 0,
          retryBackoffCount: 0,
          exhaustedFailedCount: 0,
          staleCancellationRequestedCount: 0,
          latestError: null,
        },
      }),
    ).toBe(false);
    expect(shouldPollMemoryBuildProgress(null)).toBe(false);
  });

  it("backs off polling when progress is active but not actively running", () => {
    expect(
      getMemoryBuildProgressPollIntervalMs({
        projectId: "project-1",
        total: 10,
        activeCount: 10,
        doneCount: 0,
        byStatus: { running: 10 },
        byJobType: {},
        attention: {
          retryableFailedCount: 0,
          retryBackoffCount: 0,
          exhaustedFailedCount: 0,
          staleCancellationRequestedCount: 0,
          latestError: null,
        },
      }),
    ).toBe(2_000);
    expect(
      getMemoryBuildProgressPollIntervalMs({
        projectId: "project-1",
        total: 3,
        activeCount: 3,
        doneCount: 0,
        byStatus: { pending: 3 },
        byJobType: {},
        attention: {
          retryableFailedCount: 0,
          retryBackoffCount: 0,
          exhaustedFailedCount: 0,
          staleCancellationRequestedCount: 0,
          latestError: null,
        },
      }),
    ).toBe(5_000);
    expect(
      getMemoryBuildProgressPollIntervalMs({
        projectId: "project-1",
        total: 1,
        activeCount: 0,
        doneCount: 1,
        byStatus: { completed: 1 },
        byJobType: {},
        attention: {
          retryableFailedCount: 0,
          retryBackoffCount: 0,
          exhaustedFailedCount: 0,
          staleCancellationRequestedCount: 0,
          latestError: null,
        },
      }),
    ).toBeNull();
    expect(
      getMemoryBuildProgressPollIntervalMs({
        projectId: "project-1",
        total: 1,
        activeCount: 1,
        doneCount: 0,
        byStatus: { cancel_requested: 1 },
        byJobType: {},
        attention: {
          retryableFailedCount: 0,
          retryBackoffCount: 0,
          exhaustedFailedCount: 0,
          staleCancellationRequestedCount: 1,
          latestError: null,
        },
      }),
    ).toBe(2_000);
  });
});
