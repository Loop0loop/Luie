import { describe, expect, it } from "vitest";
import {
  buildMemoryEntityAliasKey,
  normalizeMemoryEntityName,
} from "../../../../../src/main/services/features/memory/entity/memoryEntityResolution.js";

describe("memory entity resolution helpers", () => {
  it("normalizes casing and spacing without inventing aliases", () => {
    expect(normalizeMemoryEntityName("  Baek   Ya  ")).toBe("baek ya");
    expect(normalizeMemoryEntityName(" 백야회 ")).toBe("백야회");
  });

  it("builds a project/type scoped alias key", () => {
    expect(
      buildMemoryEntityAliasKey({
        projectId: "project-1",
        entityType: "faction",
        alias: " 백야회 ",
      }),
    ).toBe("project-1:faction:백야회");
  });
});
