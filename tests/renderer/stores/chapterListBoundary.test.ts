import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as ChapterStoreModule from "../../../src/renderer/src/features/manuscript/stores/chapterStore.js";

/**
 * SUT: chapterStore — 목록 store의 본문 분리 경계.
 *
 * 테스트 베이시스: renderer-Optimization-result.md O1-b2 / O2.
 * O1-b2는 목록에서 본문을 뺐고, O2는 자동 저장이 `items` 배열 참조를 교체하지 않게 만들었다.
 * 두 계약 모두 "참조가 언제 바뀌는가"로 관측된다. 참조가 바뀌면 사이드바를 포함한 모든 목록
 * 구독자가 리렌더되므로, 여기서 참조 동일성을 직접 고정한다.
 *
 * PROVES: loadAll이 본문 없는 항목만 싣는다, create/update 응답의 본문이 items로 새지 않는다,
 *         제목이 그대로면 items 참조가 유지된다, 제목이 바뀌면 해당 항목만 교체된다,
 *         chapters/currentChapter 별칭이 items/currentItem과 항상 같은 참조다.
 * DOES_NOT_PROVE: React 컴포넌트의 실제 커밋 수(Profiler는 별도 DOM 테스트 담당),
 *                 IPC 직렬화 크기, 힙 실측.
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

describe("chapterStore 본문 분리 경계", () => {
  let storeModule: typeof ChapterStoreModule;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    storeModule = await import(
      "../../../src/renderer/src/features/manuscript/stores/chapterStore.js"
    );
  });

  const loadTwoChapters = async () => {
    mocked.getAll.mockResolvedValue({
      success: true,
      data: [listItem("c1", "첫 장", 1), listItem("c2", "둘째 장", 2)],
    });
    await storeModule.useChapterStore.getState().loadAll("p1");
  };

  it("loadAll이 실은 항목에는 content 키가 없다", async () => {
    await loadTwoChapters();

    const { items } = storeModule.useChapterStore.getState();
    expect(items).toHaveLength(2);
    expect(
      items.every(
        (item) => !Object.prototype.hasOwnProperty.call(item, "content"),
      ),
    ).toBe(true);
  });

  it("create 응답의 본문은 items로 새지 않는다", async () => {
    await loadTwoChapters();
    // 실제 IPC는 본문과 저장 상태를 포함한 전체 Chapter를 준다.
    mocked.create.mockResolvedValue({
      success: true,
      data: {
        ...listItem("c3", "셋째 장", 3),
        content: "<p>본문이 새면 안 된다</p>",
        saveState: { type: "saved", at: 1 },
      },
    });

    const created = await storeModule.useChapterStore
      .getState()
      .create({ projectId: "p1", title: "셋째 장" });

    expect(created).not.toBeNull();
    expect(Object.prototype.hasOwnProperty.call(created!, "content")).toBe(
      false,
    );
    const added = storeModule.useChapterStore
      .getState()
      .items.find((item) => item.id === "c3");
    expect(added).toBeDefined();
    expect(Object.prototype.hasOwnProperty.call(added!, "content")).toBe(false);
  });

  it("update 응답(ChapterSaveResult)의 본문도 items로 새지 않는다", async () => {
    await loadTwoChapters();
    mocked.update.mockResolvedValue({
      success: true,
      data: {
        ...listItem("c1", "첫 장 수정", 1),
        content: "<p>본문이 새면 안 된다</p>",
        saveState: { type: "saved", at: 1 },
        derivedSyncState: "idle",
      },
    });

    await storeModule.useChapterStore
      .getState()
      .update({ id: "c1", title: "첫 장 수정" });

    const updated = storeModule.useChapterStore
      .getState()
      .items.find((item) => item.id === "c1");
    expect(updated?.title).toBe("첫 장 수정");
    expect(Object.prototype.hasOwnProperty.call(updated!, "content")).toBe(
      false,
    );
  });

  it("제목이 그대로면 applyOptimisticTitle이 items 참조를 유지한다", async () => {
    await loadTwoChapters();
    const before = storeModule.useChapterStore.getState().items;

    storeModule.useChapterStore.getState().applyOptimisticTitle("c1", "첫 장");

    const after = storeModule.useChapterStore.getState().items;
    // 참조가 바뀌면 목록 구독자 전원이 리렌더된다(O2가 없애려던 바로 그 경로).
    expect(after).toBe(before);
  });

  it("존재하지 않는 챕터에 대해서도 items 참조를 유지한다", async () => {
    await loadTwoChapters();
    const before = storeModule.useChapterStore.getState().items;

    storeModule.useChapterStore
      .getState()
      .applyOptimisticTitle("없는-id", "무엇이든");

    expect(storeModule.useChapterStore.getState().items).toBe(before);
  });

  it("제목이 바뀌면 해당 항목만 새 객체로 교체된다", async () => {
    await loadTwoChapters();
    const before = storeModule.useChapterStore.getState().items;

    storeModule.useChapterStore
      .getState()
      .applyOptimisticTitle("c1", "새 제목");

    const after = storeModule.useChapterStore.getState().items;
    expect(after).not.toBe(before);
    expect(after[0].title).toBe("새 제목");
    // 바뀌지 않은 항목은 같은 객체를 유지해야 행 단위 memo가 살아남는다.
    expect(after[1]).toBe(before[1]);
  });

  it("chapters/currentChapter 별칭이 items/currentItem과 같은 참조를 유지한다", async () => {
    await loadTwoChapters();

    const loaded = storeModule.useChapterStore.getState();
    expect(loaded.chapters).toBe(loaded.items);

    loaded.setCurrent(loaded.items[1]);
    const selected = storeModule.useChapterStore.getState();
    expect(selected.currentChapter).toBe(selected.currentItem);

    selected.applyOptimisticTitle("c2", "둘째 장 수정");
    const renamed = storeModule.useChapterStore.getState();
    expect(renamed.chapters).toBe(renamed.items);
    expect(renamed.currentChapter).toBe(renamed.currentItem);
    expect(renamed.currentChapter?.title).toBe("둘째 장 수정");
  });
});
