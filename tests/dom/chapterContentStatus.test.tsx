// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * P1-A1 회귀 고정: EditorRoot가 본문 "문자열"을 구독하던 구조에서는 자동 저장이 캐시에
 * 쓸 때마다 루트(EditorRoot = 워크스페이스 트리 전체)가 리렌더됐다. 상태 훅
 * (useChapterContentStatus)은 boolean/error 원시값만 구독해 이 폭발을 끊는다.
 *
 * PROVES: (1) 본문 로드 완료 시 isLoaded가 1회 true로 전환된다.
 *         (2) 로드된 이후 같은 챕터 본문이 몇 번 다시 쓰여도(자동 저장) 상태 훅 컴포넌트는
 *             리렌더되지 않는다.
 *         (3) 레거시 useChapterContent(문자열 구독)는 같은 갱신에 리렌더된다 — 대조 근거.
 * DOES_NOT_PROVE: EditorRoot 트리 전체의 실제 커밋 수 — 컴포넌트별 리렌더 카운터로 간접 증명.
 */

const mocked = vi.hoisted(() => ({
  get: vi.fn(),
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@shared/api", () => ({
  api: {
    chapter: { get: mocked.get },
    logger: mocked.logger,
  },
}));

import {
  setChapterContent,
  useChapterContentStore,
} from "../../src/renderer/src/features/manuscript/stores/chapterContentStore.js";
import {
  useChapterContent,
  useChapterContentStatus,
} from "../../src/renderer/src/features/manuscript/hooks/useChapterContent.js";

const mountProbe = () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  const counters = { status: 0, content: 0 };
  let statusState = { isLoaded: false, error: null as string | null };
  let contentState = { content: "", isLoaded: false };

  function StatusProbe({ chapterId }: { chapterId: string | null }) {
    counters.status += 1;
    statusState = useChapterContentStatus(chapterId);
    return null;
  }

  function ContentProbe({ chapterId }: { chapterId: string | null }) {
    counters.content += 1;
    contentState = useChapterContent(chapterId);
    return null;
  }

  const render = async (chapterId: string | null) => {
    await act(async () => {
      root.render(
        <>
          <StatusProbe chapterId={chapterId} />
          <ContentProbe chapterId={chapterId} />
        </>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });
  };
  const cleanup = () => {
    act(() => root.unmount());
    container.remove();
  };
  return { render, cleanup, counters, getStatus: () => statusState, getContent: () => contentState };
};

describe("useChapterContentStatus narrow subscription", () => {
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.clearAllMocks();
    useChapterContentStore.getState().reset();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("does not re-render on chapter content rewrites (autosave), unlike the legacy content subscription", async () => {
    mocked.get.mockResolvedValueOnce({
      success: true,
      data: { id: "ch-1", content: "<p>v1</p>" },
    });

    const view = mountProbe();
    await view.render("ch-1");
    const rendersAfterMount = view.counters.status;

    // 로드 완료 전환 확인.
    expect(view.getStatus()).toEqual({ isLoaded: true, error: null });

    // 자동 저장 시나리오: 같은 챕터 본문이 캐시에 반복 기록된다.
    await act(async () => {
      setChapterContent("ch-1", "<p>v2</p>");
      setChapterContent("ch-1", "<p>v3</p>");
      setChapterContent("ch-1", "<p>v4</p>");
      await Promise.resolve();
    });

    // 근거 1: 원시값(boolean) 구독은 본문 재기록에 리렌더하지 않는다.
    expect(view.counters.status).toBe(rendersAfterMount);
    expect(view.getStatus().isLoaded).toBe(true);

    // 근거 2(대조): 문자열 구독은 같은 갱신에 리렌더한다 — 이게 루트 폭발의 원인이었다.
    expect(view.counters.content).toBeGreaterThan(1);
    expect(view.getContent().content).toBe("<p>v4</p>");

    view.cleanup();
  });

  it("surfaces load failure without exposing content", async () => {
    mocked.get.mockResolvedValueOnce({
      success: false,
      error: { message: "boom" },
    });

    const view = mountProbe();
    await view.render("ch-err");

    expect(view.getStatus()).toEqual({ isLoaded: false, error: "boom" });

    view.cleanup();
  });
});
