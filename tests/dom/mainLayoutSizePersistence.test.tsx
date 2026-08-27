// @vitest-environment jsdom

import { act, type ReactNode, type Ref } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const STORAGE_KEY = "luie-project-layout-v2";
const PROJECT_ID = "project-1";

type PanelProps = {
  children?: ReactNode;
  defaultSize?: unknown;
  id?: string;
  panelRef?: { current: unknown };
};

/** Panel id -> 현재 적용된 size. defaultSize + resize() 호출을 모두 반영한다. */
const panelSizes = new Map<string, unknown>();
const groupHandlers = new Map<string, (layout: Record<string, number>) => void>();
const separatorProps = new Map<string, Record<string, unknown>>();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("react-resizable-panels", () => ({
  Group: ({
    children,
    elementRef,
    id,
    onLayoutChanged,
  }: {
    children?: ReactNode;
    elementRef?: Ref<HTMLDivElement | null>;
    id?: string;
    onLayoutChanged?: (layout: Record<string, number>) => void;
  }) => {
    if (onLayoutChanged) groupHandlers.set(String(id), onLayoutChanged);
    return (
      <div ref={elementRef as Ref<HTMLDivElement> | undefined} data-testid={id}>
        {children}
      </div>
    );
  },
  Panel: ({ children, defaultSize, id, panelRef }: PanelProps) => {
    const panelId = String(id);
    if (!panelSizes.has(panelId)) panelSizes.set(panelId, defaultSize);
    if (panelRef) {
      panelRef.current = {
        resize: (size: unknown) => panelSizes.set(panelId, size),
        collapse: () => panelSizes.set(panelId, "0%"),
        isCollapsed: () => panelSizes.get(panelId) === "0%",
      };
    }
    return <div data-testid={panelId}>{children}</div>;
  },
  Separator: (props: Record<string, unknown>) => {
    separatorProps.set(String(props["data-separator-feature"]), props);
    return <div>{props.children as ReactNode}</div>;
  },
}));

vi.mock("@renderer/features/ai", () => ({ AIPanel: () => <div>AIPanel</div> }));
vi.mock("@shared/ui/EditorDropZones", () => ({
  EditorDropZones: () => <div>EditorDropZones</div>,
}));

type MountedView = {
  container: HTMLDivElement;
  root: Root;
  isRightPanelOpen: () => boolean;
};

/** 앱 실행 1회를 모사한다. module registry를 리셋해 store persist를 새로 rehydrate한다. */
const bootApp = async (): Promise<MountedView> => {
  vi.resetModules();
  panelSizes.clear();
  groupHandlers.clear();
  separatorProps.clear();

  const MainLayout = (
    await import(
      "../../src/renderer/src/features/workspace/components/layout/MainLayout.js"
    )
  ).default;
  const { useUIStore } = await import(
    "../../src/renderer/src/features/workspace/stores/uiStore.js"
  );
  const { useProjectLayoutStore } = await import(
    "../../src/renderer/src/features/workspace/stores/projectLayoutStore.js"
  );
  const { useProjectLayoutPersistence } = await import(
    "../../src/renderer/src/features/workspace/hooks/useProjectLayoutPersistence.js"
  );

  await useProjectLayoutStore.persist.rehydrate();
  useUIStore.setState({ hasHydrated: true });
  useUIStore.getState().setRegionOpen("leftSidebar", true);
  useUIStore.getState().setRegionOpen("rightPanel", true);

  function Harness() {
    useProjectLayoutPersistence(PROJECT_ID, "default");
    return (
      <MainLayout sidebar={<div>Sidebar</div>}>
        <div>Main</div>
      </MainLayout>
    );
  }

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(<Harness />);
    await Promise.resolve();
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
  });

  return {
    container,
    root,
    isRightPanelOpen: () => useUIStore.getState().regions.rightPanel.open,
  };
};

const dragSurface = async (
  surface: "default.sidebar" | "default.panel",
  layout: Record<string, number>,
) => {
  const separator = separatorProps.get(surface);
  await act(async () => {
    (separator?.onPointerDown as (() => void) | undefined)?.();
  });
  await act(async () => {
    groupHandlers.get("main-layout-group")?.(layout);
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
  });
};

const readStoredRatios = (): Record<string, number> | undefined =>
  JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}")?.state?.byProject?.[
    PROJECT_ID
  ]?.layoutSurfaceRatios;

describe("MainLayout default layout size persistence", () => {
  const mountedViews: MountedView[] = [];
  const originalResizeObserver = globalThis.ResizeObserver;
  const originalGetBoundingClientRect =
    HTMLElement.prototype.getBoundingClientRect;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    localStorage.clear();

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
    localStorage.clear();
  });

  it("keeps sidebar and AI panel sizes across an app restart", async () => {
    mountedViews.push(await bootApp());

    await dragSurface("default.sidebar", {
      "sidebar-panel": 30,
      "main-content-panel": 46,
      "context-panel": 24,
    });
    await dragSurface("default.panel", {
      "sidebar-panel": 30,
      "main-content-panel": 32,
      "context-panel": 38,
    });

    expect(readStoredRatios()).toMatchObject({
      "default.sidebar": 30,
      "default.panel": 38,
    });

    // --- 앱 종료 후 재실행
    mountedViews.splice(0).forEach(({ container, root }) => {
      act(() => root.unmount());
      container.remove();
    });
    mountedViews.push(await bootApp());

    expect(panelSizes.get("sidebar-panel")).toBe("30%");
    expect(panelSizes.get("context-panel")).toBe("38%");
  });

  it("falls back to surface defaults when no layout was persisted", async () => {
    mountedViews.push(await bootApp());

    expect(panelSizes.get("sidebar-panel")).toBe("18%");
    expect(panelSizes.get("context-panel")).toBe("24%");
  });

  it("does not reopen or persist a collapsed AI panel when dragged shut", async () => {
    const view = await bootApp();
    mountedViews.push(view);

    // minSize 근처까지 좁힌 뒤 계속 끌어 collapse까지 보낸다.
    await dragSurface("default.panel", {
      "sidebar-panel": 18,
      "main-content-panel": 55,
      "context-panel": 27,
    });
    await dragSurface("default.panel", {
      "sidebar-panel": 18,
      "main-content-panel": 82,
      "context-panel": 0,
    });

    // collapse 비율 0은 저장되지 않고, 직전 실제 크기가 남아야 한다.
    expect(readStoredRatios()?.["default.panel"]).toBe(27);
    // 패널이 다시 열리지 않아야 한다.
    expect(view.isRightPanelOpen()).toBe(false);
    expect(panelSizes.get("context-panel")).not.toBe("27%");
  });
});
