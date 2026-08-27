// @vitest-environment jsdom

import { act, type ReactNode, type Ref } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type PanelProps = {
  children?: ReactNode;
  defaultSize?: unknown;
  id?: string;
};

const renderedPanels = new Map<string, PanelProps>();

const mockedWorkspaceStore = vi.hoisted(() => ({
  state: {
    docsRightTab: null,
    layoutSurfaceRatios: {} as Record<string, number>,
    mainView: { type: "editor" as const, id: null },
    panels: [],
    regions: {
      leftSidebar: { open: true },
      rightPanel: { open: true, activeTab: null },
      rightRail: { open: false },
    },
    closeRightPanel: vi.fn(),
    openRightPanelTab: vi.fn(),
    updatePanelSize: vi.fn(),
    setRegionOpen: vi.fn(),
    setLayoutSurfaceRatio: vi.fn(),
    toggleLeftSidebar: vi.fn(),
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
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
  Panel: ({ children, defaultSize, id }: PanelProps) => {
    renderedPanels.set(String(id), { children, defaultSize, id });
    return <div data-testid={id}>{children}</div>;
  },
  Separator: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@renderer/features/workspace/stores/uiStore", () => ({
  useUIStore: (
    selector: (state: typeof mockedWorkspaceStore.state) => unknown,
  ) => selector(mockedWorkspaceStore.state),
}));

vi.mock("@renderer/features/editor/stores/editorStore", () => ({
  useEditorStore: (selector: (state: { enableAnimations: boolean }) => unknown) =>
    selector({ enableAnimations: false }),
}));

vi.mock("@renderer/features/ai", () => ({
  AIPanel: () => <div>AI Panel</div>,
}));

vi.mock("@shared/ui/EditorDropZones", () => ({
  EditorDropZones: () => <div>EditorDropZones</div>,
}));

vi.mock("@renderer/features/workspace/hooks/useLayoutPersist", () => ({
  useLayoutPersist: () => vi.fn(),
  getPanelLayoutValue: () => undefined,
  suppressLayoutPersistenceFor: vi.fn(),
}));

import MainLayout from "../../src/renderer/src/features/workspace/components/layout/MainLayout.js";

type MountedView = { container: HTMLDivElement; root: Root };

// NOTE: 같은 element 참조를 재사용하면 React가 subtree 렌더를 건너뛰므로 매번 새로 만든다.
const createLayoutElement = () => (
  <MainLayout sidebar={<div>Sidebar</div>}>
    <div>Main</div>
  </MainLayout>
);

describe("MainLayout reopen size", () => {
  const mountedViews: MountedView[] = [];
  const originalResizeObserver = globalThis.ResizeObserver;
  const originalGetBoundingClientRect =
    HTMLElement.prototype.getBoundingClientRect;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    renderedPanels.clear();
    mockedWorkspaceStore.state.layoutSurfaceRatios = {};
    mockedWorkspaceStore.state.regions.leftSidebar.open = true;
    mockedWorkspaceStore.state.regions.rightPanel.open = true;

    HTMLElement.prototype.getBoundingClientRect = function () {
      return DOMRect.fromRect({ width: 1200, height: 600 });
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
              contentRect: DOMRect.fromRect({ width: 1200, height: 600 }),
              borderBoxSize: [] as unknown as ResizeObserverSize[],
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
    globalThis.ResizeObserver =
      ImmediateResizeObserver as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    mountedViews.splice(0).forEach(({ container, root }) => {
      act(() => root.unmount());
      container.remove();
    });
    globalThis.ResizeObserver = originalResizeObserver;
    HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    document.body.innerHTML = "";
  });

  const mountLayout = async (): Promise<MountedView> => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(createLayoutElement());
      await Promise.resolve();
      await Promise.resolve();
    });
    const view = { container, root };
    mountedViews.push(view);
    return view;
  };

  const rerender = async (view: MountedView) => {
    await act(async () => {
      view.root.render(createLayoutElement());
      await Promise.resolve();
      await Promise.resolve();
    });
  };

  it("serves stored ratios that arrive after mount when panels reopen", async () => {
    const view = await mountLayout();

    // project layout restore는 MainLayout mount 뒤에 uiStore ratio를 채운다.
    mockedWorkspaceStore.state.layoutSurfaceRatios = {
      "default.sidebar": 25,
      "default.panel": 35,
    };
    await rerender(view);

    mockedWorkspaceStore.state.regions.leftSidebar.open = false;
    mockedWorkspaceStore.state.regions.rightPanel.open = false;
    await rerender(view);

    renderedPanels.delete("sidebar-panel");
    mockedWorkspaceStore.state.regions.leftSidebar.open = true;
    mockedWorkspaceStore.state.regions.rightPanel.open = true;
    await rerender(view);

    expect(renderedPanels.get("sidebar-panel")?.defaultSize).toBe("25%");
    expect(renderedPanels.get("context-panel")?.defaultSize).toBe("35%");
  });

  it("falls back to the surface default ratio when the stored ratio is collapsed", async () => {
    mockedWorkspaceStore.state.layoutSurfaceRatios = {
      "default.sidebar": 0.3,
      "default.panel": 0.3,
    };
    const view = await mountLayout();

    mockedWorkspaceStore.state.regions.leftSidebar.open = false;
    mockedWorkspaceStore.state.regions.rightPanel.open = false;
    await rerender(view);

    renderedPanels.delete("sidebar-panel");
    mockedWorkspaceStore.state.regions.leftSidebar.open = true;
    mockedWorkspaceStore.state.regions.rightPanel.open = true;
    await rerender(view);

    expect(renderedPanels.get("sidebar-panel")?.defaultSize).toBe("18%");
    expect(renderedPanels.get("context-panel")?.defaultSize).toBe("24%");
  });
});
