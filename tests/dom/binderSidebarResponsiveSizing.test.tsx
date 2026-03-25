// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type PanelProps = {
  children?: ReactNode;
  defaultSize?: unknown;
  id?: string;
  maxSize?: unknown;
  minSize?: unknown;
};

const renderedPanels = new Map<string, PanelProps>();

const mockedBinderSidebarState = vi.hoisted(() => ({
  handleResize: vi.fn(),
  handleRightTabClick: vi.fn(),
  setActiveRightTab: vi.fn(),
  setFocusedClosableTarget: vi.fn(),
  setRegionOpen: vi.fn(),
  state: {
    activeRightTab: "snapshot" as const,
    isPanelRailOpen: true,
    isRightRailOpen: true,
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

vi.mock("react-resizable-panels", () => ({
  Panel: ({ children, defaultSize, id, maxSize, minSize }: PanelProps) => {
    renderedPanels.set(String(id), {
      children,
      defaultSize,
      id,
      maxSize,
      minSize,
    });
    return <div data-testid={id}>{children}</div>;
  },
  Separator: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock("../../src/renderer/src/features/manuscript/components/useBinderSidebarState.js", () => ({
  useBinderSidebarState: () => ({
    ...mockedBinderSidebarState.state,
    handleResize: mockedBinderSidebarState.handleResize,
    handleRightTabClick: mockedBinderSidebarState.handleRightTabClick,
    setActiveRightTab: mockedBinderSidebarState.setActiveRightTab,
    setFocusedClosableTarget:
      mockedBinderSidebarState.setFocusedClosableTarget,
    setRegionOpen: mockedBinderSidebarState.setRegionOpen,
  }),
}));

vi.mock("../../src/renderer/src/features/manuscript/components/BinderSidebarPanelBody.js", () => ({
  BinderSidebarPanelBody: () => <div>PanelBody</div>,
}));

vi.mock("../../src/renderer/src/features/manuscript/components/BinderSidebarTabs.js", () => ({
  BinderSidebarTabs: () => <div>Tabs</div>,
}));

import { BinderSidebar } from "../../src/renderer/src/features/manuscript/components/BinderSidebar.js";

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
    await Promise.resolve();
  });
  return { container, root };
};

describe("BinderSidebar responsive sizing", () => {
  const mountedViews: MountedView[] = [];

  beforeEach(() => {
    Object.assign(globalThis, {
      IS_REACT_ACT_ENVIRONMENT: true,
    });
    renderedPanels.clear();
  });

  afterEach(() => {
    mountedViews.splice(0).forEach(({ container, root }) => {
      root.unmount();
      container.remove();
    });
    document.body.innerHTML = "";
  });

  it("converts binder panel constraints to container-relative percentages", async () => {
    const view = await mountView(
      <BinderSidebar groupWidthPx={1200} sidebarTopOffset={64} />,
    );
    mountedViews.push(view);

    expect(renderedPanels.get("binder-sidebar-snapshot")).toMatchObject({
      minSize: "18.333%",
      maxSize: "35%",
    });

    renderedPanels.clear();

    await act(async () => {
      view.root.render(<BinderSidebar groupWidthPx={1920} sidebarTopOffset={64} />);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(renderedPanels.get("binder-sidebar-snapshot")).toMatchObject({
      minSize: "11.458%",
      maxSize: "21.875%",
    });
  });
});
