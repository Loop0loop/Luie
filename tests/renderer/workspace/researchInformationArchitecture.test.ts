import { describe, expect, it } from "vitest";
import {
  LEGACY_RESEARCH_TAB_TARGETS,
  LEGACY_WORLD_TAB_TARGETS,
  RESEARCH_CATALOG_IDS,
  RESEARCH_CATALOG_ITEMS,
  RESEARCH_CATALOG_SUBVIEWS,
} from "../../../src/renderer/src/features/workspace/constants/researchInformationArchitecture";

describe("research information architecture", () => {
  it("defines the six new top-level research destinations in product order", () => {
    expect(RESEARCH_CATALOG_IDS).toEqual([
      "character",
      "event",
      "faction",
      "scrap",
      "plotboard",
      "untitled",
    ]);
    expect(RESEARCH_CATALOG_ITEMS.map((item) => item.id)).toEqual(
      [...RESEARCH_CATALOG_IDS],
    );
  });

  it("moves known world tabs without collapsing the legacy world route", () => {
    expect(RESEARCH_CATALOG_SUBVIEWS).toEqual({
      scrap: ["terms", "memo"],
      plotboard: ["synopsis", "plot"],
      untitled: [],
    });
    expect(LEGACY_WORLD_TAB_TARGETS).toEqual({
      terms: "scrap",
      synopsis: "plotboard",
      plot: "plotboard",
      mindmap: "untitled",
      drawing: "untitled",
      graph: "untitled",
    });
    expect(LEGACY_RESEARCH_TAB_TARGETS.world).toBeNull();
    expect(LEGACY_RESEARCH_TAB_TARGETS.analysis).toBe("untitled");
  });
});
