import { describe, expect, it } from "vitest";
import {
  buildMemoryBuildProgressView,
  getMemoryBuildProgressPollIntervalMs,
  getMemoryBuildStatusLabel,
  shouldPollMemoryBuildProgress,
} from "../../src/renderer/src/features/settings/components/tabs/modelTabSections/memoryBuildProgress";
import { enBaseSettingsAdvanced } from "../../src/renderer/src/i18n/locales/en/base/settingsAdvanced";
import { jaBaseSettingsAdvanced } from "../../src/renderer/src/i18n/locales/ja/base/settingsAdvanced";
import { koBaseSettingsAdvanced } from "../../src/renderer/src/i18n/locales/ko/base/settingsAdvanced";

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
      byTargetType: {},
      byTarget: {},
      attention: {
        retryableFailedCount: 0,
        retryBackoffCount: 0,
        exhaustedFailedCount: 0,
        staleCancellationRequestedCount: 0,
        nextRetryAt: null,
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
      byTargetType: {},
      byTarget: {},
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

  it("exposes target type progress items in writer-facing language", () => {
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
      byJobType: {},
      byTargetType: {
        scene: {
          total: 3,
          activeCount: 3,
          doneCount: 0,
          byStatus: {
            pending: 2,
            running: 1,
          },
        },
        chapter: {
          total: 2,
          activeCount: 0,
          doneCount: 2,
          byStatus: {
            completed: 2,
          },
        },
        chunk: {
          total: 1,
          activeCount: 1,
          doneCount: 0,
          byStatus: {
            pending: 1,
          },
        },
      },
      byTarget: {},
      attention: {
        retryableFailedCount: 0,
        retryBackoffCount: 0,
        exhaustedFailedCount: 0,
        staleCancellationRequestedCount: 0,
        latestError: null,
      },
    });

    expect(view.targetTypeItems).toEqual([
      {
        targetType: "scene",
        label: "장면",
        total: 3,
        activeCount: 3,
        doneCount: 0,
        percent: 0,
      },
      {
        targetType: "chunk",
        label: "기억 조각",
        total: 1,
        activeCount: 1,
        doneCount: 0,
        percent: 0,
      },
      {
        targetType: "chapter",
        label: "회차",
        total: 2,
        activeCount: 0,
        doneCount: 2,
        percent: 100,
      },
    ]);
  });

  it("exposes individual target progress items for chapter-level visibility", () => {
    const view = buildMemoryBuildProgressView({
      projectId: "project-1",
      total: 3,
      activeCount: 2,
      doneCount: 1,
      byStatus: {
        pending: 1,
        running: 1,
        completed: 1,
      },
      byJobType: {},
      byTargetType: {},
      byTarget: {
        "chapter:chapter-12": {
          targetType: "chapter",
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
          targetType: "chapter",
          targetId: "chapter-13",
          label: null,
          total: 1,
          activeCount: 0,
          doneCount: 1,
          byStatus: {
            completed: 1,
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

    expect(view.targetItems).toEqual([
      {
        targetKey: "chapter:chapter-12",
        targetType: "chapter",
        targetId: "chapter-12",
        label: "12화 · 검은 기사",
        total: 2,
        activeCount: 2,
        doneCount: 0,
        percent: 0,
      },
      {
        targetKey: "chapter:chapter-13",
        targetType: "chapter",
        targetId: "chapter-13",
        label: "회차 chapter-13",
        total: 1,
        activeCount: 0,
        doneCount: 1,
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

  it("provides localized labels for recovered restart jobs", () => {
    expect(
      koBaseSettingsAdvanced.settings.localLlm.rebuildMemory.status.RECOVERED_STALE_RUNNING_JOB,
    ).toBe("중단된 작업 복구됨");
    expect(
      enBaseSettingsAdvanced.settings.localLlm.rebuildMemory.status.RECOVERED_STALE_RUNNING_JOB,
    ).toBe("Interrupted jobs recovered");
    expect(
      jaBaseSettingsAdvanced.settings.localLlm.rebuildMemory.status.RECOVERED_STALE_RUNNING_JOB,
    ).toBe("中断されたジョブを復旧");
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
        pending: 1,
      },
      byJobType: {},
      byTargetType: {},
      byTarget: {},
      attention: {
        retryableFailedCount: 1,
        retryBackoffCount: 1,
        exhaustedFailedCount: 1,
        staleCancellationRequestedCount: 1,
        recoveredStaleRunningCount: 1,
        nextRetryAt: "2026-06-11T00:00:13.000Z",
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
    expect(view.recoveredCount).toBe(1);
    expect(view.nextRetryAt).toBe("2026-06-11T00:00:13.000Z");
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
        byTargetType: {},
        byTarget: {},
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
        byTargetType: {},
        byTarget: {},
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
        byTargetType: {},
        byTarget: {},
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
        byTargetType: {},
        byTarget: {},
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
        byTargetType: {},
        byTarget: {},
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
        byTargetType: {},
        byTarget: {},
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

  it("backs off polling further when many memory build jobs are active", () => {
    expect(
      getMemoryBuildProgressPollIntervalMs({
        projectId: "project-1",
        total: 80,
        activeCount: 80,
        doneCount: 0,
        byStatus: { running: 80 },
        byJobType: {},
        byTargetType: {},
        byTarget: {},
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
        total: 240,
        activeCount: 240,
        doneCount: 0,
        byStatus: { running: 240 },
        byJobType: {},
        byTargetType: {},
        byTarget: {},
        attention: {
          retryableFailedCount: 0,
          retryBackoffCount: 0,
          exhaustedFailedCount: 0,
          staleCancellationRequestedCount: 0,
          latestError: null,
        },
      }),
    ).toBe(10_000);
    expect(
      getMemoryBuildProgressPollIntervalMs({
        projectId: "project-1",
        total: 240,
        activeCount: 240,
        doneCount: 0,
        byStatus: { cancel_requested: 240 },
        byJobType: {},
        byTargetType: {},
        byTarget: {},
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

  it("backs off polling when active progress has not changed since the previous snapshot", () => {
    const previous = {
      projectId: "project-1",
      total: 10,
      activeCount: 2,
      doneCount: 3,
      byStatus: { running: 2, completed: 3, pending: 5 },
      byJobType: {},
      byTargetType: {},
      byTarget: {},
      attention: {
        retryableFailedCount: 0,
        retryBackoffCount: 0,
        exhaustedFailedCount: 0,
        staleCancellationRequestedCount: 0,
        latestError: null,
      },
    };
    expect(getMemoryBuildProgressPollIntervalMs(previous, previous)).toBe(5_000);
    expect(
      getMemoryBuildProgressPollIntervalMs(
        {
          ...previous,
          activeCount: 1,
          doneCount: 4,
          byStatus: { running: 1, completed: 4, pending: 5 },
        },
        previous,
      ),
    ).toBe(2_000);
  });
});
