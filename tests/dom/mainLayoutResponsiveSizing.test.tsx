// @vitest-environment jsdom

import { act, type ReactNode, type Ref } from "react";
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

const mockedWorkspaceStore = vi.hoisted(() => ({
  state: {
    docsRightTab: null,
    layoutSurfaceRatios: {},
    mainView: { type: "editor" as const, id: null },
    panels: [],
    regions: {
      leftSidebar: { open: true },
      rightPanel: { open: true, activeTab: null },
      rightRail: { open: false },
    },
    closeRightPanel: vi.fn(),
    setFocusedClosableTarget: vi.fn(),
    setPanelRailOpen: vi.fn(),
    setRegionOpen: vi.fn(),
    setLayoutSurfaceRatio: vi.fn(),
    toggleLeftSidebar: vi.fn(),
    setBinderBarOpen: vi.fn(),
  },
}));

const mockedEditorStore = vi.hoisted(() => ({
  enableAnimations: false,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("react-resizable-panels", () => ({
  Group: ({
    children,
    elementRef,
    id,
  }: {
    children?: ReactNode;
    elementRef?: Ref<HTMLDivElement | null>;
    id?: string;
  }) => (
    <div ref={elementRef as Ref<HTMLDivElement> | undefined} data-testid={id}>
      {children}
    </div>
  ),
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

vi.mock("@renderer/features/workspace/stores/uiStore", () => ({
  useUIStore: (selector: (state: typeof mockedWorkspaceStore.state) => unknown) =>
    selector(mockedWorkspaceStore.state),
}));

vi.mock("@renderer/features/editor/stores/editorStore", () => ({
  useEditorStore: (selector: (state: { enableAnimations: boolean }) => unknown) =>
    selector({ enableAnimations: mockedEditorStore.enableAnimations }),
}));

vi.mock("@renderer/features/workspace/components/WindowBar", () => ({
  default: () => <div>WindowBar</div>,
}));

vi.mock("@shared/ui/EditorDropZones", () => ({
  EditorDropZones: () => <div>EditorDropZones</div>,
}));

vi.mock("@shared/ui/StatusFooter", () => ({
  default: () => <div>StatusFooter</div>,
}));

vi.mock("@renderer/features/workspace/hooks/useLayoutPersist", () => ({
  useLayoutPersist: () => vi.fn(),
}));

import MainLayout from "../../src/renderer/src/features/workspace/components/layout/MainLayout.js";

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

const flushEffects = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe("MainLayout responsive panel sizing", () => {
  const mountedViews: MountedView[] = [];
  const originalResizeObserver = globalThis.ResizeObserver;
  const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

  let containerWidth = 1200;

  beforeEach(() => {
    Object.assign(globalThis, {
      IS_REACT_ACT_ENVIRONMENT: true,
    });

    renderedPanels.clear();
    mockedWorkspaceStore.state.layoutSurfaceRatios = {};
    mockedWorkspaceStore.state.regions.leftSidebar.open = true;
    mockedWorkspaceStore.state.regions.rightPanel.open = true;
    mockedEditorStore.enableAnimations = false;
    containerWidth = 1200;

    HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
      return DOMRect.fromRect({
        width: containerWidth,
        height: 600,
      });
    };

    class ImmediateResizeObserver {
      private readonly callback: ResizeObserverCallback;

      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
      }

      observe(target: Element) {
        this.callback(
          [
            {
              target,
              borderBoxSize: [] as unknown as ResizeObserverSize[],
              contentRect: DOMRect.fromRect({
                width: containerWidth,
                height: 600,
              }),
              contentBoxSize: [] as unknown as ResizeObserverSize[],
              devicePixelContentBoxSize: [] as unknown as ResizeObserverSize[],
            },
          ] as ResizeObserverEntry[],
          this as unknown as ResizeObserver,
        );
      }

      disconnect() {}

      unobserve() {}
    }

    globalThis.ResizeObserver = ImmediateResizeObserver as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    mountedViews.splice(0).forEach(({ container, root }) => {
      act(() => {
        root.unmount();
      });
      container.remove();
    });
    globalThis.ResizeObserver = originalResizeObserver;
    HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    document.body.innerHTML = "";
  });

  it("computes different percent constraints for different container widths", async () => {
    const view = await mountView(
      <MainLayout
        contextPanel={<div>Context</div>}
        sidebar={<div>Sidebar</div>}
      >
        <div>Main</div>
      </MainLayout>,
    );
    mountedViews.push(view);

    await flushEffects();

    expect(renderedPanels.get("sidebar-panel")).toMatchObject({
      minSize: "18.333%",
      maxSize: "35%",
    });
    expect(renderedPanels.get("context-panel")).toMatchObject({
      minSize: "26.667%",
      maxSize: "63.333%",
    });

    await act(async () => {
      view.root.unmount();
      await Promise.resolve();
      await Promise.resolve();
    });

    renderedPanels.clear();
    mountedViews.length = 0;
    document.body.innerHTML = "";

    containerWidth = 1920;
    const secondView = await mountView(
      <MainLayout
        contextPanel={<div>Context</div>}
        sidebar={<div>Sidebar</div>}
      >
        <div>Main</div>
      </MainLayout>,
    );
    mountedViews.push(secondView);

    await flushEffects();

    expect(renderedPanels.get("sidebar-panel")).toMatchObject({
      minSize: "11.458%",
      maxSize: "21.875%",
    });
    expect(renderedPanels.get("context-panel")).toMatchObject({
      minSize: "16.667%",
      maxSize: "39.583%",
    });
  });
});
