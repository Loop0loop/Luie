// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useProjectLayoutPersistence } from "../../src/renderer/src/features/workspace/hooks/useProjectLayoutPersistence.js";
import { useProjectLayoutStore } from "../../src/renderer/src/features/workspace/stores/projectLayoutStore.js";
import { useUIStore } from "../../src/renderer/src/features/workspace/stores/uiStore.js";

type MountedView = {
  container: HTMLDivElement;
  root: Root;
};

function PersistenceHarness() {
  useProjectLayoutPersistence("project-a", "default");
  return <div>layout persistence</div>;
}

const mountView = (): MountedView => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<PersistenceHarness />);
  });

  return { container, root };
};

describe("useProjectLayoutPersistence", () => {
  let mountedView: MountedView | null = null;

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

    useUIStore.setState((state) => ({
      ...state,
      hasHydrated: true,
      panels: [],
      regions: {
        ...state.regions,
        leftSidebar: {
          ...state.regions.leftSidebar,
          open: true,
        },
        rightPanel: {
          ...state.regions.rightPanel,
          open: true,
        },
      },
    }));
    useProjectLayoutStore.setState({
      hasHydrated: true,
      byProject: {},
    });
    useProjectLayoutStore.getState().upsertProjectLayout("project-a", {
      main: {
        sidebarOpen: true,
        contextOpen: true,
      },
    });
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
    document.body.innerHTML = "";
  });

  it("persists sidebar changes made while layout restoration is settling", async () => {
    mountedView = mountView();

    act(() => {
      useUIStore.getState().setRegionOpen("leftSidebar", false);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
      await Promise.resolve();
    });

    expect(
      useProjectLayoutStore.getState().getProjectLayout("project-a").main
        .sidebarOpen,
    ).toBe(false);
  });
});
