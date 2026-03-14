import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PanelSize } from "react-resizable-panels";
import {
  createSidebarResizeCommitController,
  isSidebarResizeInteractionKey,
} from "../../../src/renderer/src/features/workspace/hooks/useSidebarResizeCommit";

const createPanelSize = (inPixels: number): PanelSize => ({
  asPercentage: 25,
  inPixels,
});

describe("useSidebarResizeCommit controller", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("ignores resize events that were not triggered by a user interaction", () => {
    const setSidebarWidth = vi.fn();
    const controller = createSidebarResizeCommitController(
      "memoSidebar",
      setSidebarWidth,
      140,
    );

    controller.onResize(createPanelSize(312));
    vi.advanceTimersByTime(200);

    expect(setSidebarWidth).not.toHaveBeenCalled();

    controller.dispose();
  });

  it("commits the final width after an explicit drag interaction ends", () => {
    const setSidebarWidth = vi.fn();
    const controller = createSidebarResizeCommitController(
      "memoSidebar",
      setSidebarWidth,
      140,
    );

    controller.beginInteraction();
    controller.onResize(createPanelSize(333));
    controller.onResize(createPanelSize(347));
    controller.endInteraction();

    expect(setSidebarWidth).toHaveBeenCalledTimes(1);
    expect(setSidebarWidth).toHaveBeenCalledWith("memoSidebar", 347);

    controller.dispose();
  });

  it("clamps committed widths to the sidebar feature bounds", () => {
    const setSidebarWidth = vi.fn();
    const controller = createSidebarResizeCommitController(
      "characterSidebar",
      setSidebarWidth,
      140,
    );

    controller.beginInteraction();
    controller.onResize(createPanelSize(9999));
    vi.advanceTimersByTime(140);

    expect(setSidebarWidth).toHaveBeenCalledWith("characterSidebar", 420);

    controller.dispose();
  });
});

describe("isSidebarResizeInteractionKey", () => {
  it("recognizes resize keyboard controls", () => {
    expect(isSidebarResizeInteractionKey("ArrowLeft")).toBe(true);
    expect(isSidebarResizeInteractionKey("ArrowRight")).toBe(true);
    expect(isSidebarResizeInteractionKey("Home")).toBe(true);
    expect(isSidebarResizeInteractionKey("End")).toBe(true);
    expect(isSidebarResizeInteractionKey("Enter")).toBe(false);
  });
});
