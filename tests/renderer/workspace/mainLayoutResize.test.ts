import { describe, expect, it } from "vitest";
import {
  shouldCloseMainLayoutPanelOnResize,
  shouldPersistMainLayoutContext,
  type MainLayoutResizeSurface,
} from "../../../src/renderer/src/features/workspace/utils/mainLayoutResize.js";

describe("main layout resize routing", () => {
  it("does not persist context layout while the left sidebar is being resized", () => {
    expect(shouldPersistMainLayoutContext("default.sidebar")).toBe(false);
    expect(shouldPersistMainLayoutContext("canvas.activity")).toBe(false);
  });

  it("persists context layout for context drags and non-user layout changes", () => {
    expect(shouldPersistMainLayoutContext("default.panel")).toBe(true);
    expect(shouldPersistMainLayoutContext("canvas.binder")).toBe(true);
    expect(shouldPersistMainLayoutContext(null)).toBe(true);
    expect(
      shouldPersistMainLayoutContext(
        "scrivener.binder" as MainLayoutResizeSurface,
      ),
    ).toBe(true);
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
