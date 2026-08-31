// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * SUT: useChapterManagement.handleSave — 저장 경로의 결정표.
 *
 * 테스트 베이시스: renderer-Optimization-result.md O1-b2 / O2.
 * O1-b2에서 `items`의 본문 폴백을 제거해 변경 감지 기준이 본문 캐시 하나로 바뀌었고,
 * O2에서 목록 store write를 제목 변경으로 한정했다. 저장 경로는 데이터 손실이 숨을 수 있는
 * 자리라 조건 조합을 표로 고정한다.
 *
 * 조건
 *   C1 프로젝트 존재         C2 chapterId 해석 가능
 *   C3 챕터가 현재 프로젝트 소속   C4 lastSaved 중복(같은 id·제목·본문)
 *   C5 본문 변경(newContent !== 캐시)  C6 제목 변경
 * 동작
 *   A1 setChapterContent   A2 목록 제목 갱신   A3 updateChapter(title)   A4 api.autoSave
 *
 * PROVES: 프로젝트 전환 후 stale 저장 차단, 중복 저장 dedupe, 본문/제목 변경별 동작 분기,
 *         본문만 바뀔 때 목록 store에 쓰지 않음, 캐시 미스 시의 실제 동작.
 * DOES_NOT_PROVE: main의 실제 디스크 저장, Editor 로딩 게이트(별도 스위트).
 */

import type * as UseChapterManagementModule from "../../src/renderer/src/features/manuscript/hooks/useChapterManagement.js";
import type * as ChapterStoreModule from "../../src/renderer/src/features/manuscript/stores/chapterStore.js";
import type * as ChapterContentStoreModule from "../../src/renderer/src/features/manuscript/stores/chapterContentStore.js";
import type * as ProjectStoreModule from "../../src/renderer/src/features/project/stores/projectStore.js";

const mocked = vi.hoisted(() => ({
  getAll: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  del: vi.fn(),
  reorder: vi.fn(),
  autoSave: vi.fn(),
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
    autoSave: mocked.autoSave,
    logger: { warn: mocked.warn, error: mocked.error },
  },
}));

const listItem = (id: string, title: string, projectId = "p1") => ({
  id,
  projectId,
  title,
  synopsis: null,
  order: 1,
  wordCount: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  deletedAt: null,
});

type Harness = {
  save: (
    title: string,
    content: string,
    targetChapterId?: string,
  ) => Promise<void>;
};

const mountedViews: { container: HTMLDivElement; root: Root }[] = [];

afterEach(() => {
  for (const { container, root } of mountedViews.splice(0)) {
    act(() => {
      root.unmount();
    });
    container.remove();
  }
});

describe("handleSave 결정표", () => {
  let hookModule: typeof UseChapterManagementModule;
  let chapterStore: typeof ChapterStoreModule;
  let contentStore: typeof ChapterContentStoreModule;
  let projectStore: typeof ProjectStoreModule;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    mocked.autoSave.mockResolvedValue({ success: true });
    mocked.update.mockImplementation(async (input: { id: string; title?: string }) => ({
      success: true,
      data: { ...listItem(input.id, input.title ?? "t"), content: "ignored" },
    }));

    contentStore = await import(
      "../../src/renderer/src/features/manuscript/stores/chapterContentStore.js"
    );
    chapterStore = await import(
      "../../src/renderer/src/features/manuscript/stores/chapterStore.js"
    );
    projectStore = await import(
      "../../src/renderer/src/features/project/stores/projectStore.js"
    );
    hookModule = await import(
      "../../src/renderer/src/features/manuscript/hooks/useChapterManagement.js"
    );

    contentStore.useChapterContentStore.getState().reset();
    mocked.getAll.mockResolvedValue({
      success: true,
      data: [listItem("c1", "첫 장"), listItem("c2", "둘째 장")],
    });
    await chapterStore.useChapterStore.getState().loadAll("p1");
    projectStore.useProjectStore.setState({
      currentItem: { id: "p1", title: "프로젝트" },
    } as never);
  });

  const mountHook = async (): Promise<Harness> => {
    const harness: Harness = { save: async () => {} };
    function Probe() {
      const { handleSave } = hookModule.useChapterManagement();
      harness.save = handleSave;
      return null;
    }
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(<Probe />);
      await Promise.resolve();
    });
    mountedViews.push({ container, root });
    return harness;
  };

  const itemsRef = () => chapterStore.useChapterStore.getState().items;

  it("R3: 다른 프로젝트 챕터 저장은 차단하고 autoSave도 호출하지 않는다", async () => {
    const harness = await mountHook();

    await act(async () => {
      await harness.save("제목", "<p>본문</p>", "다른-프로젝트-챕터");
    });

    expect(mocked.autoSave).not.toHaveBeenCalled();
    expect(mocked.warn).toHaveBeenCalled();
  });

  it("R5: 본문만 바뀌면 캐시만 갱신하고 목록 배열 참조는 유지한다", async () => {
    contentStore.setChapterContent("c1", "<p>이전</p>");
    const harness = await mountHook();
    const before = itemsRef();

    await act(async () => {
      await harness.save("첫 장", "<p>이후</p>", "c1");
    });

    expect(contentStore.peekChapterContent("c1")).toBe("<p>이후</p>");
    expect(itemsRef()).toBe(before);
    expect(mocked.update).not.toHaveBeenCalled();
    expect(mocked.autoSave).toHaveBeenCalledWith("c1", "<p>이후</p>", "p1");
  });

  it("R6: 제목만 바뀌면 목록 제목을 갱신하고 updateChapter를 호출한다", async () => {
    contentStore.setChapterContent("c1", "<p>본문</p>");
    const harness = await mountHook();

    await act(async () => {
      await harness.save("새 제목", "<p>본문</p>", "c1");
    });

    expect(itemsRef().find((i) => i.id === "c1")?.title).toBe("새 제목");
    expect(mocked.update).toHaveBeenCalledWith({ id: "c1", title: "새 제목" });
  });

  it("R4: 같은 제목·본문 재저장은 dedupe되어 autoSave가 한 번만 나간다", async () => {
    contentStore.setChapterContent("c1", "<p>본문</p>");
    const harness = await mountHook();

    await act(async () => {
      await harness.save("첫 장", "<p>변경</p>", "c1");
      await harness.save("첫 장", "<p>변경</p>", "c1");
      await harness.save("첫 장", "<p>변경</p>", "c1");
    });

    expect(mocked.autoSave).toHaveBeenCalledTimes(1);
  });

  it("빈 제목은 기존 제목으로 대체되어 제목 변경으로 취급되지 않는다", async () => {
    contentStore.setChapterContent("c1", "<p>본문</p>");
    const harness = await mountHook();

    await act(async () => {
      await harness.save("   ", "<p>변경</p>", "c1");
    });

    expect(itemsRef().find((i) => i.id === "c1")?.title).toBe("첫 장");
    expect(mocked.update).not.toHaveBeenCalled();
  });

  it("본문 전체 삭제(빈 문자열)는 변경으로 인식되어 캐시와 autoSave에 반영된다", async () => {
    contentStore.setChapterContent("c1", "<p>지워질 본문</p>");
    const harness = await mountHook();

    await act(async () => {
      await harness.save("첫 장", "", "c1");
    });

    expect(contentStore.peekChapterContent("c1")).toBe("");
    expect(mocked.autoSave).toHaveBeenCalledWith("c1", "", "p1");
  });

  /**
   * WARNING: 캐시 미스(=해당 챕터에 마운트된 Editor가 없음) + 빈 본문 조합에서는
   * `previousContent`가 ""로 계산되어 본문 변경이 감지되지 않는다. 그런데 `api.autoSave`는
   * 조건과 무관하게 호출되므로 빈 본문이 저장 큐에 들어간다. 현재는 Editor 로딩 게이트가
   * 빈 본문 마운트를 막아 도달하지 않지만, handleSave 자체에는 가드가 없다.
   * 이 테스트는 그 사실을 고정한다 — 가드를 추가하면 이 기대값을 바꿔야 한다.
   */
  it("현재 동작 고정: 캐시 미스 + 빈 본문이면 캐시는 그대로지만 autoSave는 호출된다", async () => {
    const harness = await mountHook();
    expect(contentStore.peekChapterContent("c1")).toBeUndefined();

    await act(async () => {
      await harness.save("첫 장", "", "c1");
    });

    // 캐시에는 쓰이지 않는다(변경 미감지).
    expect(contentStore.peekChapterContent("c1")).toBeUndefined();
    // 그러나 저장 큐에는 빈 본문이 들어간다.
    expect(mocked.autoSave).toHaveBeenCalledWith("c1", "", "p1");
  });
});
