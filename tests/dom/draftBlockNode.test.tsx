// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ReactFlowProvider } from "reactflow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DraftBlockNode } from "../../src/renderer/src/features/research/components/world/graph/components/DraftBlockNode.js";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? _key,
  }),
}));

type MountedView = {
  container: HTMLDivElement;
  root: Root;
};

const mountView = (element: ReactNode): MountedView => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(element);
  });

  return { container, root };
};

const unmountView = ({ container, root }: MountedView): void => {
  act(() => {
    root.unmount();
  });
  container.remove();
};

describe("DraftBlockNode", () => {
  const mountedViews: MountedView[] = [];

  beforeEach(() => {
    Object.assign(globalThis, {
      IS_REACT_ACT_ENVIRONMENT: true,
    });
  });

  afterEach(() => {
    mountedViews.splice(0).forEach(unmountView);
    document.body.innerHTML = "";
  });

  it("submits the initial entity type with the block text", () => {
    const onConvert = vi.fn();
    const view = mountView(
      <ReactFlowProvider>
        <DraftBlockNode
          data={{
            id: "draft-1",
            initialValue: "황실 의회",
            initialEntityType: "Concept",
            onConvert,
          }}
        />
      </ReactFlowProvider>,
    );
    mountedViews.push(view);

    const textarea = view.container.querySelector("textarea");
    expect(textarea).not.toBeNull();

    act(() => {
      (textarea as HTMLTextAreaElement).value = "황실 의회";
      textarea!.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          data: "황실 의회",
        }),
      );
      textarea!.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          bubbles: true,
        }),
      );
    });

    expect(onConvert).toHaveBeenCalledWith("draft-1", {
      text: "황실 의회",
      entityType: "Concept",
    });
  });

  it("does not auto-convert until focus leaves the draft block", () => {
    const onConvert = vi.fn();
    const view = mountView(
      <ReactFlowProvider>
        <DraftBlockNode
          data={{
            id: "draft-2",
            initialValue: "황실 의회",
            initialEntityType: "Concept",
            onConvert,
          }}
        />
      </ReactFlowProvider>,
    );
    mountedViews.push(view);

    const textarea = view.container.querySelector("textarea");
    expect(textarea).not.toBeNull();

    const siblingButton = document.createElement("button");
    view.container.appendChild(siblingButton);

    act(() => {
      textarea!.focus();
    });

    expect(onConvert).not.toHaveBeenCalled();

    act(() => {
      siblingButton.focus();
    });

    expect(onConvert).toHaveBeenCalledWith("draft-2", {
      text: "황실 의회",
      entityType: "Concept",
    });
  });
});
