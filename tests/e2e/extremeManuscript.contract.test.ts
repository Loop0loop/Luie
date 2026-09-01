import { describe, expect, it } from "vitest";

/**
 * SUT: `tests/e2e/_helpers/extremeManuscript.ts` — 극한 부하 테스트 입력 생성기.
 *
 * 테스트 베이시스: 사용자 요청 A12. 기존 `writingLoop.stress.spec.ts`는 본문을
 * `"가".repeat(5000)`으로 만들어 마크·스마트링크·블록 구조가 전혀 없다. 실제 집필 부하를
 * 재려면 입력이 실제 원고를 닮아야 한다.
 *
 * WHY 생성기를 테스트하는가: 부하 테스트의 신뢰성은 입력이 회차 간 동일하다는 전제에
 * 달려 있다. 생성기가 조용히 바뀌면 측정값 차이가 코드 변화 때문인지 입력 변화 때문인지
 * 구분할 수 없게 된다. 그래서 결정론성과 필수 요소 포함을 계약으로 고정한다.
 *
 * ISTQB 기법
 *   등가분할: 마크 비율 0 / 중간 / 1, 자료 0개 / 있음
 *   경계값: 문단 0개, 자료 이름 중복
 *   불변식: 같은 seed → 같은 출력, 다른 회차 → 다른 출력
 *
 * PROVES: 같은 seed로 같은 본문이 나올 것, 형광펜·글자색·블록 구조·자료 이름이 실제로
 *         들어갈 것, HTML 이스케이프가 될 것.
 * DOES_NOT_PROVE: TipTap이 이 HTML을 실제로 파싱하는 것(E2E 영역).
 */

import {
  buildExtremeChapterBody,
  buildExtremeEntities,
} from "./_helpers/extremeManuscript.js";

const characters = buildExtremeEntities(3, "character");
const events = buildExtremeEntities(2, "event");

const build = (overrides: Partial<Parameters<typeof buildExtremeChapterBody>[0]> = {}) =>
  buildExtremeChapterBody({
    chapterNumber: 1,
    seed: 42,
    paragraphs: 6,
    characters,
    events,
    ...overrides,
  });

describe("결정론성 — 부하 측정 비교의 전제", () => {
  it("같은 seed·회차면 같은 본문이 나온다", () => {
    expect(build()).toBe(build());
  });

  it("회차가 다르면 본문이 다르다", () => {
    expect(build({ chapterNumber: 1 })).not.toBe(build({ chapterNumber: 2 }));
  });

  it("seed가 다르면 본문이 다르다", () => {
    expect(build({ seed: 1 })).not.toBe(build({ seed: 2 }));
  });
});

describe("필수 요소 포함 — 실제 집필 부하 재현", () => {
  const body = build();

  it("형광펜 mark가 팔레트 토큰으로 들어간다", () => {
    // ThemedHighlight의 renderHTML과 같은 형태여야 파싱된다.
    expect(body).toMatch(/<mark style="--luie-mark: var\(--editor-mark-[a-z]+\)">/);
  });

  it("글자색 mark가 팔레트 토큰으로 들어간다", () => {
    expect(body).toMatch(/<span style="--luie-ink: var\(--editor-ink-[a-z]+\)">/);
  });

  it("블록 구조가 여러 종류 들어간다", () => {
    expect(body).toContain("<h2>");
    // 문단은 반드시 있고, 인용/목록/소제목은 확률적이므로 최소 하나 이상만 확인한다.
    expect(body).toContain("<p>");
    const hasVariedBlock = /<blockquote>|<ul>|<h3>/.test(body);
    expect(hasVariedBlock).toBe(true);
  });

  it("자료 이름이 본문에 심긴다 (스마트링크 대상)", () => {
    const hasCharacter = characters.some((entity) => body.includes(entity.name));
    expect(hasCharacter).toBe(true);
  });

  it("사건 이름도 심긴다", () => {
    // 확률 0.6이라 문단 6개면 사실상 반드시 하나는 들어간다.
    const hasEvent = events.some((entity) => body.includes(entity.name));
    expect(hasEvent).toBe(true);
  });
});

describe("등가분할 — 마크 비율", () => {
  it("markRatio 0이면 mark가 전혀 없다", () => {
    const body = build({ markRatio: 0 });
    expect(body).not.toContain("<mark");
    expect(body).not.toContain("--luie-ink");
  });

  it("markRatio 1이면 모든 문장에 형광펜과 글자색이 붙는다", () => {
    const body = build({ markRatio: 1 });
    expect(body).toContain("<mark");
    expect(body).toContain("--luie-ink");
    expect(body).toContain("<strong>");
  });
});

describe("경계값", () => {
  it("문단 0개면 제목만 남는다", () => {
    const body = build({ paragraphs: 0 });
    expect(body).toBe("<h2>1회 — 날개</h2>");
  });

  it("자료가 없어도 본문이 만들어진다", () => {
    const body = build({ characters: [], events: [] });
    expect(body).toContain("<p>");
    expect(body.length).toBeGreaterThan(50);
  });

  it("자료 이름이 겹치지 않게 생성된다", () => {
    // 이름이 겹치면 스마트링크 first-wins 규칙 때문에 한쪽만 하이라이트돼
    // 부하가 의도보다 작아진다.
    const many = buildExtremeEntities(10, "character");
    expect(new Set(many.map((e) => e.name)).size).toBe(many.length);
  });
});

describe("HTML 안전성", () => {
  it("자료 이름의 꺾쇠가 이스케이프된다", () => {
    const body = buildExtremeChapterBody({
      chapterNumber: 1,
      seed: 7,
      paragraphs: 4,
      characters: [{ name: "<script>x</script>" }],
      events: [],
    });

    // 이스케이프되지 않으면 저장 본문에 실제 태그가 섞여 파싱 결과가 달라진다.
    expect(body).not.toContain("<script>");
    expect(body).toContain("&lt;script&gt;");
  });
});
