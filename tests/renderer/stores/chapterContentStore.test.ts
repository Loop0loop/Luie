import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as ChapterContentStoreModule from "../../../src/renderer/src/features/manuscript/stores/chapterContentStore.js";

/**
 * SUT: chapterContentStore — 챕터 본문 캐시.
 *
 * 테스트 베이시스: renderer-Optimization-result.md O1 / O1-b1 설계.
 * 이 캐시는 목록(items)에서 분리된 유일한 본문 공급원이 되므로 다음을 고정한다.
 *   - 캐시 미스/히트 판정이 "키 존재"여야 한다(빈 본문도 유효한 값).
 *   - 동시 요청이 하나로 합쳐져야 한다(저장 직후 여러 컴포넌트가 동시에 요구한다).
 *   - 상한이 있어야 한다(없으면 원래의 전량 상주 문제가 캐시로 이동할 뿐이다).
 *   - 조회 실패가 "빈 본문 로딩 완료"로 오인되면 안 된다(자동 저장이 원본을 덮어쓴다).
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

const CACHE_LIMIT = 4;

const okChapter = (id: string, content: string) => ({
  success: true,
  data: { id, projectId: "p1", title: `T-${id}`, content, order: 1 },
});

describe("chapterContentStore", () => {
  let storeModule: typeof ChapterContentStoreModule;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    storeModule = await import(
      "../../../src/renderer/src/features/manuscript/stores/chapterContentStore.js"
    );
  });

  describe("로딩 판정 (등가분할)", () => {
    it("EP1: 캐시 미스면 단건 조회로 본문을 채운다", async () => {
      mocked.get.mockResolvedValue(okChapter("ch1", "BODY"));

      await storeModule.ensureChapterContent("ch1");

      expect(mocked.get).toHaveBeenCalledTimes(1);
      expect(mocked.get).toHaveBeenCalledWith("ch1");
      expect(storeModule.peekChapterContent("ch1")).toBe("BODY");
    });

    it("EP2: 캐시 히트면 다시 조회하지 않는다", async () => {
      mocked.get.mockResolvedValue(okChapter("ch1", "BODY"));

      await storeModule.ensureChapterContent("ch1");
      await storeModule.ensureChapterContent("ch1");

      expect(mocked.get).toHaveBeenCalledTimes(1);
    });

    it("EP3: 조회가 실패하면 캐시에 넣지 않는다", async () => {
      mocked.get.mockResolvedValue({ success: false, data: null });

      await storeModule.ensureChapterContent("ch1");

      expect(storeModule.peekChapterContent("ch1")).toBeUndefined();
      expect(mocked.warn).toHaveBeenCalled();
    });

    it("EP4: 조회가 예외를 던져도 캐시에 넣지 않는다", async () => {
      mocked.get.mockRejectedValue(new Error("ipc down"));

      await storeModule.ensureChapterContent("ch1");

      expect(storeModule.peekChapterContent("ch1")).toBeUndefined();
      expect(mocked.error).toHaveBeenCalled();
    });
  });

  describe("경계값", () => {
    // 빈 본문을 truthiness로 판정하면 "미로딩"으로 오인해 매번 재조회하고,
    // 에디터 게이트가 영구히 닫힌다.
    it("BVA1: 빈 본문도 로딩 완료로 취급한다", async () => {
      mocked.get.mockResolvedValue(okChapter("ch1", ""));

      await storeModule.ensureChapterContent("ch1");
      await storeModule.ensureChapterContent("ch1");

      expect(storeModule.peekChapterContent("ch1")).toBe("");
      expect(mocked.get).toHaveBeenCalledTimes(1);
    });

    it("BVA2: 빈 chapterId는 조회하지 않는다", async () => {
      await storeModule.ensureChapterContent("");

      expect(mocked.get).not.toHaveBeenCalled();
      expect(storeModule.peekChapterContent(undefined)).toBeUndefined();
      expect(storeModule.peekChapterContent(null)).toBeUndefined();
    });

    it(`BVA3: 상한(${CACHE_LIMIT})을 넘으면 가장 오래된 항목을 버린다`, async () => {
      mocked.get.mockImplementation((id: string) =>
        Promise.resolve(okChapter(id, `BODY_${id}`)),
      );

      await storeModule.ensureChapterContent("c1");
      await storeModule.ensureChapterContent("c2");
      await storeModule.ensureChapterContent("c3");
      await storeModule.ensureChapterContent("c4");
      expect(storeModule.peekChapterContent("c1")).toBe("BODY_c1");

      await storeModule.ensureChapterContent("c5");

      expect(storeModule.peekChapterContent("c1")).toBeUndefined();
      for (const id of ["c2", "c3", "c4", "c5"]) {
        expect(storeModule.peekChapterContent(id)).toBe(`BODY_${id}`);
      }
    });

    // 구독 중인 본문을 버리면 구독자가 즉시 재조회하고, 그 과정에서 다른 항목이 밀려나
    // 재조회가 연쇄된다(IPC 폭주). 화면이 보고 있는 항목은 상한보다 우선한다.
    it("BVA4: 구독 중인 항목은 상한을 넘어도 버리지 않는다", async () => {
      mocked.get.mockImplementation((id: string) =>
        Promise.resolve(okChapter(id, `BODY_${id}`)),
      );

      storeModule.retainChapterContent("c1");
      await storeModule.ensureChapterContent("c1");
      await storeModule.ensureChapterContent("c2");
      await storeModule.ensureChapterContent("c3");
      await storeModule.ensureChapterContent("c4");
      await storeModule.ensureChapterContent("c5");

      expect(storeModule.peekChapterContent("c1")).toBe("BODY_c1");
      // c1 대신 다음으로 오래된 미구독 항목이 버려진다.
      expect(storeModule.peekChapterContent("c2")).toBeUndefined();
    });

    it("BVA5: 구독을 해제하면 다시 버릴 수 있다", async () => {
      mocked.get.mockImplementation((id: string) =>
        Promise.resolve(okChapter(id, `BODY_${id}`)),
      );

      storeModule.retainChapterContent("c1");
      await storeModule.ensureChapterContent("c1");
      await storeModule.ensureChapterContent("c2");
      await storeModule.ensureChapterContent("c3");
      await storeModule.ensureChapterContent("c4");
      await storeModule.ensureChapterContent("c5");
      expect(storeModule.peekChapterContent("c1")).toBe("BODY_c1");

      storeModule.releaseChapterContent("c1");
      await storeModule.ensureChapterContent("c6");

      expect(storeModule.peekChapterContent("c1")).toBeUndefined();
    });
  });

  describe("동시 요청", () => {
    it("같은 챕터에 대한 동시 요청은 한 번만 조회한다", async () => {
      let resolveGet: ((value: unknown) => void) | null = null;
      mocked.get.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveGet = resolve;
          }),
      );

      const first = storeModule.ensureChapterContent("ch1");
      const second = storeModule.ensureChapterContent("ch1");

      expect(mocked.get).toHaveBeenCalledTimes(1);

      resolveGet?.(okChapter("ch1", "BODY"));
      await Promise.all([first, second]);

      expect(storeModule.peekChapterContent("ch1")).toBe("BODY");
      expect(mocked.get).toHaveBeenCalledTimes(1);
    });
  });

  describe("상태전이", () => {
    it("setContent는 조회 없이 캐시를 갱신한다(저장 직후 경로)", () => {
      storeModule.setChapterContent("ch1", "SAVED");

      expect(storeModule.peekChapterContent("ch1")).toBe("SAVED");
      expect(mocked.get).not.toHaveBeenCalled();
    });

    it("setContent가 최신 접근으로 취급되어 먼저 버려지지 않는다", async () => {
      mocked.get.mockImplementation((id: string) =>
        Promise.resolve(okChapter(id, `BODY_${id}`)),
      );

      await storeModule.ensureChapterContent("c1");
      await storeModule.ensureChapterContent("c2");
      await storeModule.ensureChapterContent("c3");
      await storeModule.ensureChapterContent("c4");
      // c1을 다시 저장해 최신으로 만든다.
      storeModule.setChapterContent("c1", "RESAVED");

      await storeModule.ensureChapterContent("c5");

      expect(storeModule.peekChapterContent("c1")).toBe("RESAVED");
      expect(storeModule.peekChapterContent("c2")).toBeUndefined();
    });

    it("reset은 캐시를 비운다(프로젝트 전환·스냅샷 복원 경로)", async () => {
      mocked.get.mockResolvedValue(okChapter("ch1", "BODY"));
      await storeModule.ensureChapterContent("ch1");
      expect(storeModule.peekChapterContent("ch1")).toBe("BODY");

      storeModule.useChapterContentStore.getState().reset();

      expect(storeModule.peekChapterContent("ch1")).toBeUndefined();
    });

    it("reset 후에는 다시 조회한다", async () => {
      mocked.get.mockResolvedValue(okChapter("ch1", "BODY"));
      await storeModule.ensureChapterContent("ch1");
      storeModule.useChapterContentStore.getState().reset();

      await storeModule.ensureChapterContent("ch1");

      expect(mocked.get).toHaveBeenCalledTimes(2);
    });

    // 복원 흐름은 "reset → 즉시 재조회"다. 이전 세대의 응답이 나중에 도착해 커밋되면
    // 캐시가 복원 이전 본문으로 되돌아가고, 그 상태로 자동 저장이 나가면 복원이 무효화된다.
    it("무효화 이전에 시작된 조회 결과는 커밋하지 않는다", async () => {
      let resolveStale: ((value: unknown) => void) | null = null;
      mocked.get.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveStale = resolve;
          }),
      );

      const stalePending = storeModule.ensureChapterContent("ch1");

      storeModule.useChapterContentStore.getState().reset();

      resolveStale?.(okChapter("ch1", "STALE_BEFORE_RESTORE"));
      await stalePending;

      expect(storeModule.peekChapterContent("ch1")).toBeUndefined();
    });
  });
});
