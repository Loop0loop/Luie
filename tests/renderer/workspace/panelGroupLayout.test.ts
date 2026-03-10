import { describe, expect, it } from "vitest";
import {
  buildPanelGroupCompositionKey,
  groupLayoutMatchesPanels,
} from "../../../src/renderer/src/features/workspace/utils/panelGroupLayout.js";

describe("panelGroupLayout utils", () => {
  it("builds a stable composition key from ordered panel ids", () => {
    expect(
      buildPanelGroupCompositionKey("editor-layout", [
        "main-editor-view",
        "panel-a",
        "binder-sidebar-scrap",
      ]),
    ).toBe("editor-layout:main-editor-view|panel-a|binder-sidebar-scrap");
  });

  it("treats missing or extra layout ids as a mismatch", () => {
    const group = {
      getLayout: () => ({
        "main-editor-view": 63.128,
        "binder-sidebar-scrap": 36.872,
      }),
    };

    expect(
      groupLayoutMatchesPanels(group, [
        "main-editor-view",
        "binder-sidebar-scrap",
      ]),
    ).toBe(true);
    expect(groupLayoutMatchesPanels(group, ["main-editor-view"])).toBe(false);
    expect(
      groupLayoutMatchesPanels(group, [
        "main-editor-view",
        "binder-sidebar-scrap",
        "panel-a",
      ]),
    ).toBe(false);
  });
});
