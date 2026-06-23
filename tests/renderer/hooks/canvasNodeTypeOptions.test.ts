import { describe, expect, it } from "vitest";
import { BLOCK_TYPE_OPTIONS } from "../../../src/renderer/src/features/research/components/world/graph/components/sidebars/CanvasSidebar";

describe("canvas block type options", () => {
  it("includes default neutral block option", () => {
    const neutral = BLOCK_TYPE_OPTIONS.find(
      (option) => option.label === "block",
    );
    expect(neutral).toBeDefined();
    expect(neutral?.entityType).toBe("WorldEntity");
    expect(neutral?.subType).toBe("Place");
  });

  it("includes editor-linked semantic options", () => {
    const values = BLOCK_TYPE_OPTIONS.map((option) => option.entityType);
    expect(values).toContain("Character");
    expect(values).toContain("Event");
    expect(values).toContain("Faction");
    expect(values).toContain("Concept");
  });
});
