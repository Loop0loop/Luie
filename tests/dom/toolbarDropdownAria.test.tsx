// @vitest-environment jsdom
/**
 * NOTE: 툴바 드롭다운은 네이티브 `<select>`가 아니라 button + div로 만든 커스텀 select다.
 * role·화살표 키 이동이 없으면 스크린리더와 키보드에 아무것도 전달되지 않는데, 그건
 * 렌더 결과만 봐서는 드러나지 않는다(§11-5). ARIA APG의 select-only combobox 계약을
 * 단정으로 고정해 재발을 막는다.
 */
import { describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";

import { CompactDropdown } from "@renderer/features/editor/components/toolbar/menus";

// NOTE: 다른 dom 테스트와 같은 방식. 없으면 act(...) 경고가 쏟아진다.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const FONT_SIZES = [10, 12, 14, 16] as const;

function mount(onChange: (v: number) => void, value = 12) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(
      <CompactDropdown<number>
        options={FONT_SIZES}
        value={value}
        onChange={onChange}
        getLabel={(v) => `${v}pt`}
        aria-label="크기"
      />,
    );
  });
  const combobox = host.querySelector<HTMLButtonElement>('[role="combobox"]');
  if (!combobox) throw new Error("combobox를 찾을 수 없다");
  return {
    host,
    combobox,
    listbox: () => host.querySelector<HTMLElement>('[role="listbox"]'),
    options: () => Array.from(host.querySelectorAll<HTMLElement>('[role="option"]')),
    press: (key: string) => {
      act(() => {
        combobox.dispatchEvent(
          new KeyboardEvent("keydown", { key, bubbles: true }),
        );
      });
    },
    cleanup: () => {
      act(() => root.unmount());
      host.remove();
    },
  };
}

describe("CompactDropdown — select-only combobox 계약", () => {
  it("닫힌 상태에서 combobox role과 관계 속성을 노출한다", () => {
    const v = mount(() => {});
    expect(v.combobox.getAttribute("aria-haspopup")).toBe("listbox");
    expect(v.combobox.getAttribute("aria-expanded")).toBe("false");
    // NOTE: aria-controls는 닫혀 있어도 유지한다. 참조 대상 id가 고정이라야 한다.
    expect(v.combobox.getAttribute("aria-controls")).toBeTruthy();
    // 닫혀 있으면 활성 항목이 없다 — 없는 요소를 가리키면 안 된다.
    expect(v.combobox.getAttribute("aria-activedescendant")).toBeNull();
    expect(v.listbox()).toBeNull();
    v.cleanup();
  });

  it("aria-controls가 실제 listbox의 id를 가리킨다", () => {
    const v = mount(() => {});
    v.press("ArrowDown");
    expect(v.combobox.getAttribute("aria-expanded")).toBe("true");
    expect(v.listbox()?.id).toBe(v.combobox.getAttribute("aria-controls"));
    v.cleanup();
  });

  it("현재 값을 aria-selected로, 커서 위치를 aria-activedescendant로 알린다", () => {
    const v = mount(() => {}, 12);
    v.press("ArrowDown");
    const options = v.options();
    expect(options).toHaveLength(FONT_SIZES.length);
    // value=12 → index 1이 선택 상태이고 커서도 거기서 시작한다.
    expect(options.map((o) => o.getAttribute("aria-selected"))).toEqual([
      "false",
      "true",
      "false",
      "false",
    ]);
    expect(v.combobox.getAttribute("aria-activedescendant")).toBe(options[1].id);
    v.cleanup();
  });

  it("화살표로 커서가 움직이고 경계에서 멈춘다", () => {
    const v = mount(() => {}, 12);
    v.press("ArrowDown"); // 열기 (index 1)
    v.press("ArrowDown"); // → 2
    expect(v.combobox.getAttribute("aria-activedescendant")).toBe(v.options()[2].id);
    v.press("End");
    expect(v.combobox.getAttribute("aria-activedescendant")).toBe(v.options()[3].id);
    v.press("ArrowDown"); // 끝에서 더 내려가지 않는다
    expect(v.combobox.getAttribute("aria-activedescendant")).toBe(v.options()[3].id);
    v.press("Home");
    expect(v.combobox.getAttribute("aria-activedescendant")).toBe(v.options()[0].id);
    v.press("ArrowUp"); // 처음에서 더 올라가지 않는다
    expect(v.combobox.getAttribute("aria-activedescendant")).toBe(v.options()[0].id);
    v.cleanup();
  });

  it("Enter로 활성 항목을 확정하고 닫는다", () => {
    const picked: number[] = [];
    const v = mount((n) => picked.push(n), 12);
    v.press("ArrowDown"); // 열기 (index 1 = 12)
    v.press("ArrowDown"); // index 2 = 14
    v.press("Enter");
    expect(picked).toEqual([14]);
    expect(v.combobox.getAttribute("aria-expanded")).toBe("false");
    v.cleanup();
  });

  it("Escape로 닫히고 값을 바꾸지 않는다", () => {
    const picked: number[] = [];
    const v = mount((n) => picked.push(n), 12);
    v.press("ArrowDown");
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(v.combobox.getAttribute("aria-expanded")).toBe("false");
    expect(picked).toEqual([]);
    v.cleanup();
  });

  it("닫힌 동안에는 Escape 리스너가 붙지 않는다", () => {
    // WHY: Escape 처리는 stopPropagation이 필요한데, 닫힌 상태에서도 리스너가 살아 있으면
    // 에디터의 Escape를 앱 전역에서 삼킨다.
    const v = mount(() => {});
    let reachedApp = false;
    const appHandler = () => {
      reachedApp = true;
    };
    document.addEventListener("keydown", appHandler);
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(reachedApp).toBe(true);
    document.removeEventListener("keydown", appHandler);
    v.cleanup();
  });
});
