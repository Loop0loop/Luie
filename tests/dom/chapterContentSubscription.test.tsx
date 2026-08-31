// @vitest-environment jsdom

import { act, Profiler, type ProfilerOnRenderCallback, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as UseChapterContentModule from "../../src/renderer/src/features/manuscript/hooks/useChapterContent.js";
import type * as ChapterContentStoreModule from "../../src/renderer/src/features/manuscript/stores/chapterContentStore.js";

/**
 * SUT: useChapterContent — 챕터 본문 구독 훅.
 *
 * 테스트 베이시스: renderer-Optimization-result.md O1/O2, O1-b1 설계.
 * 본문을 목록에서 분리한 목적은 "본문 변경이 목록 구독자를 리렌더시키지 않게" 만드는 것이다.
 * 캐시가 map 하나이므로, 구독을 map 전체로 잡으면 다른 챕터의 본문이 들어올 때마다 전원이
 * 리렌더되어 목적이 무너진다. 그 경계를 여기서 고정한다.
 */

const mocked = vi.hoisted(() => ({
  get: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@shared/api", () => ({
  api: {
    chapter: { get: mocked.get },
    logger: { warn: mocked.warn, error: mocked.error },
  },
}));

const okChapter = (id: string, content: string) => ({
  success: true,
  data: { id, projectId: "p1", title: `T-${id}`, content, order: 1 },
});

type MountedView = {
  container: HTMLDivElement;
  root: Root;
  getCommitCount: () => number;
};

const mountedViews: MountedView[] = [];

const mountWithProfiler = (element: ReactNode): MountedView => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  let commitCount = 0;
  const onRender: ProfilerOnRenderCallback = () => {
    commitCount += 1;
  };

  act(() => {
    root.render(
      <Profiler id="chapter-content-subscription" onRender={onRender}>
        {element}
      </Profiler>,
    );
  });

  const view = { container, root, getCommitCount: () => commitCount };
  mountedViews.push(view);
  return view;
};

afterEach(() => {
  for (const { container, root } of mountedViews.splice(0)) {
    act(() => {
      root.unmount();
    });
    container.remove();
  }
});

describe("useChapterContent 구독 범위", () => {
  let hookModule: typeof UseChapterContentModule;
  let storeModule: typeof ChapterContentStoreModule;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    storeModule = await import(
      "../../src/renderer/src/features/manuscript/stores/chapterContentStore.js"
    );
    hookModule = await import(
      "../../src/renderer/src/features/manuscript/hooks/useChapterContent.js"
    );
  });

  const renderReader = (chapterId: string | undefined) => {
    const Reader = () => {
      const { content, isLoaded } = hookModule.useChapterContent(chapterId);
      return (
        <div data-testid="reader">
          {isLoaded ? `loaded:${content}` : "pending"}
        </div>
      );
    };
    return mountWithProfiler(<Reader />);
  };

  it("마운트하면 본문을 요청하고 도착하면 노출한다", async () => {
    mocked.get.mockResolvedValue(okChapter("ch1", "BODY"));

    const view = renderReader("ch1");
    expect(view.container.textContent).toBe("pending");

    await act(async () => {
      await Promise.resolve();
    });

    expect(mocked.get).toHaveBeenCalledWith("ch1");
    expect(view.container.textContent).toBe("loaded:BODY");
  });

  // 이 테스트가 실패하면 본문 분리의 목적 자체가 무너진 것이다.
  it("다른 챕터의 본문이 캐시에 들어와도 리렌더하지 않는다", async () => {
    mocked.get.mockResolvedValue(okChapter("ch1", "BODY"));

    const view = renderReader("ch1");
    await act(async () => {
      await Promise.resolve();
    });

    const commitsAfterLoad = view.getCommitCount();

    act(() => {
      storeModule.setChapterContent("other-1", "OTHER_BODY_1");
      storeModule.setChapterContent("other-2", "OTHER_BODY_2");
    });

    expect(view.getCommitCount()).toBe(commitsAfterLoad);
    expect(view.container.textContent).toBe("loaded:BODY");
  });

  it("구독 중인 챕터의 본문이 바뀌면 리렌더한다", async () => {
    mocked.get.mockResolvedValue(okChapter("ch1", "BODY"));

    const view = renderReader("ch1");
    await act(async () => {
      await Promise.resolve();
    });
    const commitsAfterLoad = view.getCommitCount();

    act(() => {
      storeModule.setChapterContent("ch1", "BODY_V2");
    });

    expect(view.getCommitCount()).toBeGreaterThan(commitsAfterLoad);
    expect(view.container.textContent).toBe("loaded:BODY_V2");
  });

  // 결함 재현: 스냅샷/휴지통 복원은 `loadAll` → 캐시 reset을 유발한다. 그때 chapterId는
  // 그대로이므로 effect 의존성만으로는 재조회가 트리거되지 않고, 게이트가 영구히 닫혀
  // 에디터 본문이 사라진다.
  it("캐시가 무효화되면 같은 챕터라도 다시 조회한다", async () => {
    mocked.get.mockResolvedValue(okChapter("ch1", "BODY"));

    const view = renderReader("ch1");
    await act(async () => {
      await Promise.resolve();
    });
    expect(view.container.textContent).toBe("loaded:BODY");

    mocked.get.mockResolvedValue(okChapter("ch1", "RESTORED_BODY"));

    await act(async () => {
      storeModule.useChapterContentStore.getState().reset();
      await Promise.resolve();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(mocked.get).toHaveBeenCalledTimes(2);
    expect(view.container.textContent).toBe("loaded:RESTORED_BODY");
  });

  it("chapterId가 없으면 요청하지 않고 pending을 유지한다", () => {
    const view = renderReader(undefined);

    expect(mocked.get).not.toHaveBeenCalled();
    expect(view.container.textContent).toBe("pending");
  });

  // 빈 본문을 truthiness로 판정하면 게이트가 영구히 닫힌다.
  it("빈 본문도 loaded로 노출한다", async () => {
    mocked.get.mockResolvedValue(okChapter("ch1", ""));

    const view = renderReader("ch1");
    await act(async () => {
      await Promise.resolve();
    });

    expect(view.container.textContent).toBe("loaded:");
  });

  it("조회가 실패하면 pending을 유지한다(빈 본문으로 오인하지 않는다)", async () => {
    mocked.get.mockResolvedValue({ success: false, data: null });

    const view = renderReader("ch1");
    await act(async () => {
      await Promise.resolve();
    });

    expect(view.container.textContent).toBe("pending");
  });
});
