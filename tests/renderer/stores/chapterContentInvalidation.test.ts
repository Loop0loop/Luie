import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as ChapterStoreModule from "../../../src/renderer/src/features/manuscript/stores/chapterStore.js";
import type * as ChapterContentStoreModule from "../../../src/renderer/src/features/manuscript/stores/chapterContentStore.js";

/**
 * SUT: chapterStore.loadAll — 본문 캐시 무효화 불변식.
 *
 * 테스트 베이시스: O1-b1 설계에서 발견한 결함 시나리오.
 * 스냅샷 복원/휴지통 복원/임포트/프로젝트 전환은 모두 `loadAll`을 지난다. 이때 본문 캐시를
 * 비우지 않으면 에디터가 복원 이전 본문으로 리마운트되고, 그 상태로 자동 저장이 발화하면
 * 복원한 내용이 되돌려진다. 즉 이 불변식이 깨지면 데이터 손실이다.
 */

const mocked = vi.hoisted(() => ({
  getAll: vi.fn(),
  get: vi.fn(),
  reorder: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}));

vi.mock("@shared/api", () => ({
  api: {
    chapter: {
      getAll: mocked.getAll,
      get: mocked.get,
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      reorder: mocked.reorder,
    },
    logger: { warn: mocked.warn, error: mocked.error, info: mocked.info },
  },
}));

const chapterRow = (id: string) => ({
  id,
  projectId: "p1",
  title: `T-${id}`,
  content: "",
  order: 1,
});

describe("chapterStore.loadAll 본문 캐시 무효화", () => {
  let chapterStoreModule: typeof ChapterStoreModule;
  let contentStoreModule: typeof ChapterContentStoreModule;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    contentStoreModule = await import(
      "../../../src/renderer/src/features/manuscript/stores/chapterContentStore.js"
    );
    chapterStoreModule = await import(
      "../../../src/renderer/src/features/manuscript/stores/chapterStore.js"
    );
  });

  it("loadAll이 끝나면 이전 본문 캐시가 남아 있지 않다", async () => {
    contentStoreModule.setChapterContent("ch1", "STALE_BEFORE_RESTORE");
    mocked.getAll.mockResolvedValue({
      success: true,
      data: [chapterRow("ch1")],
    });

    await chapterStoreModule.useChapterStore.getState().loadAll("p1");

    expect(contentStoreModule.peekChapterContent("ch1")).toBeUndefined();
  });

  // 로드가 끝난 뒤에 비우면, 로드 중인 구간에 낡은 본문이 화면에 공급된다.
  it("로드 완료를 기다리지 않고 즉시 비운다", async () => {
    contentStoreModule.setChapterContent("ch1", "STALE_BEFORE_RESTORE");

    let resolveGetAll: ((value: unknown) => void) | null = null;
    mocked.getAll.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGetAll = resolve;
        }),
    );

    const pending = chapterStoreModule.useChapterStore
      .getState()
      .loadAll("p1");

    expect(contentStoreModule.peekChapterContent("ch1")).toBeUndefined();

    resolveGetAll?.({ success: true, data: [chapterRow("ch1")] });
    await pending;
  });

  it("loadAll은 기존 목록 적재 동작을 유지한다", async () => {
    mocked.getAll.mockResolvedValue({
      success: true,
      data: [chapterRow("ch1"), chapterRow("ch2")],
    });

    await chapterStoreModule.useChapterStore.getState().loadAll("p1");

    const state = chapterStoreModule.useChapterStore.getState();
    expect(state.items.map((item) => item.id)).toEqual(["ch1", "ch2"]);
    expect(mocked.getAll).toHaveBeenCalledWith("p1");
  });

  // 복원 흐름은 `await loadAll()` 뒤에 알고 있는 본문을 캐시에 직접 채운다(재조회 생략 →
  // 게이트/깜빡임 제거). 무효화가 await 이후로 밀리면 그 시드가 지워져 다시 깜빡인다.
  it("loadAll 완료 후 채운 본문은 지워지지 않는다(복원 시드 경로)", async () => {
    mocked.getAll.mockResolvedValue({
      success: true,
      data: [chapterRow("ch1")],
    });

    await chapterStoreModule.useChapterStore.getState().loadAll("p1");
    contentStoreModule.setChapterContent("ch1", "RESTORED_BODY");

    await Promise.resolve();

    expect(contentStoreModule.peekChapterContent("ch1")).toBe("RESTORED_BODY");
  });
});
