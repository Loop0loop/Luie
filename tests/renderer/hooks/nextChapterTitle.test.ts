// TEST_LEVEL: UNIT
// PROVES: 생성할 챕터 번호가 기존 제목 집합에서 첫 빈 번호를 찾는다 — 삭제 후 재생성 때
//         기존 챕터와 이름이 겹치던 버그(사용자 보고: "챕터 이름이 중복된다")의 방어선.
// DOES_NOT_PROVE: 휴지통 복원이 만드는 중복(원래 제목으로 복원되므로 별도 정책 과제).

import { describe, expect, it } from "vitest";
import { nextChapterTitle } from "../../../src/renderer/src/features/manuscript/hooks/useChapterManagement.js";

describe("nextChapterTitle deduplication", () => {
  it("continues after the highest existing number", () => {
    expect(nextChapterTitle(["Chapter 1", "Chapter 2"])).toBe("Chapter 3");
  });

  it("fills the first gap left by a deletion instead of colliding", () => {
    // 근거: 1, 2 중 1을 지운 뒤 추가하면 예전 구현은 "Chapter 2"를 재발급해 중복됐다.
    expect(nextChapterTitle(["Chapter 2"])).toBe("Chapter 1");
    expect(nextChapterTitle(["Chapter 1", "Chapter 3"])).toBe("Chapter 2");
  });

  it("ignores renamed titles when picking the next number", () => {
    expect(nextChapterTitle(["서장", "Chapter 1"])).toBe("Chapter 2");
  });

  it("starts at Chapter 1 for an empty manuscript", () => {
    expect(nextChapterTitle([])).toBe("Chapter 1");
  });
});
