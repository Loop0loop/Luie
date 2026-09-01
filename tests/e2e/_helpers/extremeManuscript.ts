/**
 * 극한 부하 테스트용 원고 생성기.
 *
 * WHY 별도 모듈인가: 기존 `writingLoop.stress.spec.ts`는 `"가".repeat(5000)`으로
 * 본문을 만든다. 길이만 채운 문자열이라 실제 집필 부하와 다르다 — 마크가 없고
 * 스마트링크가 걸릴 이름도 없고 블록 구조도 없다. 그래서 데코레이션 계산, mark 파싱,
 * ProseMirror 노드 수 같은 실제 비용이 측정에 잡히지 않는다.
 *
 * 이 생성기는 다음을 포함한 본문을 만든다.
 *   - 한국어 문학 문장 (문장 길이·문단 구조가 실제 원고에 가깝게)
 *   - 형광펜 mark (`--luie-mark`) 와 글자색 mark (`--luie-ink`) 를 무작위 색으로
 *   - 마크다운 유래 블록: heading, blockquote, list, bold, italic
 *   - 자료의 등장인물·사건 이름을 본문에 심어 스마트링크가 실제로 걸리게
 *
 * WHY seed 기반 난수인가: 부하 테스트는 회차 간 비교가 목적이다. 매번 다른 본문이면
 * 측정값 차이가 코드 변화 때문인지 입력 차이 때문인지 구분할 수 없다.
 */

/** 팔레트는 `features/editor/components/toolbar/constants.ts`와 같은 토큰을 쓴다. */
const HIGHLIGHT_TOKENS = [
  "var(--editor-mark-yellow)",
  "var(--editor-mark-green)",
  "var(--editor-mark-sky)",
  "var(--editor-mark-pink)",
  "var(--editor-mark-orange)",
  "var(--editor-mark-purple)",
  "var(--editor-mark-red)",
  "var(--editor-mark-mint)",
] as const;

const INK_TOKENS = [
  "var(--editor-ink-red)",
  "var(--editor-ink-orange)",
  "var(--editor-ink-yellow)",
  "var(--editor-ink-green)",
  "var(--editor-ink-teal)",
  "var(--editor-ink-blue)",
  "var(--editor-ink-purple)",
  "var(--editor-ink-pink)",
] as const;

/**
 * 한국어 문학 문장 재료.
 *
 * NOTE: 이상 「날개」(1936, 조광)의 문체를 겨냥한 문장들이다. 원작 전문을 그대로 싣지 않은
 * 이유는 두 가지다 — 부하 특성은 어휘가 아니라 문장 길이·문단 구조·마크 밀도가 결정하고,
 * 원문을 기억에 의존해 재현하면 틀린 텍스트를 고정하게 된다. 실제 원문으로 재려면
 * `LUIE_EXTREME_CORPUS_PATH`에 텍스트 파일을 주면 그것을 쓴다.
 */
const SENTENCES = [
  "박제가 되어 버린 천재를 아시오",
  "나는 유쾌하오 이런 때 연애까지가 유쾌하오",
  "육신이 흐느적흐느적하도록 피로했을 때만 정신이 은화처럼 맑소",
  "니코틴이 내 횟배 앓는 뱃속으로 스미면 머릿속에 으레 백지가 준비되는 법이오",
  "그 위에다 나는 위트와 패러독스를 바둑 포석처럼 늘어놓소",
  "나는 또 여인과 생활을 설계하오",
  "연애 기법에마저 서먹서먹해진 지성의 극치를 흘깃 좀 들여다본 일이 있는",
  "그 흉악한 일곱 개의 표정이 나를 향하여 웃고 있었소",
  "나는 그날 밤에 내 아내에게 돈을 주고 왔다는 것을 기억한다",
  "방 안은 어둡고 나는 이불 속에서 종일을 보냈다",
  "햇살이 문틈으로 새어 들어와 먼지 위에 가느다란 금을 그었다",
  "아내는 늘 외출했고 나는 늘 누워 있었다",
  "거울 속의 나는 나와 반대요 그러나 또 참 닮았소",
] as const;

const CONNECTORS = [
  "그리고",
  "그러나",
  "그래서",
  "다만",
  "이윽고",
  "그러자",
] as const;

export interface ExtremeChapterEntity {
  /** 본문에 심을 이름. 스마트링크가 이 이름을 찾아 하이라이트한다. */
  name: string;
}

export interface ExtremeChapterOptions {
  /** 회차 번호(1-based). seed에 섞여 회차별로 다른 본문을 만든다. */
  chapterNumber: number;
  /** 전역 seed. 같은 값이면 같은 본문이 나온다. */
  seed: number;
  /** 목표 문단 수. */
  paragraphs: number;
  /** 본문에 심을 등장인물 이름. */
  characters: readonly ExtremeChapterEntity[];
  /** 본문에 심을 사건 이름. */
  events: readonly ExtremeChapterEntity[];
  /** 문장 중 마크를 입힐 비율(0~1). */
  markRatio?: number;
  /** 문장 재료를 바꿔치기할 때 쓴다(실제 원문으로 재는 경우). */
  corpus?: readonly string[];
}

/**
 * 결정론적 난수. `Math.random()`을 쓰면 회차 간 비교가 불가능해진다.
 * mulberry32 — 짧고 분포가 충분하다.
 */
const createRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const pick = <T>(random: () => number, items: readonly T[]): T =>
  items[Math.floor(random() * items.length)];

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/** 형광펜 mark. `ThemedHighlight`의 renderHTML과 같은 형태여야 파싱된다. */
const withHighlight = (text: string, token: string): string =>
  `<mark style="--luie-mark: ${token}">${text}</mark>`;

/** 글자색 mark. `ThemedColor`의 renderHTML과 같은 형태. */
const withInk = (text: string, token: string): string =>
  `<span style="--luie-ink: ${token}">${text}</span>`;

/**
 * 한 문장을 만든다. 확률에 따라 형광펜·글자색·bold·italic이 겹쳐 붙는다.
 *
 * 겹치는 경우를 허용하는 이유: 실제 원고에서 형광펜 위에 색을 덧입히는 일이 흔하고,
 * 중첩 mark가 ProseMirror 파싱 비용을 가장 많이 만든다.
 */
const buildSentence = (
  random: () => number,
  corpus: readonly string[],
  markRatio: number,
): string => {
  let text = escapeHtml(pick(random, corpus));
  if (random() < 0.35) {
    text = `${pick(random, CONNECTORS)} ${text}`;
  }

  if (random() < markRatio) {
    text = withHighlight(text, pick(random, HIGHLIGHT_TOKENS));
  }
  if (random() < markRatio) {
    text = withInk(text, pick(random, INK_TOKENS));
  }
  if (random() < markRatio * 0.5) {
    text = `<strong>${text}</strong>`;
  }
  if (random() < markRatio * 0.5) {
    text = `<em>${text}</em>`;
  }
  return text;
};

/**
 * 회차 본문 HTML을 만든다.
 *
 * 반환 형태가 HTML인 이유: 챕터 본문은 TipTap이 파싱하는 HTML로 저장된다. 마크다운
 * 문자열을 주면 실제 저장 형태와 달라 파싱 비용이 재현되지 않는다.
 */
export const buildExtremeChapterBody = (options: ExtremeChapterOptions): string => {
  const {
    chapterNumber,
    seed,
    paragraphs,
    characters,
    events,
    markRatio = 0.4,
    corpus = SENTENCES,
  } = options;

  const random = createRandom(seed + chapterNumber * 7919);
  const blocks: string[] = [`<h2>${chapterNumber}회 — 날개</h2>`];

  for (let index = 0; index < paragraphs; index += 1) {
    const sentences: string[] = [];
    const sentenceCount = 3 + Math.floor(random() * 3);

    for (let s = 0; s < sentenceCount; s += 1) {
      sentences.push(buildSentence(random, corpus, markRatio));
    }

    // 스마트링크가 실제로 걸리도록 자료 이름을 문단마다 심는다.
    if (characters.length > 0) {
      const name = escapeHtml(pick(random, characters).name);
      sentences.push(`${name}은 아무 말도 하지 않았다`);
    }
    if (events.length > 0 && random() < 0.6) {
      const name = escapeHtml(pick(random, events).name);
      sentences.push(`${name} 이후로 모든 것이 달라졌다`);
    }

    const paragraph = sentences.join(". ");
    const roll = random();
    if (roll < 0.12) {
      blocks.push(`<blockquote><p>${paragraph}</p></blockquote>`);
    } else if (roll < 0.24) {
      blocks.push(`<ul><li><p>${paragraph}</p></li></ul>`);
    } else if (roll < 0.3) {
      blocks.push(`<h3>${escapeHtml(pick(random, corpus))}</h3>`);
      blocks.push(`<p>${paragraph}</p>`);
    } else {
      blocks.push(`<p>${paragraph}</p>`);
    }
  }

  return blocks.join("");
};

/** 자료 시드. 스마트링크가 걸릴 이름을 만든다. */
export const buildExtremeEntities = (
  count: number,
  kind: "character" | "event",
): ExtremeChapterEntity[] => {
  const characterNames = ["이상", "금홍", "아내", "박제사", "연이", "정희"];
  const eventNames = ["열아홉 번째 밤", "거울의 균열", "미쓰코시 옥상", "날개의 재생"];
  const pool = kind === "character" ? characterNames : eventNames;

  return Array.from({ length: count }, (_, index) => ({
    // 이름이 겹치면 스마트링크의 first-wins 규칙 때문에 한쪽만 걸린다. 접미사로 구분한다.
    name: `${pool[index % pool.length]}${index >= pool.length ? `-${index}` : ""}`,
  }));
};
