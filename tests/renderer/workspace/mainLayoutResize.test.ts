import { describe, expect, it } from "vitest";
import {
  getMainLayoutPersistTarget,
  shouldCloseMainLayoutPanelOnResize,
} from "../../../src/renderer/src/features/workspace/utils/mainLayoutResize.js";

describe("main layout resize routing", () => {
  it("persists only the surface currently being resized", () => {
    expect(getMainLayoutPersistTarget("default.sidebar")).toBe("sidebar");
    expect(getMainLayoutPersistTarget("canvas.activity")).toBe("sidebar");
    expect(getMainLayoutPersistTarget("default.panel")).toBe("context");
    expect(getMainLayoutPersistTarget("canvas.binder")).toBe("context");
  });

  it("does not persist non-user layout commits without an active resize handle", () => {
    expect(getMainLayoutPersistTarget(null)).toBe("none");
  });

  it("does not close a panel for collapsed resize events during open or close transitions", () => {
    const collapsedSize = { asPercentage: 0, inPixels: 0 };

    expect(shouldCloseMainLayoutPanelOnResize(collapsedSize, true, false)).toBe(false);
    expect(shouldCloseMainLayoutPanelOnResize(collapsedSize, false, true)).toBe(false);
  });

  it("closes a panel only when a stable resize leaves it collapsed", () => {
    expect(
      shouldCloseMainLayoutPanelOnResize(
        { asPercentage: 0.1, inPixels: 40 },
        false,
        false,
      ),
    ).toBe(true);
    expect(
      shouldCloseMainLayoutPanelOnResize(
        { asPercentage: 5, inPixels: 0 },
        false,
        false,
      ),
    ).toBe(true);
    expect(
      shouldCloseMainLayoutPanelOnResize(
        { asPercentage: 5, inPixels: 40 },
        false,
        false,
      ),
    ).toBe(false);
  });
});
