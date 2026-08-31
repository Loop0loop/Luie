import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as ChapterContentStoreModule from "../../../src/renderer/src/features/manuscript/stores/chapterContentStore.js";

/**
 * SUT: chapterContentStore의 LRU 축출 판정 — 구독(retain) 압력이 상한에 도달한 경우.
 *
 * 테스트 베이시스: renderer-Optimization-result.md O1-b1(상한 + retain 보호), O1-b2.
 * 기존 `chapterContentStore.test.ts`의 BVA3~BVA5는 "구독 항목 1개 + 미구독 다수"만 다룬다.
 * O1-b2에서 `useChapterManagement`의 items 본문 폴백을 제거한 뒤로는 캐시가 본문의 유일한
 * 공급원이므로, **구독 항목이 상한을 가득 채운 상태**에서 새 본문을 요청하는 경로가
 * 새로운 위험 구간이 됐다. 복제(`handleDuplicateChapter`)가 정확히 그 경로다.
 *
 * 등가분할 기준은 "구독 중인 항목 수"다.
 *   - EP1: retained < 상한        → 새 항목이 남고 미구독 항목이 밀려난다
 *   - EP2: retained == 상한       → 밀어낼 미구독 항목이 없다 (이 스위트의 관심사)
 *   - EP3: retained > 상한        → 이미 상한을 초과한 상태
 *
 * PROVES: retain이 상한을 채운 상태에서 신규 요청 본문의 생존 여부, 그리고 그 결과가
 *         복제 경로(캐시 → peek)에 어떻게 전달되는지.
 * DOES_NOT_PROVE: 실제 UI에서 동시에 4개 구독이 발생하는 빈도, 힙 사용량.
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

describe("chapterContentStore 구독 압력 하의 축출", () => {
  let storeModule: typeof ChapterContentStoreModule;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    storeModule = await import(
      "../../../src/renderer/src/features/manuscript/stores/chapterContentStore.js"
    );
    mocked.get.mockImplementation((id: string) =>
      Promise.resolve(okChapter(id, `BODY_${id}`)),
    );
  });

  /** 지정한 챕터들을 구독 상태로 캐시에 채운다. */
  const fillRetained = async (ids: readonly string[]): Promise<void> => {
    for (const id of ids) {
      storeModule.retainChapterContent(id);
      // eslint-disable-next-line no-await-in-loop -- LRU 접근 순서가 삽입 순서로 정해지므로 병렬화하면 축출 대상이 비결정적이 된다.
      await storeModule.ensureChapterContent(id);
    }
  };

  it(`EP1: 구독이 상한-1(${CACHE_LIMIT - 1})개면 새 본문이 캐시에 남는다`, async () => {
    await fillRetained(["r1", "r2", "r3"]);
    // 미구독 항목 하나를 넣어 상한을 채운다.
    await storeModule.ensureChapterContent("free1");

    // 상한을 넘기는 신규 요청. 밀어낼 미구독 항목(free1)이 있다.
    await storeModule.ensureChapterContent("target");

    expect(storeModule.peekChapterContent("target")).toBe("BODY_target");
    expect(storeModule.peekChapterContent("free1")).toBeUndefined();
    for (const id of ["r1", "r2", "r3"]) {
      expect(storeModule.peekChapterContent(id)).toBe(`BODY_${id}`);
    }
  });

  it(`EP2: 구독이 상한(${CACHE_LIMIT})개를 채운 상태에서도 새 본문이 살아남아야 한다`, async () => {
    await fillRetained(["r1", "r2", "r3", "r4"]);
    expect(
      Object.keys(
        storeModule.useChapterContentStore.getState().contentByChapterId,
      ),
    ).toHaveLength(CACHE_LIMIT);

    // 복제가 하는 일: 화면에 없는 원본 본문을 받아온 직후 곧바로 읽는다.
    await storeModule.ensureChapterContent("target");

    // 방금 요청해 아직 소비되지 않은 본문을 버리면 호출부는 빈 문자열을 읽는다.
    // 구독 항목을 지킬 수 없다면 상한을 일시적으로 넘기는 편이 안전하다.
    expect(storeModule.peekChapterContent("target")).toBe("BODY_target");
    // 구독 중인 항목은 여전히 보호돼야 한다.
    for (const id of ["r1", "r2", "r3", "r4"]) {
      expect(storeModule.peekChapterContent(id)).toBe(`BODY_${id}`);
    }
  });

  it("EP3: 구독이 상한을 초과한 상태에서도 새 본문이 살아남아야 한다", async () => {
    await fillRetained(["r1", "r2", "r3", "r4", "r5"]);

    await storeModule.ensureChapterContent("target");

    expect(storeModule.peekChapterContent("target")).toBe("BODY_target");
  });

  it("상태전이: 구독 하나를 해제하면 다음 요청에서 그 항목이 밀려난다", async () => {
    await fillRetained(["r1", "r2", "r3", "r4"]);
    await storeModule.ensureChapterContent("target");

    storeModule.releaseChapterContent("r1");
    await storeModule.ensureChapterContent("next");

    expect(storeModule.peekChapterContent("next")).toBe("BODY_next");
    expect(storeModule.peekChapterContent("r1")).toBeUndefined();
  });

  it("복제 경로: 화면에 없는 원본을 받아 즉시 읽어도 본문이 비지 않는다", async () => {
    // 메인 에디터 + 분할 에디터 2개 + 스냅샷 뷰어처럼 구독자가 상한을 채운 상황.
    await fillRetained(["open1", "open2", "open3", "open4"]);

    // handleDuplicateChapter와 같은 순서: ensure → peek.
    await storeModule.ensureChapterContent("source");
    const sourceContent = storeModule.peekChapterContent("source") ?? "";

    // 빈 문자열이면 사본이 본문 없이 만들어진다.
    expect(sourceContent).toBe("BODY_source");
  });
});
