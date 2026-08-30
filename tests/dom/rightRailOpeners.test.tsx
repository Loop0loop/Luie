// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@renderer/features/editor/stores/editorStore", () => ({
  useEditorStore: (selector: (state: { enableAnimations: boolean }) => unknown) =>
    selector({ enableAnimations: false }),
}));

import { GoogleDocsPanelRail } from "../../src/renderer/src/features/workspace/components/layout/GoogleDocsPanelRail.js";

type MountedView = {
  container: HTMLDivElement;
  root: Root;
};

const mountView = async (element: ReactNode): Promise<MountedView> => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(element);
    await Promise.resolve();
  });
  return { container, root };
};

describe("right rail openers", () => {
  const mountedViews: MountedView[] = [];

  beforeEach(() => {
    Object.assign(globalThis, {
      IS_REACT_ACT_ENVIRONMENT: true,
    });
    document.body.innerHTML = "";
  });

  afterEach(() => {
    mountedViews.splice(0).forEach(({ container, root }) => {
      act(() => {
        root.unmount();
      });
      container.remove();
    });
    document.body.innerHTML = "";
  });

  it("opens the selected docs tab directly from the always-visible rail", async () => {
    const onSelectTab = vi.fn();
    const view = await mountView(
      <GoogleDocsPanelRail
        activeRightTab={null}
        onSelectTab={onSelectTab}
      />,
    );
    mountedViews.push(view);

    await act(async () => {
      view.container.querySelector("button")?.click();
    });

    expect(onSelectTab).toHaveBeenCalledWith("character");
  });
});
