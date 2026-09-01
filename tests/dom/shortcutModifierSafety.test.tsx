// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * SUT: `useShortcuts` — accelerator 문자열 → 실제 keydown 매칭 계약.
 *
 * 테스트 베이시스: 6차 감사에서 확정한 단축키 결함 3건.
 *   D1 `ShortcutsTab.tsx:207-214`가 수정자 없는 단일 인쇄 문자를 그대로 저장한다.
 *      `app.openSettings`는 `ALLOW_IN_EDITORS`에 있으나 `REQUIRE_PRIMARY_MODIFIER`에는
 *      없어서, 저장된 값이 `comma`가 되면 집필 중 콤마 입력마다 설정이 열린다.
 *   D2 main 기본값은 `Cmd+,`(리터럴 구두점), 기록 결과는 `cmd+comma`(토큰)라
 *      같은 물리 조합이 서로 다른 문자열로 공존한다. canonical form이 없다.
 *   D3 `parseAccelerator`가 `split("+")` + `filter(Boolean)`이라
 *      `+` 자체를 키로 쓰는 accelerator(`cmd++`)는 키가 소실돼 영구히 죽는다.
 *
 * WHY 이 스위트가 필요한가: 단축키는 전역 keydown이라 오작동이 집필 본문을 침해한다.
 * `useShortcuts.ts:26`의 WARNING 주석이 이미 "저장된 shortcut이 손상돼도 plain key로
 * 앱이 종료되지 않도록" 파괴적 동작만 보호한다고 선언했다. 즉 이 결함 계열은 이미
 * 인지됐고 42개 편집 허용 액션 중 2개만 막혀 있다. 나머지 40개의 계약을 표로 고정한다.
 *
 * 조건
 *   C1 accelerator가 primary modifier(cmd/ctrl)를 포함
 *   C2 accelerator의 키가 인쇄 가능한 단일 문자(`,` `b`)인가 vs 기능키(`f11`)
 *   C3 이벤트 발생 위치가 편집 영역(contentEditable)
 *   C4 액션이 REQUIRE_PRIMARY_MODIFIER 소속
 * 동작
 *   A1 핸들러 호출됨
 *
 * PROVES: 수정자 없는 인쇄 문자 바인딩이 집필을 침해하지 않을 것, 표기 등가성
 *         (`Cmd+,` ≡ `cmd+comma`), `+` 키 바인딩 생존, 기능키의 무수정자 정당성.
 * DOES_NOT_PROVE: ShortcutsTab의 기록 UI 자체(별도 스위트), main의 accelerator 영속화.
 */

import type * as UseShortcutsModule from "../../src/renderer/src/features/workspace/hooks/useShortcuts.js";

const mocked = vi.hoisted(() => ({
  shortcuts: {} as Record<string, string>,
}));

vi.mock("../../src/renderer/src/features/workspace/stores/shortcutStore.js", () => ({
  useShortcutStore: (selector: (state: { shortcuts: Record<string, string> }) => unknown) =>
    selector({ shortcuts: mocked.shortcuts }),
}));

let useShortcuts: typeof UseShortcutsModule.useShortcuts;

let container: HTMLDivElement;
let root: Root;
/** NOTE: 집필 중 입력을 재현하려면 event.target이 contentEditable 엘리먼트여야 한다. */
let editableTarget: HTMLDivElement;
/**
 * WARNING: 비편집 대상은 반드시 input/textarea/select가 아닌 태그여야 한다.
 * `isEditableTarget`이 그 세 태그를 편집 대상으로 판정하므로, input을 쓰면
 * ALLOW_IN_EDITORS 비소속 액션이 '정당하게' 차단돼 테스트가 엉뚱한 이유로 실패한다.
 */
let plainTarget: HTMLDivElement;

beforeEach(async () => {
  ({ useShortcuts } = await import(
    "../../src/renderer/src/features/workspace/hooks/useShortcuts.js"
  ));

  mocked.shortcuts = {};

  container = document.createElement("div");
  document.body.appendChild(container);

  editableTarget = document.createElement("div");
  // NOTE: jsdom은 isContentEditable을 구현하지 않아 명시적으로 정의한다.
  Object.defineProperty(editableTarget, "isContentEditable", {
    value: true,
    configurable: true,
  });
  document.body.appendChild(editableTarget);

  plainTarget = document.createElement("div");
  Object.defineProperty(plainTarget, "isContentEditable", {
    value: false,
    configurable: true,
  });
  document.body.appendChild(plainTarget);

  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  editableTarget.remove();
  plainTarget.remove();
  vi.resetModules();
});

interface DispatchOptions {
  key: string;
  meta?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  /** true면 편집 영역(집필 중)에서 발생한 입력으로 취급한다. */
  inEditor?: boolean;
}

function Harness({ handlers }: { handlers: Record<string, () => void> }) {
  useShortcuts(handlers);
  return null;
}

const mount = (handlers: Record<string, () => void>) => {
  act(() => root.render(<Harness handlers={handlers} />));
};

const press = ({ key, meta, ctrl, shift, alt, inEditor }: DispatchOptions) => {
  const target = inEditor ? editableTarget : plainTarget;
  act(() => {
    target.dispatchEvent(
      new KeyboardEvent("keydown", {
        key,
        metaKey: Boolean(meta),
        ctrlKey: Boolean(ctrl),
        shiftKey: Boolean(shift),
        altKey: Boolean(alt),
        bubbles: true,
        cancelable: true,
      }),
    );
  });
};

describe("useShortcuts 안전성 결정표 — 수정자 없는 인쇄 문자 바인딩", () => {
  it("R1: 집필 중 콤마 입력이 설정을 열지 않는다 (accelerator=comma, 수정자 없음)", () => {
    mocked.shortcuts = { "app.openSettings": "comma" };
    const openSettings = vi.fn();
    mount({ "app.openSettings": openSettings });

    press({ key: ",", inEditor: true });

    // 수정자 없는 인쇄 문자는 집필 입력과 구분되지 않으므로 발화해서는 안 된다.
    expect(openSettings).not.toHaveBeenCalled();
  });

  it("R2: 편집 영역 밖에서도 수정자 없는 콤마 바인딩은 발화하지 않는다", () => {
    mocked.shortcuts = { "app.openSettings": "comma" };
    const openSettings = vi.fn();
    mount({ "app.openSettings": openSettings });

    press({ key: ",", inEditor: false });

    // 저장된 값 자체가 무효한 바인딩이다. 위치와 무관하게 거부돼야 한다.
    expect(openSettings).not.toHaveBeenCalled();
  });

  it("R3: 집필 중 Cmd+콤마는 설정을 연다 (토큰 표기 cmd+comma)", () => {
    mocked.shortcuts = { "app.openSettings": "cmd+comma" };
    const openSettings = vi.fn();
    mount({ "app.openSettings": openSettings });

    press({ key: ",", meta: true, inEditor: true });

    expect(openSettings).toHaveBeenCalledTimes(1);
  });

  it("R4: main 기본 표기 `Cmd+,`도 동일하게 발화한다 (표기 등가성)", () => {
    // settingsDefaults.ts:67이 생성하는 실제 기본값 형태다.
    mocked.shortcuts = { "app.openSettings": "Cmd+," };
    const openSettings = vi.fn();
    mount({ "app.openSettings": openSettings });

    press({ key: ",", meta: true, inEditor: true });

    expect(openSettings).toHaveBeenCalledTimes(1);
  });

  it("R5: 기능키는 수정자 없이도 발화한다 (F11 — 무수정자가 정당한 부류)", () => {
    mocked.shortcuts = { "window.toggleFullscreen": "F11" };
    const toggleFullscreen = vi.fn();
    mount({ "window.toggleFullscreen": toggleFullscreen });

    press({ key: "F11", inEditor: true });

    // 수정자 없는 바인딩을 일괄 금지하면 이 케이스가 깨진다. 금지 대상은
    // '인쇄 가능한 단일 문자'로 한정돼야 한다.
    expect(toggleFullscreen).toHaveBeenCalledTimes(1);
  });

  it("R6: BVA 하한 — 빈 accelerator는 어떤 입력에도 발화하지 않는다", () => {
    mocked.shortcuts = { "app.openSettings": "" };
    const openSettings = vi.fn();
    mount({ "app.openSettings": openSettings });

    press({ key: ",", inEditor: false });
    press({ key: ",", meta: true, inEditor: false });

    expect(openSettings).not.toHaveBeenCalled();
  });

  it("R7: `+` 키 바인딩이 소실되지 않는다 (cmd++ → Cmd와 + 동시 입력)", () => {
    mocked.shortcuts = { "editor.fontSize.increase": "cmd++" };
    const increase = vi.fn();
    mount({ "editor.fontSize.increase": increase });

    press({ key: "+", meta: true, inEditor: false });

    // split("+") + filter(Boolean)이 키를 지워버리면 이 단축키는 영구히 죽는다.
    expect(increase).toHaveBeenCalledTimes(1);
  });

  it("R8: 회귀 방지 — REQUIRE_PRIMARY_MODIFIER 기존 가드가 유지된다", () => {
    mocked.shortcuts = { "app.quit": "q" };
    const quit = vi.fn();
    mount({ "app.quit": quit });

    press({ key: "q", inEditor: true });

    expect(quit).not.toHaveBeenCalled();
  });
});

describe("useShortcuts 표기 등가성 — 같은 물리 조합은 같게 판정된다", () => {
  /**
   * EP: accelerator 표기 클래스를 등가분할한다.
   *   리터럴 구두점 / 토큰 / 대소문자 혼용 — 셋 다 같은 물리 조합을 가리킨다.
   */
  const equivalentSettingsAccelerators = ["Cmd+,", "cmd+comma", "CMD+Comma", "cmd+,"];

  it.each(equivalentSettingsAccelerators)(
    "accelerator %s 는 Cmd+콤마 입력으로 발화한다",
    (accelerator) => {
      mocked.shortcuts = { "app.openSettings": accelerator };
      const openSettings = vi.fn();
      mount({ "app.openSettings": openSettings });

      press({ key: ",", meta: true, inEditor: true });

      expect(openSettings).toHaveBeenCalledTimes(1);
    },
  );

  it("수정자 순서가 달라도 같게 판정된다 (shift+cmd+b ≡ cmd+shift+b)", () => {
    mocked.shortcuts = { "view.toggleContextPanel": "shift+cmd+b" };
    const toggle = vi.fn();
    mount({ "view.toggleContextPanel": toggle });

    press({ key: "b", meta: true, shift: true, inEditor: false });

    expect(toggle).toHaveBeenCalledTimes(1);
  });
});
