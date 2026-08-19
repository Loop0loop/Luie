// TEST_LEVEL: UNIT
// PROVES: 스냅샷 복원 UI 갱신 계약 — bumpContentRevision이 contentRevision을 증가시켜
//         Editor key가 바뀌고 리마운트(=복원 내용 즉시 반영)된다.
// DOES_NOT_PROVE: 실제 Editor 리마운트 렌더링 (Editor key 템플릿은 typecheck가 보장)

import { describe, it, expect, beforeEach } from "vitest";
import { useChapterStore } from "../../../src/renderer/src/features/manuscript/stores/chapterStore.js";

describe("chapterStore contentRevision (스냅샷 복원 UI 갱신)", () => {
  beforeEach(() => {
    useChapterStore.setState({ contentRevision: 0 });
  });

  it("bumpContentRevision이 contentRevision을 1씩 증가시킨다", () => {
    expect(useChapterStore.getState().contentRevision).toBe(0);
    useChapterStore.getState().bumpContentRevision();
    expect(useChapterStore.getState().contentRevision).toBe(1);
    useChapterStore.getState().bumpContentRevision();
    expect(useChapterStore.getState().contentRevision).toBe(2);
  });

  it("기존 상태 필드를 덮어쓰지 않는다", () => {
    useChapterStore.setState({ items: [] });
    useChapterStore.getState().bumpContentRevision();
    expect(useChapterStore.getState().items).toEqual([]);
    expect(useChapterStore.getState().contentRevision).toBe(1);
  });
});