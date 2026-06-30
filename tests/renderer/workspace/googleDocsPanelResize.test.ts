import { describe, expect, it } from "vitest";
import {
  shouldCloseDocsPanelOnResize,
  shouldCloseDocsRightPanelOnResize,
} from "../../../src/renderer/src/features/workspace/utils/googleDocsPanelResize.js";

describe("google docs right panel resize", () => {
  it("does not close while the panel is opening or closing", () => {
    const collapsedSize = { asPercentage: 0, inPixels: 0 };

    expect(shouldCloseDocsRightPanelOnResize(collapsedSize, true, false)).toBe(
      false,
    );
    expect(shouldCloseDocsRightPanelOnResize(collapsedSize, false, true)).toBe(
      false,
    );
  });

  it("closes only for a user-collapsed panel", () => {
    expect(
      shouldCloseDocsRightPanelOnResize(
        { asPercentage: 0.05, inPixels: 0 },
        false,
        false,
      ),
    ).toBe(true);
    expect(
      shouldCloseDocsRightPanelOnResize(
        { asPercentage: 26, inPixels: 420 },
        false,
        false,
      ),
    ).toBe(false);
  });

  it("uses the same transition guard for docs sidebar panels", () => {
    expect(
      shouldCloseDocsPanelOnResize({ asPercentage: 0, inPixels: 0 }, true, false),
    ).toBe(false);
  });
});
