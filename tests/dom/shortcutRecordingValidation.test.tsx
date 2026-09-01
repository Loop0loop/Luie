// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Command } from "lucide-react";

/**
 * SUT: `ShortcutsTab` — 단축키 기록 경로의 입력 검증.
 *
 * 테스트 베이시스: 6차 감사 결함 D1의 근원. `useShortcuts` 쪽 방어(이미 저장된 값을
 * 무시)는 자기 치유용이고, 애초에 무효한 값이 저장되지 않게 막는 것은 이 화면의 몫이다.
 * 두 층을 모두 고정해야 한 층이 회귀해도 사용자가 깨진 상태에 빠지지 않는다.
 *
 * ISTQB 기법
 *   상태전이: 기록 대기 → 기록 중 → (유효)커밋 / (무효)기록 중 유지 / (Escape)취소
 *   동등분할: 수정자 포함 조합 / 수정자 없는 인쇄 문자 / 기능키 / 수정자 단독 입력
 *
 * PROVES: 수정자 없는 인쇄 문자가 커밋되지 않을 것, 그때 사용자에게 이유가 보일 것,
 *         유효 조합은 정상 커밋될 것, 기능키 단독은 허용될 것.
 * DOES_NOT_PROVE: 커밋 이후 main 영속화, 충돌 표시의 시각 배치.
 */

import { ShortcutsTab } from "../../src/renderer/src/features/settings/components/tabs/ShortcutsTab.js";

const SHORTCUT_GROUPS = {
  app: [
    { id: "app.openSettings", labelKey: "settings.shortcuts.openSettings" },
    { id: "window.toggleFullscreen", labelKey: "settings.shortcuts.toggleFullscreen" },
  ],
} as never;

/** i18n을 흉내지 않고 키를 그대로 돌려줘, 어떤 문구가 떴는지 키로 검증한다. */
const t = ((key: string) => key) as never;

let container: HTMLDivElement;
let root: Root;
let onCommitShortcuts: ReturnType<typeof vi.fn>;

const renderTab = (shortcutValues: Record<string, string>) => {
  act(() =>
    root.render(
      <ShortcutsTab
        t={t}
        shortcutGroups={SHORTCUT_GROUPS}
        shortcutValues={shortcutValues}
        shortcutDefaults={shortcutValues}
        isSaving={false}
        onCommitShortcuts={onCommitShortcuts}
        onResetShortcuts={vi.fn()}
        getShortcutGroupLabel={(key) => key}
        getShortcutGroupIcon={() => Command}
      />,
    ),
  );
};

/** 액션 행의 기록 버튼을 눌러 기록 모드로 들어간다. */
const startRecording = (label: string) => {
  const button = container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  if (!button) throw new Error(`기록 버튼을 찾지 못했다: ${label}`);
  act(() => button.click());
};

const pressKey = (
  key: string,
  mods: { meta?: boolean; ctrl?: boolean; shift?: boolean; alt?: boolean } = {},
) => {
  act(() => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key,
        metaKey: Boolean(mods.meta),
        ctrlKey: Boolean(mods.ctrl),
        shiftKey: Boolean(mods.shift),
        altKey: Boolean(mods.alt),
        bubbles: true,
        cancelable: true,
      }),
    );
  });
};

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  onCommitShortcuts = vi.fn();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

describe("ShortcutsTab 기록 검증 — 상태전이", () => {
  it("S1: 수정자 없는 콤마는 커밋되지 않고 이유가 표시된다", () => {
    renderTab({ "app.openSettings": "cmd+comma", "window.toggleFullscreen": "f11" });
    startRecording("settings.shortcuts.openSettings");

    pressKey(",");

    // 이 값이 저장되면 집필 중 콤마 입력마다 설정이 열린다.
    expect(onCommitShortcuts).not.toHaveBeenCalled();
    expect(container.textContent).toContain("settings.shortcuts.needsModifier");
  });

  it("S2: 거부 후에도 기록 모드가 유지돼 바로 다시 시도할 수 있다", () => {
    renderTab({ "app.openSettings": "cmd+comma", "window.toggleFullscreen": "f11" });
    startRecording("settings.shortcuts.openSettings");

    pressKey(",");
    expect(onCommitShortcuts).not.toHaveBeenCalled();

    // 기록 모드가 풀렸다면 이 입력은 무시된다.
    pressKey(",", { meta: true });

    expect(onCommitShortcuts).toHaveBeenCalledTimes(1);
    expect(onCommitShortcuts.mock.calls[0][0]).toMatchObject({
      "app.openSettings": "cmd+comma",
    });
  });

  it("S3: 유효 조합은 정상 커밋된다 (Cmd+K)", () => {
    renderTab({ "app.openSettings": "cmd+comma", "window.toggleFullscreen": "f11" });
    startRecording("settings.shortcuts.openSettings");

    pressKey("k", { meta: true });

    expect(onCommitShortcuts).toHaveBeenCalledTimes(1);
    expect(onCommitShortcuts.mock.calls[0][0]).toMatchObject({
      "app.openSettings": "cmd+k",
    });
  });

  it("S4: 기능키 단독은 허용된다 (F11 — 무수정자가 정당한 부류)", () => {
    renderTab({ "app.openSettings": "cmd+comma", "window.toggleFullscreen": "f11" });
    startRecording("settings.shortcuts.toggleFullscreen");

    pressKey("F11");

    expect(onCommitShortcuts).toHaveBeenCalledTimes(1);
    expect(onCommitShortcuts.mock.calls[0][0]).toMatchObject({
      "window.toggleFullscreen": "f11",
    });
  });

  it("S5: Escape는 기록을 취소하고 거부 문구를 지운다", () => {
    renderTab({ "app.openSettings": "cmd+comma", "window.toggleFullscreen": "f11" });
    startRecording("settings.shortcuts.openSettings");

    pressKey(",");
    expect(container.textContent).toContain("settings.shortcuts.needsModifier");

    pressKey("Escape");

    expect(container.textContent).not.toContain("settings.shortcuts.needsModifier");
    expect(onCommitShortcuts).not.toHaveBeenCalled();
  });

  it("S6: 수정자 단독 입력은 기록을 종료시키지 않는다", () => {
    renderTab({ "app.openSettings": "cmd+comma", "window.toggleFullscreen": "f11" });
    startRecording("settings.shortcuts.openSettings");

    // 사용자는 Cmd를 먼저 누르고 문자를 나중에 누른다. 그 사이에 기록이
    // 끝나버리면 조합을 입력할 수 없다.
    pressKey("Meta", { meta: true });
    pressKey("Shift", { meta: true, shift: true });
    pressKey("k", { meta: true, shift: true });

    expect(onCommitShortcuts).toHaveBeenCalledTimes(1);
    expect(onCommitShortcuts.mock.calls[0][0]).toMatchObject({
      "app.openSettings": "cmd+shift+k",
    });
  });

  it("S7: 수정자 없는 알파벳도 거부된다 (등가분할 확인)", () => {
    renderTab({ "app.openSettings": "cmd+comma", "window.toggleFullscreen": "f11" });
    startRecording("settings.shortcuts.openSettings");

    pressKey("b");

    expect(onCommitShortcuts).not.toHaveBeenCalled();
  });

  it("S8: Shift만으로는 허용되지 않는다 (대문자는 여전히 본문 입력)", () => {
    renderTab({ "app.openSettings": "cmd+comma", "window.toggleFullscreen": "f11" });
    startRecording("settings.shortcuts.openSettings");

    pressKey("B", { shift: true });

    expect(onCommitShortcuts).not.toHaveBeenCalled();
  });

  it("S8b: `=` 키 기록이 plus 토큰으로 저장된다", () => {
    // macOS에서 Shift 없이 `=`/`+` 물리 키를 누르면 e.key가 "="다. 사용자는 "+"로
    // 인식하므로 저장 표기를 하나로 모아야 표시와 어긋나지 않는다.
    renderTab({ "app.openSettings": "cmd+comma", "window.toggleFullscreen": "f11" });
    startRecording("settings.shortcuts.openSettings");

    pressKey("=", { meta: true });

    expect(onCommitShortcuts).toHaveBeenCalledTimes(1);
    expect(onCommitShortcuts.mock.calls[0][0]).toMatchObject({
      "app.openSettings": "cmd+plus",
    });
  });
});

describe("ShortcutsTab 충돌 감지 — 표기가 달라도 같은 조합을 잡는다", () => {
  it("S9: `Cmd+,`와 `cmd+comma`가 충돌로 표시된다", () => {
    // main 기본값은 `Cmd+,`를 만들고 이 화면의 기록은 `cmd+comma`를 만든다.
    // 원시 문자열 비교로는 두 값이 달라 충돌이 잡히지 않고, 실제로는 등록 순서가
    // 빠른 한쪽만 발화한다.
    renderTab({ "app.openSettings": "Cmd+,", "window.toggleFullscreen": "cmd+comma" });

    const warnings = container.textContent ?? "";
    expect(warnings).toContain("settings.shortcuts.conflict");
  });

  it("S10: 수정자 순서만 다른 두 값도 충돌로 표시된다", () => {
    renderTab({
      "app.openSettings": "cmd+shift+b",
      "window.toggleFullscreen": "shift+cmd+b",
    });

    expect(container.textContent ?? "").toContain("settings.shortcuts.conflict");
  });

  it("S11: 서로 다른 조합은 충돌로 표시되지 않는다 (오탐 방지)", () => {
    renderTab({ "app.openSettings": "cmd+comma", "window.toggleFullscreen": "f11" });

    expect(container.textContent ?? "").not.toContain("settings.shortcuts.conflict");
  });

  it("S12: 빈 값이 여러 개여도 충돌로 표시되지 않는다 (BVA)", () => {
    renderTab({ "app.openSettings": "", "window.toggleFullscreen": "" });

    expect(container.textContent ?? "").not.toContain("settings.shortcuts.conflict");
  });
});

describe("ShortcutsTab 표시 — canonical 표기를 사람이 읽는 형태로 되돌린다", () => {
  /**
   * WHY 이 블록이 필요한가: 기본값을 canonical(소문자·이름 토큰)로 바꾸면 표시 계층이
   * 그대로 `f11`·`comma`를 노출할 위험이 있다. 저장 표기와 표시 표기를 분리해 고정한다.
   */
  const kbdTexts = () =>
    [...container.querySelectorAll("kbd")].map((node) => node.textContent ?? "");

  it("D1: 기능키는 대문자로 표시된다 (f11 → F11)", () => {
    renderTab({ "app.openSettings": "cmd+comma", "window.toggleFullscreen": "f11" });

    expect(kbdTexts()).toContain("F11");
    expect(kbdTexts()).not.toContain("f11");
  });

  it("D2: 콤마 토큰은 구두점으로 표시된다 (comma → ,)", () => {
    renderTab({ "app.openSettings": "cmd+comma", "window.toggleFullscreen": "f11" });

    expect(kbdTexts()).toContain(",");
    expect(kbdTexts()).not.toContain("comma");
  });

  it("D3: 이름 있는 키는 기호로 표시된다 (backspace → ⌫)", () => {
    renderTab({ "app.openSettings": "cmd+backspace", "window.toggleFullscreen": "f11" });

    expect(kbdTexts()).toContain("⌫");
    expect(kbdTexts()).not.toContain("backspace");
  });

  it("D4: 단일 문자 키는 대문자로 표시된다 (b → B)", () => {
    renderTab({ "app.openSettings": "cmd+b", "window.toggleFullscreen": "f11" });

    expect(kbdTexts()).toContain("B");
  });

  it("D5: 빈 값은 안내 문구를 보여준다", () => {
    renderTab({ "app.openSettings": "", "window.toggleFullscreen": "f11" });

    expect(container.textContent ?? "").toContain("settings.shortcuts.empty");
  });

  it("D6: plus 토큰은 `+`로 표시된다 (저장 표기 노출 방지)", () => {
    renderTab({ "app.openSettings": "cmd+plus", "window.toggleFullscreen": "f11" });

    expect(kbdTexts()).toContain("+");
    expect(kbdTexts()).not.toContain("plus");
  });
});
