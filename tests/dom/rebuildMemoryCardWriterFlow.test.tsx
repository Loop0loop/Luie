// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RebuildMemoryCard } from "../../src/renderer/src/features/settings/components/tabs/modelTabSections/RebuildMemoryCard.js";
import type { MemoryBuildJobProgress } from "../../src/shared/types/index.js";

const translations: Record<string, string> = {
  "settings.localLlm.rebuildMemory.title": "기억 다시 만들기",
  "settings.localLlm.rebuildMemory.description": "원고 기억을 다시 정리합니다.",
  "settings.localLlm.rebuildMemory.progress": "{{done}}/{{total}} · {{percent}}%",
  "settings.localLlm.rebuildMemory.active": "작업 중",
  "settings.localLlm.rebuildMemory.idle": "대기 없음",
  "settings.localLlm.rebuildMemory.start": "시작",
  "settings.localLlm.rebuildMemory.pause": "일시정지",
  "settings.localLlm.rebuildMemory.resume": "재개",
  "settings.localLlm.rebuildMemory.cancel": "취소",
  "settings.localLlm.rebuildMemory.status.pending": "대기 중",
  "settings.localLlm.rebuildMemory.status.RECOVERED_STALE_RUNNING_JOB":
    "중단된 작업 복구됨",
};

function translate(key: string, values?: Record<string, unknown>): string {
  let output = translations[key] ?? String(values?.defaultValue ?? key);
  for (const [name, value] of Object.entries(values ?? {})) {
    output = output.replace(`{{${name}}}`, String(value));
  }
  return output;
}

type MountedView = {
  container: HTMLDivElement;
  root: Root;
};

const recoveredProgress: MemoryBuildJobProgress = {
  projectId: "project-1",
  total: 1,
  activeCount: 1,
  doneCount: 0,
  byStatus: {
    pending: 1,
  },
  byJobType: {},
  byTargetType: {},
  byTarget: {},
  attention: {
    retryableFailedCount: 0,
    retryBackoffCount: 0,
    exhaustedFailedCount: 0,
    staleCancellationRequestedCount: 0,
    recoveredStaleRunningCount: 1,
    nextRetryAt: null,
    latestError: null,
  },
};

const runningOnlyProgress: MemoryBuildJobProgress = {
  projectId: "project-1",
  total: 1,
  activeCount: 1,
  doneCount: 0,
  byStatus: {
    running: 1,
  },
  byJobType: {},
  byTargetType: {},
  byTarget: {},
  attention: {
    retryableFailedCount: 0,
    retryBackoffCount: 0,
    exhaustedFailedCount: 0,
    staleCancellationRequestedCount: 0,
    recoveredStaleRunningCount: 0,
    nextRetryAt: null,
    latestError: null,
  },
};

const cancelRequestedOnlyProgress: MemoryBuildJobProgress = {
  projectId: "project-1",
  total: 1,
  activeCount: 1,
  doneCount: 0,
  byStatus: {
    cancel_requested: 1,
  },
  byJobType: {},
  byTargetType: {},
  byTarget: {},
  attention: {
    retryableFailedCount: 0,
    retryBackoffCount: 0,
    exhaustedFailedCount: 0,
    staleCancellationRequestedCount: 0,
    recoveredStaleRunningCount: 0,
    nextRetryAt: null,
    latestError: null,
  },
};

function mountCard(progress: MemoryBuildJobProgress): MountedView {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      <RebuildMemoryCard
        t={translate}
        isBusy={false}
        onRebuildMemory={vi.fn()}
        onPauseMemoryBuildJobs={vi.fn()}
        onResumeMemoryBuildJobs={vi.fn()}
        onCancelMemoryBuildJobs={vi.fn()}
        memoryBuildProgress={progress}
      />,
    );
  });
  return { container, root };
}

function unmountCard({ container, root }: MountedView): void {
  act(() => {
    root.unmount();
  });
  container.remove();
}

function buttonByText(container: HTMLElement, text: string): HTMLButtonElement {
  const button = [...container.querySelectorAll("button")].find(
    (candidate) => candidate.textContent === text,
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Button not found: ${text}`);
  }
  return button;
}

describe("RebuildMemoryCard writer flow", () => {
  const mounted: MountedView[] = [];

  beforeEach(() => {
    Object.assign(globalThis, {
      IS_REACT_ACT_ENVIRONMENT: true,
    });
    document.body.innerHTML = "";
  });

  afterEach(() => {
    mounted.splice(0).forEach(unmountCard);
    document.body.innerHTML = "";
  });

  it("shows recovered restart jobs with a writer-facing label", () => {
    const view = mountCard(recoveredProgress);
    mounted.push(view);

    expect(view.container.textContent).toContain("대기 중 1");
    expect(view.container.textContent).toContain("중단된 작업 복구됨 1");
  });

  it("does not offer pause when only running jobs cannot be paused yet", () => {
    const view = mountCard(runningOnlyProgress);
    mounted.push(view);

    expect(view.container.textContent).toContain("처리 중 1");
    expect(buttonByText(view.container, "일시정지").disabled).toBe(true);
    expect(buttonByText(view.container, "취소").disabled).toBe(false);
  });

  it("does not offer cancel again when all active jobs are already canceling", () => {
    const view = mountCard(cancelRequestedOnlyProgress);
    mounted.push(view);

    expect(view.container.textContent).toContain("취소 준비 중 1");
    expect(buttonByText(view.container, "일시정지").disabled).toBe(true);
    expect(buttonByText(view.container, "취소").disabled).toBe(true);
  });
});
