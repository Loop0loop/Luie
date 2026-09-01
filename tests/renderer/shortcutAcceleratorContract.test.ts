import { describe, expect, it } from "vitest";

/**
 * SUT: `@shared/utils/shortcutAccelerator` — accelerator 문자열의 단일 해석 지점.
 *
 * 테스트 베이시스: 6차 감사에서 확정한 단축키 결함 3건과, 그 결함이 세 곳(main 기본값
 * 생성 / renderer 기록 / renderer 매칭)에 흩어진 해석 로직에서 나왔다는 진단.
 *
 * ISTQB 기법 적용
 *   동등분할(EP): accelerator 표기를 부류로 나눈다 — 리터럴 구두점 / 이름 토큰 /
 *     대소문자 혼용 / 수정자 별칭(cmd·command·meta) / 수정자 순서 / 기능키 / 무효값
 *   경계값(BVA): 빈 문자열, 공백만, 수정자만, 키만, `+` 단독, 최대 수정자 4개
 *   결정표: validateAccelerator의 (인쇄가능 키) × (primary modifier 유무)
 *   페어와이즈: canonicalize의 수정자 조합 등가성
 *
 * PROVES: 같은 물리 조합이 표기와 무관하게 같은 canonical 값·같은 매칭 결과를 낼 것,
 *         수정자 없는 인쇄 문자 바인딩이 거부될 것, `+` 키가 파싱에서 살아남을 것.
 * DOES_NOT_PROVE: 실제 OS 키보드 레이아웃별 `event.key` 값(브라우저 계약에 의존).
 */

import {
  canonicalizeAccelerator,
  findAcceleratorConflicts,
  isPrintableShortcutKey,
  matchesAccelerator,
  normalizeShortcutKey,
  parseAccelerator,
  validateAccelerator,
} from "@shared/utils/shortcutAccelerator";

const keyEvent = (
  key: string,
  mods: { meta?: boolean; ctrl?: boolean; shift?: boolean; alt?: boolean } = {},
) => ({
  key,
  metaKey: Boolean(mods.meta),
  ctrlKey: Boolean(mods.ctrl),
  shiftKey: Boolean(mods.shift),
  altKey: Boolean(mods.alt),
});

describe("normalizeShortcutKey — 물리 키를 canonical 토큰으로 접는다", () => {
  it.each([
    [",", "comma"],
    ["comma", "comma"],
    ["COMMA", "comma"],
    [" ", "space"],
    ["space", "space"],
    ["+", "plus"],
    ["plus", "plus"],
    ["=", "plus"],
    ["B", "b"],
    ["F11", "f11"],
    ["ArrowUp", "arrowup"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeShortcutKey(input)).toBe(expected);
  });

  it("리터럴 표기와 이름 표기가 같은 토큰으로 모인다", () => {
    // 이 등가성이 깨지면 설정 화면의 충돌 감지가 같은 조합을 놓친다.
    expect(normalizeShortcutKey(",")).toBe(normalizeShortcutKey("comma"));
    expect(normalizeShortcutKey("+")).toBe(normalizeShortcutKey("plus"));
    expect(normalizeShortcutKey(" ")).toBe(normalizeShortcutKey("space"));
  });

  it("`=`와 `+`는 같은 물리 키라 같은 토큰이 된다", () => {
    // macOS에서 Shift 없이 그 키를 누르면 e.key가 "="다. 사용자는 "+"를 눌렀다고
    // 인식하므로, 두 표기를 갈라두면 저장값과 표시가 어긋난다.
    expect(normalizeShortcutKey("=")).toBe(normalizeShortcutKey("+"));
    expect(canonicalizeAccelerator("cmd+=")).toBe(canonicalizeAccelerator("cmd++"));
  });
});

describe("parseAccelerator — EP: 표기 부류별 분해", () => {
  it("리터럴 구두점: main 기본값 형태 Cmd+,", () => {
    expect(parseAccelerator("Cmd+,")).toEqual({
      key: "comma",
      cmd: true,
      ctrl: false,
      shift: false,
      alt: false,
    });
  });

  it("이름 토큰: 설정 화면 기록 형태 cmd+comma", () => {
    expect(parseAccelerator("cmd+comma")).toEqual({
      key: "comma",
      cmd: true,
      ctrl: false,
      shift: false,
      alt: false,
    });
  });

  it("수정자 별칭 cmd/command/meta가 같게 해석된다", () => {
    const viaCmd = parseAccelerator("cmd+k");
    expect(parseAccelerator("command+k")).toEqual(viaCmd);
    // WHY meta도 포함하나: Electron/DOM 계열 표기가 metaKey를 "Meta"로 쓴다.
    // 구 useShortcuts는 meta를 수정자로 몰라 키로 오인했고, 그 결과 수정자가
    // 사라져 평문 키로 강등됐다.
    expect(parseAccelerator("meta+k")).toEqual(viaCmd);
  });

  it("option/alt, control/ctrl 별칭이 같게 해석된다", () => {
    expect(parseAccelerator("option+k")).toEqual(parseAccelerator("alt+k"));
    expect(parseAccelerator("control+k")).toEqual(parseAccelerator("ctrl+k"));
  });

  it("수정자 순서가 달라도 같게 해석된다", () => {
    expect(parseAccelerator("shift+cmd+b")).toEqual(parseAccelerator("cmd+shift+b"));
  });

  it("`+` 자체를 키로 쓰는 accelerator에서 키가 소실되지 않는다", () => {
    // 구현이 split("+")를 쓰면 키가 빈 문자열이 돼 단축키가 영구히 죽는다.
    expect(parseAccelerator("cmd++")).toEqual({
      key: "plus",
      cmd: true,
      ctrl: false,
      shift: false,
      alt: false,
    });
  });

  it("기능키는 수정자 없이 해석된다", () => {
    expect(parseAccelerator("F11")).toEqual({
      key: "f11",
      cmd: false,
      ctrl: false,
      shift: false,
      alt: false,
    });
  });

  it("BVA: 수정자 4개를 모두 붙여도 해석된다", () => {
    expect(parseAccelerator("cmd+ctrl+alt+shift+k")).toEqual({
      key: "k",
      cmd: true,
      ctrl: true,
      shift: true,
      alt: true,
    });
  });

  it.each([
    ["빈 문자열", ""],
    ["공백만", "   "],
    ["수정자만", "cmd+shift"],
    ["수정자 하나만", "cmd"],
  ])("BVA 무효값: %s 은 null", (_label, input) => {
    expect(parseAccelerator(input)).toBeNull();
  });
});

describe("validateAccelerator — 결정표: (인쇄가능 키) × (primary modifier)", () => {
  /**
   * C1 키가 인쇄 가능한 단일 문자인가
   * C2 cmd 또는 ctrl을 포함하는가
   * A1 허용
   *
   * | # | C1  | C2  | A1  | 사례            |
   * |---|-----|-----|-----|-----------------|
   * | 1 | Y   | Y   | 허용 | cmd+comma       |
   * | 2 | Y   | N   | 거부 | comma, shift+b  |
   * | 3 | N   | Y   | 허용 | cmd+f11         |
   * | 4 | N   | N   | 허용 | f11, escape     |
   */
  it("규칙1: 인쇄 문자 + primary modifier → 허용", () => {
    expect(validateAccelerator("cmd+comma")).toEqual({ ok: true });
    expect(validateAccelerator("ctrl+b")).toEqual({ ok: true });
  });

  it.each(["comma", ",", "b", "shift+b", "alt+b", "shift+alt+b", "plus", "space"])(
    "규칙2: 인쇄 문자 + primary modifier 없음 → 거부 (%s)",
    (accelerator) => {
      expect(validateAccelerator(accelerator)).toEqual({
        ok: false,
        reason: "printable-without-primary-modifier",
      });
    },
  );

  it("규칙3: 기능키 + primary modifier → 허용", () => {
    expect(validateAccelerator("cmd+f11")).toEqual({ ok: true });
  });

  it.each(["f11", "F11", "escape", "arrowup", "enter", "tab", "backspace"])(
    "규칙4: 이름 있는 키는 수정자 없이도 허용 (%s)",
    (accelerator) => {
      expect(validateAccelerator(accelerator)).toEqual({ ok: true });
    },
  );

  it("BVA: 빈 문자열은 '바인딩 없음'이라 유효하다", () => {
    // settingsDefaults.ts의 기본값 다수가 빈 문자열이다. 이를 거부하면
    // 기본 설정 전체가 무효로 판정된다.
    expect(validateAccelerator("")).toEqual({ ok: true });
    expect(validateAccelerator("   ")).toEqual({ ok: true });
  });

  it("해석 불가한 값은 unparsable로 거부된다", () => {
    expect(validateAccelerator("cmd+shift")).toEqual({ ok: false, reason: "unparsable" });
  });
});

describe("isPrintableShortcutKey — 인쇄 가능 판정", () => {
  it.each(["b", "1", "comma", "space", "plus"])("%s 는 인쇄 가능", (key) => {
    expect(isPrintableShortcutKey(key)).toBe(true);
  });

  it.each(["f11", "escape", "arrowdown", "enter", "backspace", "pageup"])(
    "%s 는 인쇄 불가",
    (key) => {
      expect(isPrintableShortcutKey(key)).toBe(false);
    },
  );
});

describe("canonicalizeAccelerator — 같은 조합은 같은 문자열", () => {
  it("표기가 달라도 canonical 값이 같다 (충돌 감지의 전제)", () => {
    const canonical = canonicalizeAccelerator("cmd+comma");
    expect(canonical).toBe("cmd+comma");
    // 이 네 표기는 모두 Cmd+콤마다. 구 구현은 문자열 비교로 충돌을 판정해
    // 이들을 서로 다른 단축키로 오인했다.
    for (const variant of ["Cmd+,", "CMD+Comma", "cmd+,", "command+comma", "meta+,"]) {
      expect(canonicalizeAccelerator(variant)).toBe(canonical);
    }
  });

  it("수정자 순서를 고정한다", () => {
    expect(canonicalizeAccelerator("shift+cmd+b")).toBe("cmd+shift+b");
    expect(canonicalizeAccelerator("cmd+shift+b")).toBe("cmd+shift+b");
    expect(canonicalizeAccelerator("shift+ctrl+alt+cmd+b")).toBe("cmd+ctrl+alt+shift+b");
  });

  it("canonical 값을 다시 canonicalize해도 불변이다 (멱등)", () => {
    for (const input of ["Cmd+,", "shift+cmd+b", "cmd++", "F11"]) {
      const once = canonicalizeAccelerator(input);
      expect(once).not.toBeNull();
      expect(canonicalizeAccelerator(once as string)).toBe(once);
    }
  });

  it("무효값은 null", () => {
    expect(canonicalizeAccelerator("")).toBeNull();
    expect(canonicalizeAccelerator("cmd+shift")).toBeNull();
  });
});

describe("matchesAccelerator — 이벤트 매칭", () => {
  it("Cmd+콤마 입력이 두 표기 모두와 매칭된다", () => {
    const event = keyEvent(",", { meta: true });
    for (const accelerator of ["Cmd+,", "cmd+comma"]) {
      const parsed = parseAccelerator(accelerator);
      expect(parsed).not.toBeNull();
      expect(matchesAccelerator(event, parsed!)).toBe(true);
    }
  });

  it("수정자가 하나라도 다르면 매칭되지 않는다", () => {
    const parsed = parseAccelerator("cmd+comma")!;
    expect(matchesAccelerator(keyEvent(","), parsed)).toBe(false);
    expect(matchesAccelerator(keyEvent(",", { ctrl: true }), parsed)).toBe(false);
    expect(matchesAccelerator(keyEvent(",", { meta: true, shift: true }), parsed)).toBe(false);
    expect(matchesAccelerator(keyEvent(",", { meta: true, alt: true }), parsed)).toBe(false);
  });

  it("Cmd+B와 Cmd+Shift+B가 서로 오인되지 않는다", () => {
    const toggleSidebar = parseAccelerator("cmd+b")!;
    const toggleContext = parseAccelerator("cmd+shift+b")!;
    const shiftEvent = keyEvent("b", { meta: true, shift: true });

    expect(matchesAccelerator(shiftEvent, toggleSidebar)).toBe(false);
    expect(matchesAccelerator(shiftEvent, toggleContext)).toBe(true);
  });

  it("`+` 키 바인딩이 실제 입력과 매칭된다", () => {
    const parsed = parseAccelerator("cmd++")!;
    expect(matchesAccelerator(keyEvent("+", { meta: true }), parsed)).toBe(true);
  });
});

describe("findAcceleratorConflicts — 같은 조합을 쓰는 액션 쌍", () => {
  it("표기가 달라도 같은 조합이면 충돌로 잡는다", () => {
    // 이 조합이 실제 상황이다. main 기본값과 설정 화면 기록 결과가 섞인다.
    const conflicts = findAcceleratorConflicts({
      "app.openSettings": "Cmd+,",
      "chapter.new": "cmd+comma",
    });

    expect(conflicts.get("app.openSettings")).toBe("chapter.new");
    expect(conflicts.get("chapter.new")).toBe("app.openSettings");
  });

  it("수정자 순서만 다른 경우도 충돌로 잡는다", () => {
    const conflicts = findAcceleratorConflicts({
      "view.toggleContextPanel": "cmd+shift+b",
      "world.tab.graph": "shift+cmd+b",
    });

    expect(conflicts.size).toBe(2);
  });

  it("서로 다른 조합은 충돌이 아니다 (오탐 방지)", () => {
    const conflicts = findAcceleratorConflicts({
      "app.openSettings": "cmd+comma",
      "chapter.new": "cmd+n",
      "window.toggleFullscreen": "f11",
    });

    expect(conflicts.size).toBe(0);
  });

  it("BVA: 빈 값은 서로 충돌하지 않는다", () => {
    // 기본값 다수가 빈 문자열이다. 이를 충돌로 잡으면 화면이 경고로 뒤덮인다.
    const conflicts = findAcceleratorConflicts({
      "view.sidebar.open": "",
      "view.sidebar.close": "",
      "project.rename": "",
    });

    expect(conflicts.size).toBe(0);
  });

  it("BVA: 빈 맵과 단일 항목은 충돌이 없다", () => {
    expect(findAcceleratorConflicts({}).size).toBe(0);
    expect(findAcceleratorConflicts({ "chapter.new": "cmd+n" }).size).toBe(0);
  });

  it("3개 이상이 같은 조합이면 모두 충돌로 표시된다", () => {
    const conflicts = findAcceleratorConflicts({
      a: "cmd+k",
      b: "Cmd+K",
      c: "meta+k",
    });

    expect(conflicts.size).toBe(3);
    // 각자 자신이 아닌 상대를 가리켜야 한다.
    for (const [actionId, other] of conflicts) {
      expect(other).not.toBe(actionId);
    }
  });
});
