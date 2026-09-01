// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * SUT: `useShortcuts` — keydown 처리의 단위 비용과 리스너 생애주기.
 *
 * 테스트 베이시스: 6차 감사 N16. 집필 중 모든 키 입력이 이 리스너를 통과한다.
 *   P1 `useShortcuts.ts:120` `Object.entries(shortcuts)`를 keydown마다 재생성한다.
 *   P2 `useShortcuts.ts:127` → `parseAccelerator`(`:15`)가 accelerator를 keydown마다
 *      재파싱한다. accelerator는 `shortcuts`가 바뀔 때만 변하는 정적 값이다.
 *   P3 `useShortcuts.ts:123` `isEditableTarget(event)`를 루프 안에서 호출해
 *      DOM 프로퍼티를 액션 수만큼 반복 읽는다. 이벤트당 1회로 충분하다.
 *   P4 `useShortcuts.ts:137` 의존성에 `handlers`가 있어, 핸들러 맵이 재생성되면
 *      전역 keydown 리스너가 해제·재등록된다. 맵은 `useEditorRootShortcuts.ts:87`의
 *      useMemo이고 그 의존성에 `isSidebarOpen`·`fontSize`가 있다.
 *
 * 계측 방법: `shortcuts` 객체의 값에 getter를 심어 accelerator 읽기 횟수를 세고,
 * target의 `isContentEditable`에 getter를 심어 DOM 읽기 횟수를 센다. 구현이 파싱을
 * 캐시하면 읽기 횟수가 키 입력 수와 무관해진다.
 *
 * PROVES: 키 입력당 비용이 등록된 단축키 수에 비례하지 않을 것, 핸들러 맵 재생성이
 *         전역 리스너 재등록으로 전파되지 않을 것.
 * DOES_NOT_PROVE: 실제 keypress→paint 지연(실측 영역), GC 압력.
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
let editableTarget: HTMLDivElement;

/** accelerator 값 읽기 횟수를 세는 shortcuts 맵을 만든다. */
const countingShortcuts = (entries: Record<string, string>) => {
  const reads = { count: 0 };
  const target: Record<string, string> = {};
  for (const [action, accelerator] of Object.entries(entries)) {
    Object.defineProperty(target, action, {
      enumerable: true,
      configurable: true,
      get() {
        reads.count += 1;
        return accelerator;
      },
    });
  }
  return { shortcuts: target, reads };
};

/** 편집 영역 판정에 쓰이는 DOM 프로퍼티 읽기 횟수를 센다. */
const countingEditableTarget = () => {
  const element = document.createElement("div");
  const reads = { count: 0 };
  Object.defineProperty(element, "isContentEditable", {
    configurable: true,
    get() {
      reads.count += 1;
      return true;
    },
  });
  document.body.appendChild(element);
  return { element, reads };
};

beforeEach(async () => {
  ({ useShortcuts } = await import(
    "../../src/renderer/src/features/workspace/hooks/useShortcuts.js"
  ));
  mocked.shortcuts = {};

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  editableTarget?.remove();
  vi.resetModules();
  vi.restoreAllMocks();
});

function Harness({ handlers }: { handlers: Record<string, () => void> }) {
  useShortcuts(handlers);
  return null;
}

/** 집필 중 상황을 만들기 위해 편집 허용 액션 여러 개를 등록한다. */
const MANY_ACTIONS: Record<string, string> = {
  "app.openSettings": "cmd+comma",
  "chapter.new": "cmd+n",
  "chapter.save": "cmd+s",
  "chapter.open.1": "cmd+1",
  "chapter.open.2": "cmd+2",
  "chapter.open.3": "cmd+3",
  "research.open.character": "cmd+t",
  "world.tab.graph": "cmd+shift+g",
  "window.toggleFullscreen": "f11",
  "export.openPreview": "cmd+e",
};

describe("useShortcuts 키 입력당 비용", () => {
  it("P1/P2: 같은 shortcuts로 키를 여러 번 눌러도 accelerator를 재파싱하지 않는다", () => {
    const { shortcuts, reads } = countingShortcuts(MANY_ACTIONS);
    mocked.shortcuts = shortcuts;
    const { element } = countingEditableTarget();
    editableTarget = element;

    act(() => root.render(<Harness handlers={{ "chapter.new": vi.fn() }} />));

    const readsAfterMount = reads.count;

    // 단축키에 걸리지 않는 평범한 본문 입력 20회.
    for (let i = 0; i < 20; i++) {
      act(() => {
        element.dispatchEvent(
          new KeyboardEvent("keydown", { key: "a", bubbles: true, cancelable: true }),
        );
      });
    }

    const readsFromTyping = reads.count - readsAfterMount;

    // accelerator는 shortcuts가 바뀔 때만 변하는 정적 값이다. 타이핑이
    // 파싱을 유발하면 키 입력당 비용이 단축키 수에 비례한다.
    expect(readsFromTyping).toBe(0);
  });

  it("P3: 키 입력 1회에 편집 영역 판정용 DOM 읽기는 1회를 넘지 않는다", () => {
    mocked.shortcuts = { ...MANY_ACTIONS };
    const { element, reads } = countingEditableTarget();
    editableTarget = element;

    // WARNING: `if (!handlers[action]) continue`가 isEditableTarget보다 앞에 있다.
    // 핸들러를 일부만 등록하면 루프가 조기 종료돼 DOM 읽기가 적게 세어지고,
    // 결함이 있어도 통과하는 무효 테스트가 된다. 전 액션에 핸들러를 등록한다.
    const handlers = Object.fromEntries(
      Object.keys(MANY_ACTIONS).map((action) => [action, vi.fn()]),
    );
    act(() => root.render(<Harness handlers={handlers} />));

    reads.count = 0;
    act(() => {
      element.dispatchEvent(
        new KeyboardEvent("keydown", { key: "a", bubbles: true, cancelable: true }),
      );
    });

    // 이벤트의 편집 여부는 이벤트당 한 번 정해진다. 루프 안에서 읽으면
    // 액션 수만큼 DOM 프로퍼티 접근이 발생한다.
    expect(reads.count).toBeLessThanOrEqual(1);
  });
});

describe("useShortcuts 리스너 생애주기", () => {
  it("P4: 핸들러 맵 참조가 바뀌어도 keydown 리스너를 재등록하지 않는다", () => {
    mocked.shortcuts = { ...MANY_ACTIONS };
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const countKeydown = (spy: typeof addSpy) =>
      spy.mock.calls.filter(([type]) => type === "keydown").length;

    act(() => root.render(<Harness handlers={{ "chapter.new": vi.fn() }} />));
    expect(countKeydown(addSpy)).toBe(1);

    // useEditorRootShortcuts의 useMemo는 isSidebarOpen/fontSize가 바뀌면
    // 새 핸들러 맵을 만든다. 그 상황을 새 객체 리터럴로 재현한다.
    for (let i = 0; i < 5; i++) {
      act(() => root.render(<Harness handlers={{ "chapter.new": vi.fn() }} />));
    }

    expect(countKeydown(removeSpy)).toBe(0);
    expect(countKeydown(addSpy)).toBe(1);
  });

  it("P4-b: 언마운트 시에는 리스너를 정확히 해제한다 (누수 방지 회귀 가드)", () => {
    mocked.shortcuts = { ...MANY_ACTIONS };
    const removeSpy = vi.spyOn(window, "removeEventListener");

    act(() => root.render(<Harness handlers={{ "chapter.new": vi.fn() }} />));
    act(() => root.render(<></>));

    expect(removeSpy.mock.calls.filter(([type]) => type === "keydown").length).toBe(1);
  });
});
