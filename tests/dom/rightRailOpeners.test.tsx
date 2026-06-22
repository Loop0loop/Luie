// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockedBinderSidebarState = vi.hoisted(() => ({
  setActiveRightTab: vi.fn(),
  setRailOpen: vi.fn(),
  state: {
    activeRightTab: null,
    isPanelRailOpen: false,
    isRightRailOpen: false,
    savedRatio: 19,
    widthConfig: {
      role: "binder" as const,
      defaultRatio: 19,
      minPx: 220,
      maxPx: 420,
    },
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@renderer/features/editor/stores/editorStore", () => ({
  useEditorStore: (selector: (state: { enableAnimations: boolean }) => unknown) =>
    selector({ enableAnimations: false }),
}));

vi.mock(
  "../../src/renderer/src/features/manuscript/components/useBinderSidebarState.js",
  () => ({
    useBinderSidebarState: () => ({
      ...mockedBinderSidebarState.state,
      handleResize: vi.fn(),
      handleRightTabClick: vi.fn(),
      setActiveRightTab: mockedBinderSidebarState.setActiveRightTab,
      setFocusedClosableTarget: vi.fn(),
      setRailOpen: mockedBinderSidebarState.setRailOpen,
    }),
  }),
);

vi.mock(
  "../../src/renderer/src/features/manuscript/components/BinderSidebarTabs.js",
  () => ({
    BinderSidebarTabs: () => <div>Tabs</div>,
  }),
);

import { BinderSidebarRail } from "../../src/renderer/src/features/manuscript/components/BinderSidebar.js";
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
    mockedBinderSidebarState.setActiveRightTab.mockClear();
    mockedBinderSidebarState.setRailOpen.mockClear();
    mockedBinderSidebarState.state.activeRightTab = null;
    mockedBinderSidebarState.state.isRightRailOpen = false;
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

  it("opens the default docs tab when the Google Docs rail is closed without an active tab", async () => {
    const onSelectTab = vi.fn();
    const onToggleOpen = vi.fn();
    const view = await mountView(
      <GoogleDocsPanelRail
        activeRightTab={null}
        isOpen={false}
        onSelectTab={onSelectTab}
        onToggleOpen={onToggleOpen}
      />,
    );
    mountedViews.push(view);

    await act(async () => {
      view.container.querySelector("button")?.click();
    });

    expect(onSelectTab).toHaveBeenCalledWith("character");
    expect(onToggleOpen).not.toHaveBeenCalled();
  });

  it("opens the default editor tab when the editor rail is closed without an active tab", async () => {
    const view = await mountView(
      <BinderSidebarRail currentProjectId="project-1" sidebarTopOffset={64} />,
    );
    mountedViews.push(view);

    await act(async () => {
      view.container.querySelector("button")?.click();
    });

    expect(mockedBinderSidebarState.setActiveRightTab).toHaveBeenCalledWith(
      "character",
    );
    expect(mockedBinderSidebarState.setRailOpen).not.toHaveBeenCalled();
  });
});
