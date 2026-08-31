// @vitest-environment jsdom

import {
  act,
  memo,
  Profiler,
  type ProfilerOnRenderCallback,
  type ReactNode,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useShallow } from "zustand/react/shallow";

import type * as ChapterStoreModule from "../../src/renderer/src/features/manuscript/stores/chapterStore.js";
import type * as ChapterContentStoreModule from "../../src/renderer/src/features/manuscript/stores/chapterContentStore.js";

/**
 * SUT: 챕터 목록 구독자의 리렌더 경계 (사이드바가 하는 구독을 그대로 재현).
 *
 * 테스트 베이시스: renderer-Optimization-result.md O2.
 * O2의 주장은 "자동 저장이 목록 구독자를 리렌더시키지 않는다"다. `chapterListBoundary`는
 * store의 참조 동일성만 고정했고, 그 참조가 실제로 React 커밋을 막는지는 별개 관측이다.
 * 여기서는 사이드바와 같은 구독(`useShallow`로 items를 읽고 행을 memo로 렌더)을 세워
 * Profiler 커밋 수로 직접 확인한다.
 *
 * PROVES: 본문만 바뀌는 저장의 커밋 수 불변, 제목 변경 시 커밋 발생, 제목 변경 시 바뀐 행만
 *         리렌더(나머지 행 memo 유지), 같은 제목 재적용의 커밋 수 불변.
 * DOES_NOT_PROVE: 실제 Sidebar 컴포넌트의 렌더 비용, 프레임 드랍, 힙 사용량.
 */

const mocked = vi.hoisted(() => ({
  getAll: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  del: vi.fn(),
  reorder: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@shared/api", () => ({
  api: {
    chapter: {
      getAll: mocked.getAll,
      get: mocked.get,
      create: mocked.create,
      update: mocked.update,
      delete: mocked.del,
      reorder: mocked.reorder,
    },
    logger: { warn: mocked.warn, error: mocked.error },
  },
}));

const listItem = (id: string, title: string, order: number) => ({
  id,
  projectId: "p1",
  title,
  synopsis: null,
  order,
  wordCount: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  deletedAt: null,
});

type MountedView = { container: HTMLDivElement; root: Root };
const mountedViews: MountedView[] = [];

afterEach(() => {
  for (const { container, root } of mountedViews.splice(0)) {
    act(() => {
      root.unmount();
    });
    container.remove();
  }
});

describe("목록 구독자 리렌더 경계 (O2)", () => {
  let storeModule: typeof ChapterStoreModule;
  let contentModule: typeof ChapterContentStoreModule;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    contentModule = await import(
      "../../src/renderer/src/features/manuscript/stores/chapterContentStore.js"
    );
    storeModule = await import(
      "../../src/renderer/src/features/manuscript/stores/chapterStore.js"
    );
    mocked.getAll.mockResolvedValue({
      success: true,
      data: [
        listItem("c1", "첫 장", 1),
        listItem("c2", "둘째 장", 2),
        listItem("c3", "셋째 장", 3),
      ],
    });
    await storeModule.useChapterStore.getState().loadAll("p1");
  });

  const rowRenderCounts = new Map<string, number>();

  /** 사이드바 행과 같은 구조: memo된 행이 자기 항목만 prop으로 받는다. */
  const Row = memo(function Row({ id, title }: { id: string; title: string }) {
    rowRenderCounts.set(id, (rowRenderCounts.get(id) ?? 0) + 1);
    return <li data-testid={`row-${id}`}>{title}</li>;
  });

  /** 사이드바와 같은 구독: useShallow로 목록을 읽는다. */
  function ChapterList() {
    const { items } = storeModule.useChapterStore(
      useShallow((state) => ({ items: state.items })),
    );
    return (
      <ul>
        {items.map((item) => (
          <Row key={item.id} id={item.id} title={item.title} />
        ))}
      </ul>
    );
  }

  const mountList = (): { getCommitCount: () => number } => {
    rowRenderCounts.clear();
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    let commitCount = 0;
    const onRender: ProfilerOnRenderCallback = () => {
      commitCount += 1;
    };
    const tree: ReactNode = (
      <Profiler id="chapter-list" onRender={onRender}>
        <ChapterList />
      </Profiler>
    );
    act(() => {
      root.render(tree);
    });
    mountedViews.push({ container, root });
    return { getCommitCount: () => commitCount };
  };

  it("본문만 바뀌는 저장은 목록 구독자를 리렌더하지 않는다", () => {
    const view = mountList();
    const baseline = view.getCommitCount();
    expect(baseline).toBeGreaterThan(0);

    // 자동 저장 경로가 하는 일: 본문 캐시만 갱신한다.
    act(() => {
      contentModule.setChapterContent("c1", "<p>편집한 본문</p>");
      contentModule.setChapterContent("c1", "<p>더 편집한 본문</p>");
      contentModule.setChapterContent("c2", "<p>다른 챕터 본문</p>");
    });

    expect(view.getCommitCount()).toBe(baseline);
  });

  it("같은 제목을 다시 적용해도 리렌더하지 않는다", () => {
    const view = mountList();
    const baseline = view.getCommitCount();

    act(() => {
      storeModule.useChapterStore.getState().applyOptimisticTitle("c1", "첫 장");
    });

    expect(view.getCommitCount()).toBe(baseline);
  });

  it("제목이 바뀌면 리렌더하고, 바뀐 행만 다시 그린다", () => {
    const view = mountList();
    const baseline = view.getCommitCount();
    const rowsBefore = new Map(rowRenderCounts);

    act(() => {
      storeModule.useChapterStore
        .getState()
        .applyOptimisticTitle("c2", "둘째 장 수정");
    });

    expect(view.getCommitCount()).toBeGreaterThan(baseline);
    // 바뀐 행만 증가해야 한다. 나머지가 함께 증가하면 O2가 없애려던 전량 리렌더다.
    expect(rowRenderCounts.get("c2")).toBe((rowsBefore.get("c2") ?? 0) + 1);
    expect(rowRenderCounts.get("c1")).toBe(rowsBefore.get("c1"));
    expect(rowRenderCounts.get("c3")).toBe(rowsBefore.get("c3"));
  });

  it("본문 저장을 여러 번 반복해도 행 렌더 수가 늘지 않는다", () => {
    mountList();
    const rowsBefore = new Map(rowRenderCounts);

    act(() => {
      for (let index = 0; index < 20; index += 1) {
        contentModule.setChapterContent("c1", `<p>편집 ${index}</p>`);
      }
    });

    for (const id of ["c1", "c2", "c3"]) {
      expect(rowRenderCounts.get(id)).toBe(rowsBefore.get(id));
    }
  });
});
