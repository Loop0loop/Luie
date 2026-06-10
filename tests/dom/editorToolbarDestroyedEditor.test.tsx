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

const createDestroyedEditor = (): Editor =>
  ({
    isDestroyed: true,
    isActive: vi.fn(() => false),
    getAttributes: vi.fn(() => ({})),
    chain: vi.fn(() => {
      throw new TypeError("Cannot read properties of null (reading 'commands')");
    }),
    can: vi.fn(() => {
      throw new TypeError("Cannot read properties of null (reading 'commands')");
    }),
  }) as unknown as Editor;

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

  it("does not call TipTap commands on a destroyed editor", () => {
    const destroyedEditor = createDestroyedEditor();

    expect(() => {
      act(() => {
        root.render(<EditorToolbar editor={destroyedEditor} />);
      });
    }).not.toThrow();

    expect(container.textContent).toBe("");
  });
});
