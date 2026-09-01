// TEST_LEVEL: UNIT
// PROVES: chapterContentStore가 조회 실패를 상태로 기록하고, 재시도 성공 시 본문 캐시와
//         함께 실패 기록을 해제한다. "조회 실패 → isLoaded 영구 false → 재시도 불가 →
//         빈 화면 고정" 버그(HIGH-6)의 저장소 계약을 고정한다.
// DOES_NOT_PROVE: EditorRoot의 에러 폴백 UI 렌더링, IPC 재시도 타이밍 정책(자동 재시도는
//         의도적으로 없고 사용자 재클릭/재진입이 트리거다)

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  get: vi.fn(),
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@shared/api", () => ({
  api: {
    chapter: { get: mocked.get },
    logger: mocked.logger,
  },
}));

import {
  useChapterContentStore,
  hasChapterContentLoadFailure,
} from "../../../src/renderer/src/features/manuscript/stores/chapterContentStore.js";

describe("chapterContentStore load failure contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useChapterContentStore.getState().reset();
  });

  it("records a load failure so a failed fetch is distinguishable from a pending one", async () => {
    mocked.get.mockResolvedValueOnce({
      success: false,
      error: { message: "chapter not found" },
    });

    await useChapterContentStore.getState().ensureContent("ch-1");

    // 근거 1: 본문 키는 여전히 없다(로딩 완료 아님).
    expect(
      useChapterContentStore.getState().contentByChapterId["ch-1"],
    ).toBeUndefined();
    // 근거 2: 실패 사유가 기록됐다 — UI가 "무반응" 대신 실패를 보여줄 수 있다.
    expect(useChapterContentStore.getState().loadFailures["ch-1"]).toBe(
      "chapter not found",
    );
    expect(hasChapterContentLoadFailure("ch-1")).toBe(true);
  });

  it("clears the failure and caches content when a retry succeeds", async () => {
    mocked.get.mockResolvedValueOnce({
      success: false,
      error: { message: "ipc down" },
    });
    await useChapterContentStore.getState().ensureContent("ch-1");

    mocked.get.mockResolvedValueOnce({
      success: true,
      data: { id: "ch-1", content: "<p>restored</p>" },
    });
    await useChapterContentStore.getState().ensureContent("ch-1");

    // 근거: 실패 후 같은 챕터 재조회가 실제로 IPC를 다시 치고(2회 호출), 성공 시
    // 본문이 캐시되고 실패 기록이 해제된다.
    expect(mocked.get).toHaveBeenCalledTimes(2);
    expect(
      useChapterContentStore.getState().contentByChapterId["ch-1"],
    ).toBe("<p>restored</p>");
    expect(useChapterContentStore.getState().loadFailures["ch-1"]).toBeUndefined();
    expect(hasChapterContentLoadFailure("ch-1")).toBe(false);
  });

  it("records a failure when the fetch throws instead of returning an error envelope", async () => {
    mocked.get.mockRejectedValueOnce(new Error("renderer bridge gone"));

    await useChapterContentStore.getState().ensureContent("ch-2");

    expect(hasChapterContentLoadFailure("ch-2")).toBe(true);
    expect(useChapterContentStore.getState().loadFailures["ch-2"]).toBe(
      "renderer bridge gone",
    );
  });

  it("drops failure records on reset (project switch invalidates everything)", async () => {
    mocked.get.mockResolvedValueOnce({
      success: false,
      error: { message: "gone" },
    });
    await useChapterContentStore.getState().ensureContent("ch-1");
    expect(hasChapterContentLoadFailure("ch-1")).toBe(true);

    useChapterContentStore.getState().reset();

    expect(hasChapterContentLoadFailure("ch-1")).toBe(false);
    expect(useChapterContentStore.getState().loadFailures).toEqual({});
  });
});
