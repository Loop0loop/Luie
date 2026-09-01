// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * SUT: `smartLinkService.findSmartLinks` — 엔티티 이름 → 데코레이션 매칭.
 *
 * 테스트 베이시스: 6차 감사 N20(`js-set-map-lookups` 원리 적용).
 *   `smartLinkService.ts:83`이 `doc.descendants` × `while(pattern.exec)` 이중 루프 안에서
 *   `this.entities.find(item => item.text === matchedText)`를 호출한다. 매치 1건마다
 *   엔티티 배열을 선형 탐색하므로 비용이 (매치 수 × 엔티티 수)로 늘어난다.
 *   `ensureCache`가 이미 `uniqueNames` Set을 만들고 있어 Map 추가가 자연스럽다.
 *
 * WHY 핫패스인가: 이 함수는 에디터 데코레이션 계산 경로이고 본문이 바뀔 때마다 재실행된다.
 *
 * ISTQB 기법
 *   동등분할: 매치 0건 / 1건 / 다건, 캐릭터만 / 용어만 / 혼합
 *   경계값: 엔티티 0개, 이름 중복, 부분 문자열 포함(긴 이름 우선)
 *   계측: 매치당 선형 탐색 발생 여부
 *
 * PROVES: 매치가 올바른 엔티티(id·type)로 해석될 것, 이름 중복 시 기존 우선순위가
 *         유지될 것, 매치마다 배열 선형 탐색을 하지 않을 것.
 * DOES_NOT_PROVE: 실제 ProseMirror 데코레이션 렌더, 엔티티 규모별 실측 지연.
 */

const mocked = vi.hoisted(() => ({
  characters: [] as Array<{ id: string; name: string }>,
  events: [] as Array<{ id: string; name: string }>,
  factions: [] as Array<{ id: string; name: string }>,
  terms: [] as Array<{ id: string; term: string }>,
  /** DecorationSet.create가 받은 데코레이션 속성을 기록한다. */
  created: [] as Array<Record<string, unknown>>,
}));

vi.mock("@tiptap/pm/view", () => ({
  Decoration: {
    inline: (from: number, to: number, attrs: Record<string, unknown>) => ({ from, to, attrs }),
  },
  DecorationSet: {
    empty: { __empty: true },
    create: (_doc: unknown, decorations: Array<{ attrs: Record<string, unknown> }>) => {
      mocked.created = decorations.map((decoration) => decoration.attrs);
      return { decorations };
    },
  },
}));

const makeStore = (getItems: () => unknown[]) => ({
  subscribe: () => () => {},
  getState: () => ({ items: getItems() }),
});

vi.mock("@renderer/features/research/stores/characterStore", () => ({
  useCharacterStore: makeStore(() => mocked.characters),
}));
vi.mock("@renderer/features/research/stores/eventStore", () => ({
  useEventStore: makeStore(() => mocked.events),
}));
vi.mock("@renderer/features/research/stores/factionStore", () => ({
  useFactionStore: makeStore(() => mocked.factions),
}));
vi.mock("@renderer/features/research/stores/termStore", () => ({
  useTermStore: makeStore(() => mocked.terms),
}));
vi.mock("../../src/renderer/src/features/editor/stores/editorStore.js", () => ({
  useEditorStore: makeStore(() => []),
}));
vi.mock("@renderer/features/workspace/stores/uiStore", () => ({
  useUIStore: makeStore(() => []),
}));
vi.mock("@renderer/features/workspace/services/docsPanelService", () => ({
  openDocsRightTab: () => {},
}));
vi.mock("@renderer/features/workspace/services/layoutRegionActions", () => ({
  openEditorBinderTab: () => {},
}));

/** 텍스트 노드 하나로 구성된 최소 ProseMirror doc 대역. */
const makeDoc = (text: string) => ({
  descendants: (callback: (node: unknown, pos: number) => void) => {
    callback({ isText: true, text }, 0);
  },
});

import type * as SmartLinkModule from "../../src/renderer/src/features/editor/services/smartLinkService.js";

let smartLinkService: typeof SmartLinkModule.smartLinkService;

beforeEach(async () => {
  mocked.characters = [];
  mocked.events = [];
  mocked.factions = [];
  mocked.terms = [];
  mocked.created = [];
  vi.resetModules();
  ({ smartLinkService } = await import(
    "../../src/renderer/src/features/editor/services/smartLinkService.js"
  ));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("findSmartLinks 정확성 — 동등분할", () => {
  it("EP1: 캐릭터 이름이 올바른 id·type으로 해석된다", () => {
    mocked.characters = [{ id: "c1", name: "아린" }];

    smartLinkService.findSmartLinks(makeDoc("아린은 걸었다") as never);

    expect(mocked.created).toEqual([
      expect.objectContaining({ "data-type": "character", "data-id": "c1" }),
    ]);
  });

  it("EP2: 용어가 올바른 id·type으로 해석된다", () => {
    mocked.terms = [{ id: "t1", term: "결계술" }];

    smartLinkService.findSmartLinks(makeDoc("결계술을 썼다") as never);

    expect(mocked.created).toEqual([
      expect.objectContaining({ "data-type": "term", "data-id": "t1" }),
    ]);
  });

  it("EP3: 캐릭터와 용어가 섞여도 각각 올바르게 해석된다", () => {
    mocked.characters = [{ id: "c1", name: "아린" }];
    mocked.terms = [{ id: "t1", term: "결계술" }];

    smartLinkService.findSmartLinks(makeDoc("아린이 결계술을 썼다") as never);

    expect(mocked.created).toEqual([
      expect.objectContaining({ "data-type": "character", "data-id": "c1" }),
      expect.objectContaining({ "data-type": "term", "data-id": "t1" }),
    ]);
  });

  it("EP3b: 사건이 올바른 id·type으로 해석된다", () => {
    // 사용자 보고 C2: 사건·세력이 하이라이트되지 않았다. CSS(editor.css:343)와
    // 색상 주입(Editor.tsx:287)은 있었지만 이 서비스가 수집하지 않았다.
    mocked.events = [{ id: "e1", name: "붕괴의 밤" }];

    smartLinkService.findSmartLinks(makeDoc("붕괴의 밤이 시작됐다") as never);

    expect(mocked.created).toEqual([
      expect.objectContaining({ "data-type": "event", "data-id": "e1" }),
    ]);
  });

  it("EP3c: 세력이 올바른 id·type으로 해석된다", () => {
    mocked.factions = [{ id: "f1", name: "검은달" }];

    smartLinkService.findSmartLinks(makeDoc("검은달이 움직였다") as never);

    expect(mocked.created).toEqual([
      expect.objectContaining({ "data-type": "faction", "data-id": "f1" }),
    ]);
  });

  it("EP3d: 네 종류가 한 문장에 섞여도 각각 해석된다", () => {
    mocked.characters = [{ id: "c1", name: "아린" }];
    mocked.events = [{ id: "e1", name: "붕괴의 밤" }];
    mocked.factions = [{ id: "f1", name: "검은달" }];
    mocked.terms = [{ id: "t1", term: "결계술" }];

    smartLinkService.findSmartLinks(
      makeDoc("아린은 붕괴의 밤에 검은달의 결계술을 봤다") as never,
    );

    expect(mocked.created.map((attrs) => attrs["data-type"])).toEqual([
      "character",
      "event",
      "faction",
      "term",
    ]);
  });

  it("EP4: 같은 이름이 여러 번 나오면 매치도 여러 번 생긴다", () => {
    mocked.characters = [{ id: "c1", name: "아린" }];

    smartLinkService.findSmartLinks(makeDoc("아린과 아린") as never);

    expect(mocked.created).toHaveLength(2);
    expect(mocked.created.every((attrs) => attrs["data-id"] === "c1")).toBe(true);
  });

  it("BVA: 엔티티가 없으면 빈 DecorationSet을 준다", () => {
    const result = smartLinkService.findSmartLinks(makeDoc("아무 텍스트") as never);

    expect(mocked.created).toEqual([]);
    expect(result).toEqual({ __empty: true });
  });

  it("BVA: 매치가 없으면 데코레이션이 생기지 않는다", () => {
    mocked.characters = [{ id: "c1", name: "아린" }];

    smartLinkService.findSmartLinks(makeDoc("관계 없는 문장") as never);

    expect(mocked.created).toEqual([]);
  });

  it("BVA: 긴 이름이 짧은 이름보다 먼저 매치된다", () => {
    // ensureCache가 text 길이 내림차순으로 정렬하는 이유다. 부분 문자열이 먼저
    // 매치되면 긴 이름이 쪼개진다.
    mocked.characters = [
      { id: "short", name: "아린" },
      { id: "long", name: "아린도르" },
    ];

    smartLinkService.findSmartLinks(makeDoc("아린도르가 왔다") as never);

    expect(mocked.created).toEqual([
      expect.objectContaining({ "data-id": "long" }),
    ]);
  });

  it("BVA: 이름이 중복되면 캐릭터가 용어보다 우선한다 (기존 우선순위 보존)", () => {
    // 구현이 `.find()`를 쓸 때 정렬된 배열의 첫 항목이 이겼다. Map으로 바꿔도
    // 같은 우선순위가 유지돼야 한다.
    mocked.characters = [{ id: "c1", name: "그림자" }];
    mocked.terms = [{ id: "t1", term: "그림자" }];

    smartLinkService.findSmartLinks(makeDoc("그림자가 스쳤다") as never);

    expect(mocked.created).toEqual([
      expect.objectContaining({ "data-type": "character", "data-id": "c1" }),
    ]);
  });
});

describe("findSmartLinks 매치당 비용", () => {
  it("매치마다 엔티티 배열을 선형 탐색하지 않는다", () => {
    mocked.characters = Array.from({ length: 30 }, (_, index) => ({
      id: `c${index}`,
      name: `인물${index}`,
    }));

    // 캐시를 먼저 채운다. ensureCache 내부의 배열 연산을 계측에서 제외하기 위함이다.
    smartLinkService.findSmartLinks(makeDoc("인물0") as never);

    const findSpy = vi.spyOn(Array.prototype, "find");
    // 스파이 유효성 가드 — 이게 없으면 계측이 무력화돼도 통과한다.
    [1].find((value) => value === 1);
    expect(findSpy).toHaveBeenCalledTimes(1);
    findSpy.mockClear();

    // 매치 10건을 만든다.
    const text = Array.from({ length: 10 }, (_, index) => `인물${index}`).join(" ");
    smartLinkService.findSmartLinks(makeDoc(text) as never);

    // `.find()`가 매치 수만큼 호출되면 비용이 (매치 × 엔티티)로 늘어난다.
    expect(findSpy).toHaveBeenCalledTimes(0);
    findSpy.mockRestore();
  });
});
