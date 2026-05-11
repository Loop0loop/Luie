// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect, useRef, type MutableRefObject } from "react";
import { useFixedPixelPanelGroupLayout } from "../../src/renderer/src/features/workspace/hooks/useFixedPixelPanelGroupLayout.js";

type MountedView = {
  container: HTMLDivElement;
  root: Root;
};

type GroupLike = {
  getLayout: () => Record<string, number>;
  setLayout: (layout: Record<string, number>) => void;
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

const flushAsync = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

function FixedLayoutHarness({
  group,
  onReadyChange,
  widthPx = 320,
}: {
  group: GroupLike;
  onReadyChange?: (isReady: boolean) => void;
  widthPx?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const groupRef = useRef(group) as MutableRefObject<GroupLike | null>;

  const { isLayoutReady } = useFixedPixelPanelGroupLayout({
    containerRef,
    groupRef: groupRef as MutableRefObject<{
      getLayout: () => Record<string, number>;
      setLayout: (layout: Record<string, number>) => void;
    } | null>,
    fixedPanels: [
      {
        id: "memo-sidebar",
        widthPx,
        minPx: 220,
        maxPx: 420,
      },
    ],
    flexPanelId: "memo-content",
    flexPanelMinPercent: 20,
  });

  useEffect(() => {
    onReadyChange?.(isLayoutReady);
  }, [isLayoutReady, onReadyChange]);

  return <div ref={containerRef}>layout harness</div>;
}

describe("useFixedPixelPanelGroupLayout", () => {
  const mountedViews: MountedView[] = [];
  const originalResizeObserver = globalThis.ResizeObserver;
  const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

  beforeEach(() => {
    Object.assign(globalThis, {
      IS_REACT_ACT_ENVIRONMENT: true,
    });

    HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
      return DOMRect.fromRect({
        width: 1000,
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
              contentRect: DOMRect.fromRect({ width: 1000, height: 600 }),
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
    mountedViews.splice(0).forEach(unmountView);
    globalThis.ResizeObserver = originalResizeObserver;
    HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    document.body.innerHTML = "";
  });

  it("does not call setLayout when the mounted panel ids do not match", async () => {
    const setLayout = vi.fn();
    const group = {
      getLayout: () => ({
        "editor-content": 63.128,
      }),
      setLayout,
    };

    const view = mountView(<FixedLayoutHarness group={group} />);
    mountedViews.push(view);
    await flushAsync();

    expect(setLayout).not.toHaveBeenCalled();
  });

  it("applies a fixed-pixel layout when the mounted panel ids match", async () => {
    const setLayout = vi.fn();
    const group = {
      getLayout: () => ({
        "memo-sidebar": 32,
        "memo-content": 68,
      }),
      setLayout,
    };

    const view = mountView(<FixedLayoutHarness group={group} />);
    mountedViews.push(view);
    await flushAsync();

    expect(setLayout).toHaveBeenCalledWith({
      "memo-sidebar": 32,
      "memo-content": 68,
    });
  });

  it("marks layout ready after the first fixed-pixel layout is applied", async () => {
    const readyStates: boolean[] = [];
    const group = {
      getLayout: () => ({
        "memo-sidebar": 32,
        "memo-content": 68,
      }),
      setLayout: vi.fn(),
    };

    const view = mountView(
      <FixedLayoutHarness
        group={group}
        onReadyChange={(isReady) => readyStates.push(isReady)}
      />,
    );
    mountedViews.push(view);
    await flushAsync();
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });

    expect(readyStates).toContain(false);
    expect(readyStates.at(-1)).toBe(true);
  });

  it("marks layout not ready again when the target fixed width changes", async () => {
    const readyStates: boolean[] = [];
    const group = {
      getLayout: () => ({
        "memo-sidebar": 32,
        "memo-content": 68,
      }),
      setLayout: vi.fn(),
    };

    const view = mountView(
      <FixedLayoutHarness
        group={group}
        widthPx={320}
        onReadyChange={(isReady) => readyStates.push(isReady)}
      />,
    );
    mountedViews.push(view);
    await flushAsync();
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });

    expect(readyStates.at(-1)).toBe(true);

    act(() => {
      view.root.render(
        <FixedLayoutHarness
          group={group}
          widthPx={360}
          onReadyChange={(isReady) => readyStates.push(isReady)}
        />,
      );
    });
    await flushAsync();

    expect(readyStates.at(-1)).toBe(false);

    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });

    expect(group.setLayout).toHaveBeenLastCalledWith({
      "memo-sidebar": 36,
      "memo-content": 64,
    });
    expect(readyStates.at(-1)).toBe(true);
  });
});
