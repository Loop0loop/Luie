// @vitest-environment jsdom
/**
 * NOTE: `DraggableItem`이 dnd-kit `attributes`를 **스프레드하지 않는다**는 계약을 고정한다.
 *
 * 그 속성에는 `role="button"` + `tabIndex={0}`이 들어 있는데, `GlobalDragContext`가
 * `PointerSensor`만 등록하므로(KeyboardSensor 없음) 그 tabIndex로 할 수 있는 일이 없다.
 * 게다가 dnd-kit은 키보드 활성화 핸들러를 붙이지 않아 Enter가 동작하지 않는다 — 결과적으로
 * "focus는 가는데 조작은 안 되는" stop이 12곳 생기고, 그중 5곳은 내부에 진짜 `<button>`이
 * 있어 tab이 2중으로 걸렸다(§11-9).
 *
 * 무심코 `{...attributes}`를 되살리면 그 12곳이 조용히 돌아온다. 렌더 결과만 봐서는
 * 드러나지 않으므로 여기서 막는다.
 */
import { describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { DndContext } from "@dnd-kit/core";

import { DraggableItem } from "@shared/ui/DraggableItem";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount(className?: string, child?: React.ReactNode) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(
      <DndContext>
        <DraggableItem
          id="row-1"
          data={{ type: "chapter", id: "c1", title: "1장" }}
          className={className}
        >
          {child ?? <span>행</span>}
        </DraggableItem>
      </DndContext>,
    );
  });
  const el = host.firstElementChild as HTMLElement | null;
  if (!el) throw new Error("draggable 행을 찾을 수 없다");
  return {
    el,
    host,
    cleanup: () => {
      act(() => root.unmount());
      host.remove();
    },
  };
}

describe("DraggableItem — tab 순서 계약", () => {
  it("wrapper가 tab 순서에 들어가지 않는다", () => {
    const v = mount();
    expect(v.el.hasAttribute("tabindex")).toBe(false);
    v.cleanup();
  });

  it('조작할 수 없는 role="button"을 노출하지 않는다', () => {
    // WHY: dnd-kit이 붙이는 role="button"은 Enter로 활성화되지 않으므로 스크린리더에
    // 오정보가 된다. 실제 동작은 내부 요소가 담당한다.
    const v = mount();
    expect(v.el.getAttribute("role")).toBeNull();
    v.cleanup();
  });

  it("내부에 button이 있어도 tab stop이 하나만 생긴다", () => {
    const v = mount(undefined, <button type="button">열기</button>);
    const stops = v.host.querySelectorAll(
      'button, a[href], input, [tabindex]:not([tabindex="-1"])',
    );
    expect(stops).toHaveLength(1);
    expect(stops[0].tagName).toBe("BUTTON");
    v.cleanup();
  });

  it("소비처 className과 드래그 중 스타일을 유지한다", () => {
    const v = mount("px-4 py-1.5 border-l-2 border-transparent");
    expect(v.el.className).toContain("px-4");
    expect(v.el.className).toContain("border-l-2");
    v.cleanup();
  });
});
