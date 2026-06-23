// @vitest-environment jsdom

import { act, type ReactNode, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { PanelImperativeHandle } from "react-resizable-panels";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useResizablePanelPresence } from "../../src/renderer/src/features/workspace/hooks/useResizablePanelPresence.js";

const panelHandle = {
  collapse: vi.fn(),
  expand: vi.fn(),
  getCollapsed: vi.fn(() => false),
  getId: vi.fn(() => "right-context-panel-character"),
  getSize: vi.fn(() => 0),
  isCollapsed: vi.fn(() => false),
  isExpanded: vi.fn(() => true),
  resize: vi.fn(() => {
    throw new Error("Layout not found for Panel right-context-panel-character");
  }),
} as unknown as PanelImperativeHandle;

const groupMissingPanelHandle = {
  ...panelHandle,
  isCollapsed: vi.fn(() => {
    throw new Error("Group docs-layout-group not found");
  }),
  resize: vi.fn(),
} as unknown as PanelImperativeHandle;

const panelConstraintsNotFoundHandle = {
  ...panelHandle,
  isCollapsed: vi.fn(() => {
    throw new Error("Panel constraints not found for Panel right-context-panel-character");
  }),
  resize: vi.fn(),
} as unknown as PanelImperativeHandle;

function PresenceProbe({
  handle = panelHandle,
  isOpen,
}: {
  handle?: PanelImperativeHandle;
  isOpen: boolean;
}) {
  const panelRef = useRef<PanelImperativeHandle | null>(handle);
  useResizablePanelPresence({
    enableAnimations: true,
    isOpen,
    openSize: "25%",
    panelRef,
  });
  return null;
}

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

describe("useResizablePanelPresence", () => {
  const mountedViews: MountedView[] = [];

  beforeEach(() => {
    Object.assign(globalThis, {
      IS_REACT_ACT_ENVIRONMENT: true,
    });
    vi.useFakeTimers();
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      return window.setTimeout(() => callback(performance.now()), 0);
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
      window.clearTimeout(id);
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    mountedViews.splice(0).forEach(({ container, root }) => {
      act(() => {
        root.unmount();
      });
      container.remove();
    });
    document.body.innerHTML = "";
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("does not crash when a panel opens before react-resizable-panels registers its layout", async () => {
    const view = await mountView(<PresenceProbe isOpen={false} />);
    mountedViews.push(view);

    await act(async () => {
      view.root.render(<PresenceProbe isOpen />);
      await Promise.resolve();
    });
    await act(async () => {
      vi.runOnlyPendingTimers();
      await Promise.resolve();
    });

    expect(panelHandle.resize).toHaveBeenCalledWith("0%");
  });

  it("does not crash when a mounted panel reports a missing group during collapsed-state lookup", async () => {
    const view = await mountView(
      <PresenceProbe handle={groupMissingPanelHandle} isOpen />,
    );
    mountedViews.push(view);

    await act(async () => {
      await Promise.resolve();
    });

    expect(groupMissingPanelHandle.isCollapsed).toHaveBeenCalled();
    expect(groupMissingPanelHandle.resize).not.toHaveBeenCalled();
  });

  it("does not crash when a panel has constraints not found during collapsed-state lookup", async () => {
    const view = await mountView(
      <PresenceProbe handle={panelConstraintsNotFoundHandle} isOpen />,
    );
    mountedViews.push(view);

    await act(async () => {
      await Promise.resolve();
    });

    expect(panelConstraintsNotFoundHandle.isCollapsed).toHaveBeenCalled();
    expect(panelConstraintsNotFoundHandle.resize).not.toHaveBeenCalled();
  });
});
