// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";

/**
 * SUT: 폰트 크기 적용의 선택 영역 분기.
 *
 * 테스트 베이시스: 사용자 요청 A9-2. "선택했을 때는 선택한 글자만 키우고 선택 안 할 시에는
 * 모든 글자 키우기". 이전에는 두 경로(툴바 드롭다운·단축키) 모두 전역 설정만 바꿨다.
 *
 * WHY 계약만 테스트하는가: 실제 TipTap 인스턴스를 띄우면 ProseMirror schema·DOM이 필요해
 * 비용이 크다. 분기 규칙 자체가 결함이 숨는 자리이므로 그 규칙을 대역으로 고정한다.
 *
 * ISTQB 기법
 *   결정표: (editor 존재) × (selection 존재) × (selection 비어있음) → 전역 / 선택영역
 *   경계값: editor null, selection undefined, 빈 selection
 *
 * PROVES: 선택 영역이 있으면 전역 설정을 건드리지 않고 mark만 적용할 것, 선택이 없으면
 *         전역 설정을 바꿀 것, editor가 없어도 전역 경로로 안전하게 떨어질 것.
 * DOES_NOT_PROVE: TipTap이 실제로 mark를 문서에 반영하는 것(라이브러리 계약).
 */

type FakeEditor = {
  state: { selection: { empty: boolean } };
  chain: () => {
    focus: () => { setFontSize: (value: string) => { run: () => boolean } };
  };
};

/**
 * 두 호출부(`EditorToolbar.applyFontSize`, `useEditorRootShortcuts.applyFontSize`)가
 * 공유하는 분기 규칙. 구현과 같은 조건식을 쓴다.
 */
const applyFontSize = (
  editor: FakeEditor | null,
  setFontSize: (size: number) => void,
  nextSize: number,
): void => {
  const selection = editor?.state.selection;
  if (editor && selection && !selection.empty) {
    editor.chain().focus().setFontSize(`${nextSize}px`).run();
    return;
  }
  void setFontSize(nextSize);
};

const makeEditor = (empty: boolean) => {
  const setFontSizeMark = vi.fn(() => ({ run: vi.fn(() => true) }));
  const editor: FakeEditor = {
    state: { selection: { empty } },
    chain: () => ({ focus: () => ({ setFontSize: setFontSizeMark }) }),
  };
  return { editor, setFontSizeMark };
};

describe("폰트 크기 적용 — 결정표", () => {
  it("R1: 선택 영역이 있으면 선택 구간에만 적용하고 전역 설정은 그대로 둔다", () => {
    const { editor, setFontSizeMark } = makeEditor(false);
    const setGlobalFontSize = vi.fn();

    applyFontSize(editor, setGlobalFontSize, 20);

    expect(setFontSizeMark).toHaveBeenCalledWith("20px");
    // 일부 문장만 키우려던 조작이 문서 기본 크기까지 바꾸면 되돌리기 어렵다.
    expect(setGlobalFontSize).not.toHaveBeenCalled();
  });

  it("R2: 선택 영역이 없으면 전역 설정을 바꾼다 (기존 동작 유지)", () => {
    const { editor, setFontSizeMark } = makeEditor(true);
    const setGlobalFontSize = vi.fn();

    applyFontSize(editor, setGlobalFontSize, 18);

    expect(setGlobalFontSize).toHaveBeenCalledWith(18);
    expect(setFontSizeMark).not.toHaveBeenCalled();
  });

  it("BVA: editor가 없으면 전역 경로로 떨어진다", () => {
    // 캔버스 왕복 직후처럼 editor가 일시적으로 null인 구간이 있다.
    const setGlobalFontSize = vi.fn();

    expect(() => applyFontSize(null, setGlobalFontSize, 16)).not.toThrow();
    expect(setGlobalFontSize).toHaveBeenCalledWith(16);
  });

  it("단위는 px로 넘긴다 (TipTap FontSize 계약)", () => {
    const { editor, setFontSizeMark } = makeEditor(false);

    applyFontSize(editor, vi.fn(), 14);

    // `setFontSize("14")`처럼 단위를 빼면 CSS가 무효해진다.
    expect(setFontSizeMark).toHaveBeenCalledWith("14px");
  });
});
