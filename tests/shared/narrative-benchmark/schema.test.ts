import { describe, expect, it } from "vitest";
import {
  narrativeBenchmarkCorpusShapeSchema,
  narrativeTaxonomySchema,
} from "../../../src/shared/schemas/narrativeBenchmark";
import { validateNarrativeBenchmark } from "../../../src/shared/validation/narrativeBenchmark";
import { createValidInput, issueMessages } from "./fixture";

describe("narrative benchmark schema", () => {
  it("accepts all ten taxonomy identifiers", () => {
    const taxonomies = [
      "entity_retrieval", "fact_retrieval", "relationship_state",
      "relationship_change", "temporal_order", "event_causality",
      "character_knowledge", "foreshadowing", "contradiction",
      "worldline_isolation",
    ];
    expect(
      taxonomies.every((taxonomy) => narrativeTaxonomySchema.safeParse(taxonomy).success),
    ).toBe(true);
  });

  it("accepts a structurally and narratively consistent S-tier fixture", () => {
    const input = createValidInput();
    expect(narrativeBenchmarkCorpusShapeSchema.safeParse(input.corpus).success).toBe(true);
    expect(validateNarrativeBenchmark(input).success).toBe(true);
  });

  it("enforces the XL minimum chapter gate", () => {
    const input = createValidInput();
    input.corpus.manifest.scaleTier = "XL";
    expect(issueMessages(input)).toContain("XL tier requires at least 120 chapters");
  });
});
