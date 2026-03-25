// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FocusHoverSidebar from "../../src/renderer/src/features/manuscript/components/FocusHoverSidebar.js";

type MountedView = {
  container: HTMLDivElement;
  root: Root;
};

const mountView = (): MountedView => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <FocusHoverSidebar
        side="left"
        topOffset={40}
        activationWidthPx={120}
        closeDelayMs={200}
      >
        <div>sidebar body</div>
      </FocusHoverSidebar>,
    );
  });

  return { container, root };
};

const dispatchMouseMove = (x: number, y: number) => {
  act(() => {
    window.dispatchEvent(
      new MouseEvent("mousemove", {
        clientX: x,
        clientY: y,
        buttons: 0,
      }),
    );
    vi.advanceTimersByTime(1);
  });
};

describe("FocusHoverSidebar", () => {
  let mountedView: MountedView | null = null;
  const originalResizeObserver = globalThis.ResizeObserver;
  const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
  const originalOffsetWidth = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "offsetWidth",
  );

  beforeEach(() => {
    vi.useFakeTimers();
    Object.assign(globalThis, {
      IS_REACT_ACT_ENVIRONMENT: true,
    });

    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) =>
      window.setTimeout(() => callback(0), 0),
    );
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((handle) => {
      window.clearTimeout(handle);
    });

    HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
      if (this.textContent?.includes("sidebar body")) {
        return DOMRect.fromRect({
          x: 0,
          y: 40,
          width: 280,
          height: 600,
        });
      }

      return DOMRect.fromRect({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      });
    };

    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      get() {
        return this.textContent?.includes("sidebar body") ? 280 : 0;
      },
    });

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
              contentRect: DOMRect.fromRect({ width: 280, height: 600 }),
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
    if (mountedView) {
      act(() => {
        mountedView?.root.unmount();
      });
      mountedView.container.remove();
      mountedView = null;
    }
    vi.restoreAllMocks();
    vi.useRealTimers();
    globalThis.ResizeObserver = originalResizeObserver;
    HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;

    if (originalOffsetWidth) {
      Object.defineProperty(HTMLElement.prototype, "offsetWidth", originalOffsetWidth);
    } else {
      delete (HTMLElement.prototype as HTMLElement & { offsetWidth?: number }).offsetWidth;
    }
  });

  it("opens when the cursor enters the hidden activation zone", () => {
    mountedView = mountView();
    const sidebar = Array.from(mountedView.container.querySelectorAll("div")).find(
      (node) =>
        node.className.includes("fixed z-50") &&
        node.className.includes("bg-panel"),
    ) as HTMLDivElement;

    expect(sidebar.className).toContain("-translate-x-full");

    dispatchMouseMove(100, 120);

    expect(sidebar.className).toContain("translate-x-0");
  });

  it("stays open while the cursor is inside the visible sidebar and closes after leaving it", async () => {
    mountedView = mountView();
    const sidebar = Array.from(mountedView.container.querySelectorAll("div")).find(
      (node) =>
        node.className.includes("fixed z-50") &&
        node.className.includes("bg-panel"),
    ) as HTMLDivElement;

    dispatchMouseMove(100, 120);
    expect(sidebar.className).toContain("translate-x-0");

    dispatchMouseMove(260, 120);
    await act(async () => {
      vi.advanceTimersByTime(120);
      await Promise.resolve();
    });
    expect(sidebar.className).toContain("translate-x-0");

    dispatchMouseMove(420, 120);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(220);
      await Promise.resolve();
    });
    expect(sidebar.className).toContain("-translate-x-full");
  });

  it("does not reopen while hover open is suppressed", () => {
    mountedView = mountView();
    const sidebar = Array.from(mountedView.container.querySelectorAll("div")).find(
      (node) =>
        node.className.includes("fixed z-50") &&
        node.className.includes("bg-panel"),
    ) as HTMLDivElement;

    dispatchMouseMove(100, 120);
    expect(sidebar.className).toContain("translate-x-0");

    act(() => {
      mountedView?.root.render(
        <FocusHoverSidebar
          side="left"
          topOffset={40}
          activationWidthPx={120}
          closeDelayMs={200}
          suppressHoverOpen
        >
          <div>sidebar body</div>
        </FocusHoverSidebar>,
      );
    });

    dispatchMouseMove(40, 120);

    expect(sidebar.className).toContain("-translate-x-full");
  });
});
