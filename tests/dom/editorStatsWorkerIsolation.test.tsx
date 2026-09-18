// @vitest-environment jsdom

import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => {
  const worker = Object.assign(new EventTarget(), { postMessage: vi.fn() });
  return {
    acquireStatsWorker: vi.fn(() => worker),
    setStats: vi.fn(),
    worker,
  };
});

vi.mock("@renderer/features/editor/hooks/statsWorkerClient", () => ({
  acquireStatsWorker: mocked.acquireStatsWorker,
}));

vi.mock("@renderer/features/editor/stores/editorStatsStore", () => ({
  useEditorStatsStore: (
    selector: (state: { setStats: typeof mocked.setStats }) => unknown,
  ) => selector({ setStats: mocked.setStats }),
}));

import { useEditorStats } from "../../src/renderer/src/features/editor/hooks/useEditorStats.js";

function StatsHarness({
  enabled = true,
  statsKey,
  text,
}: {
  enabled?: boolean;
  statsKey?: string;
  text: string;
}) {
  const { updateStats } = useEditorStats({ enabled, statsKey });
  useEffect(() => {
    updateStats(text);
  }, [text, updateStats]);
  return null;
}

describe("useEditorStats worker isolation", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  it("새 챕터 요청 뒤 도착한 이전 worker 응답을 무시한다", () => {
    act(() => root.render(<StatsHarness statsKey="chapter-a" text="A" />));
    act(() => vi.advanceTimersByTime(120));
    const previousRequest = mocked.worker.postMessage.mock.calls[0]?.[0];

    act(() => root.render(<StatsHarness statsKey="chapter-b" text="B" />));
    act(() => vi.advanceTimersByTime(120));
    const latestRequest = mocked.worker.postMessage.mock.calls[1]?.[0];

    act(() => {
      mocked.worker.dispatchEvent(
        new MessageEvent("message", {
          data: { ...previousRequest, wordCount: 1, charCount: 1 },
        }),
      );
    });
    expect(mocked.setStats).not.toHaveBeenCalled();

    act(() => {
      mocked.worker.dispatchEvent(
        new MessageEvent("message", {
          data: { ...latestRequest, wordCount: 2, charCount: 2 },
        }),
      );
    });
    expect(mocked.setStats).toHaveBeenCalledWith(
      expect.objectContaining({ wordCount: 2, charCount: 2 }),
    );
  });

  it("통계를 표시하지 않는 에디터는 worker를 구독하거나 요청하지 않는다", () => {
    act(() =>
      root.render(<StatsHarness enabled={false} statsKey="chapter-a" text="A" />),
    );
    act(() => vi.advanceTimersByTime(120));

    expect(mocked.acquireStatsWorker).not.toHaveBeenCalled();
    expect(mocked.worker.postMessage).not.toHaveBeenCalled();
  });
});
