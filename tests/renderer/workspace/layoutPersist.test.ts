import { describe, expect, it } from "vitest";
import { getPanelRatioFromLayout } from "../../../src/renderer/src/features/workspace/hooks/useLayoutPersist.js";

describe("useLayoutPersist layout parsing", () => {
  it("reads numeric ratios from keyed layouts", () => {
    expect(
      getPanelRatioFromLayout(
        {
          "left-sidebar": 18,
        },
        { id: "left-sidebar", surface: "docs.sidebar" },
        0,
      ),
    ).toBe(18);
  });

  it("reads ratios from object-shaped keyed layouts", () => {
    expect(
      getPanelRatioFromLayout(
        {
          "right-context-panel-character": {
            asPercentage: 36,
            inPixels: 512,
          },
        },
        {
          id: "right-context-panel-character",
          surface: "docs.panel.character",
        },
        0,
      ),
    ).toBe(36);
  });

  it("reads ratios from object-shaped array layouts", () => {
    expect(
      getPanelRatioFromLayout(
        [{ size: 17 }, { size: 83 }],
        { id: "left-sidebar", surface: "docs.sidebar" },
        0,
      ),
    ).toBe(17);
  });
});
