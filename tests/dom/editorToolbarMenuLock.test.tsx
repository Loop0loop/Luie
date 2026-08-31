// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Editor } from "@tiptap/react";

/**
 * 툴바 메뉴("...")는 툴바 레이어 안에 렌더된다. EditorLayout이 hover 판정으로 툴바를 숨기면
 * 열려 있던 메뉴까지 사라지므로, 메뉴는 열림 상태를 레이아웃에 알려 auto-hide를 잠가야 한다.
 */

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }),
}));

const { MoreMenu } = await import(
  "../../src/renderer/src/features/editor/components/toolbar/MoreMenu.js"
);

const stubEditor = {} as Editor;

type MountedView = {
  container: HTMLDivElement;
  root: Root;
};

const mountedViews: MountedView[] = [];

const mountView = (element: ReactNode): MountedView => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(element);
  });
  const view = { container, root };
  mountedViews.push(view);
  return view;
};

afterEach(() => {
  for (const { container, root } of mountedViews.splice(0)) {
    act(() => {
      root.unmount();
    });
    container.remove();
  }
});

describe("editor toolbar MoreMenu", () => {
  it("reports its open state so the layout can lock toolbar auto-hide", () => {
    const onOpenChange = vi.fn();
    const { container } = mountView(
      <MoreMenu canOpenExport editor={stubEditor} onOpenChange={onOpenChange} />,
    );

    expect(onOpenChange).toHaveBeenLastCalledWith(false);

    const trigger = container.querySelector("button");
    expect(trigger).not.toBeNull();

    act(() => {
      trigger?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    act(() => {
      trigger?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("releases the lock when it unmounts while open", () => {
    const onOpenChange = vi.fn();
    const view = mountView(
      <MoreMenu canOpenExport editor={stubEditor} onOpenChange={onOpenChange} />,
    );

    act(() => {
      view.container.querySelector("button")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    act(() => {
      view.root.unmount();
    });
    mountedViews.splice(mountedViews.indexOf(view), 1);
    view.container.remove();

    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });
});
