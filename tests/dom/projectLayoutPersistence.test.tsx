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

function PersistenceHarness({
  mode = "default",
}: {
  mode?: "default" | "canvas";
}) {
  useProjectLayoutPersistence("project-a", mode);
  return <div>layout persistence</div>;
}

const mountView = (mode?: "default" | "canvas"): MountedView => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<PersistenceHarness mode={mode} />);
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

  it("restores and persists the default layout's shared research panel width", async () => {
    useProjectLayoutStore.getState().upsertProjectLayout("project-a", {
      workspace: {
        panels: [],
        researchPanelSizes: {},
        byLayout: {
          default: {
            panels: [
              {
                id: "research-character",
                content: { type: "research", tab: "character" },
                size: 56,
              },
            ],
            researchPanelSize: 56,
          },
        },
      },
    });
    mountedView = mountView();

    expect(useUIStore.getState().panels).toEqual([
      {
        id: "research-character",
        content: { type: "research", tab: "character" },
        size: 56,
      },
    ]);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
      useUIStore.getState().updatePanelSize("research-character", 63);
      await Promise.resolve();
    });

    const workspace = useProjectLayoutStore
      .getState()
      .getProjectLayout("project-a").workspace;
    expect(workspace.byLayout.default.researchPanelSize).toBe(63);
    // 다른 레이아웃이 쓰는 공용 버킷으로 새지 않아야 한다.
    expect(workspace.researchPanelSizes.character).toBeUndefined();
  });

  it("persists Canvas surface ratios without overwriting the default layout state", async () => {
    mountedView = mountView("canvas");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
      await Promise.resolve();
    });

    act(() => {
      useUIStore.getState().setLayoutSurfaceRatio("canvas.activity", 31);
    });

    expect(
      useProjectLayoutStore.getState().getProjectLayout("project-a")
        .layoutSurfaceRatios["canvas.activity"],
    ).toBe(31);
    expect(
      useProjectLayoutStore.getState().getProjectLayout("project-a").main
        .contextOpen,
    ).toBe(true);
  });
});
