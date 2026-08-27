// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Editor } from "@tiptap/react";
import EditorToolbar from "../../src/renderer/src/features/editor/components/EditorToolbar.js";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

vi.mock("../../src/renderer/src/features/editor/stores/editorStore.js", () => ({
  useEditorStore: (
    selector: (state: {
      fontSize: number;
      lineHeight: number;
      letterSpacing: number;
      paragraphSpacing: number;
      setFontSize: (value: number) => Promise<void>;
      updateSettings: (settings: Record<string, unknown>) => Promise<void>;
    }) => unknown,
  ) =>
    selector({
      fontSize: 16,
      lineHeight: 1.7,
      letterSpacing: 0,
      paragraphSpacing: 1,
      setFontSize: vi.fn(),
      updateSettings: vi.fn(),
    }),
}));

vi.mock("../../src/renderer/src/features/workspace/stores/uiStore.js", () => ({
  useUIStore: (
    selector: (state: {
      worldTab: string;
      setWorldTab: (tab: string) => void;
    }) => unknown,
  ) =>
    selector({
      worldTab: "terms",
      setWorldTab: vi.fn(),
    }),
}));

vi.mock(
  "../../src/renderer/src/features/editor/components/FontSelector.js",
  () => ({
    FontSelector: () => <div data-testid="font-selector" />,
  }),
);

describe("EditorToolbar destroyed editor handling", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    Object.assign(globalThis, {
      IS_REACT_ACT_ENVIRONMENT: true,
    });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    document.body.innerHTML = "";
  });

  it("renders controls via ghost fallback without touching a destroyed editor", () => {
    const chain = vi.fn(() => {
      throw new TypeError(
        "Cannot read properties of null (reading 'commands')",
      );
    });
    const can = vi.fn(() => {
      throw new TypeError(
        "Cannot read properties of null (reading 'commands')",
      );
    });
    const destroyedEditor = {
      isDestroyed: true,
      isActive: vi.fn(() => false),
      getAttributes: vi.fn(() => ({})),
      chain,
      can,
    } as unknown as Editor;

    expect(() => {
      act(() => {
        root.render(<EditorToolbar editor={destroyedEditor} />);
      });
    }).not.toThrow();

    // 파괴된 인스턴스의 커맨드 패널 조회는 절대 호출하지 않는다(ghost 폴백이 흡수).
    expect(chain).not.toHaveBeenCalled();
    expect(can).not.toHaveBeenCalled();

    // 툴바는 빈 막대가 아니라 실제 컨트롤을 렌더링해야 한다. portal 컨텐츠는
    // document.body에 부착되므로 layer에서 찾는다(캔버스 복귀 직후 docEditor가
    // 일시적 stale인 구간도 포함한 보장이다).
    const layer = document.body.querySelector(
      '[data-editor-toolbar-layer="true"]',
    );
    expect(layer).not.toBeNull();
    expect(layer?.querySelector('[data-testid="font-selector"]')).not.toBeNull();
  });
});
