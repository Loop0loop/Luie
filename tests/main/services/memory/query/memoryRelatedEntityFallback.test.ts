import { describe, expect, it } from "vitest";
import { resolveRelatedEntity } from "../../../../../src/main/services/features/memory/query/internal/entity.js";

describe("resolveRelatedEntity", () => {
  it("preserves unresolved related entity ids without exposing them as display names", () => {
    const result = resolveRelatedEntity({
      fact: {
        subjectEntityId: "entity-arin",
        objectEntityId: "entity-unknown",
        objectValue: null,
      },
      filterEntityIds: ["entity-arin"],
      entityInfo: new Map(),
    });

    expect(result).toEqual({
      relatedEntityId: "entity-unknown",
      relatedEntityName: null,
      relatedEntityType: null,
    });
  });
});
