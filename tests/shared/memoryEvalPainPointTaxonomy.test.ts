import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  MEMORY_EVAL_PAIN_POINT_SEED_CASES_PER_CATEGORY,
  WRITER_PAIN_POINT_TAXONOMY,
} from "../../src/main/services/features/memory/eval/memoryEvalPainPoints.js";

const REQUIRED_TAXONOMY_KEYS = [
  "alias-confusion",
  "knowledge-state",
  "future-leakage",
  "draft-contamination",
  "relation-direction",
  "unresolved-thread",
  "continuity-state",
  "motivation-drift",
  "world-rule-conflict",
] as const;

describe("writer pain point taxonomy", () => {
  it("fixes the Phase 1-1 writer pain point categories as shared constants", () => {
    expect(WRITER_PAIN_POINT_TAXONOMY.map((item) => item.key)).toEqual(
      REQUIRED_TAXONOMY_KEYS,
    );
    expect(MEMORY_EVAL_PAIN_POINT_SEED_CASES_PER_CATEGORY).toBeGreaterThanOrEqual(
      10,
    );
    expect(
      WRITER_PAIN_POINT_TAXONOMY.every(
        (item) =>
          item.writerProblem.trim().length > 0 &&
          item.evalIntent.trim().length > 0 &&
          item.caseType.trim().length > 0 &&
          item.severity.trim().length > 0,
      ),
    ).toBe(true);
  });

  it("documents every taxonomy category for implementation and review", async () => {
    const doc = await readFile(
      "docs/memory-eval-pain-point-taxonomy.md",
      "utf8",
    );

    for (const key of REQUIRED_TAXONOMY_KEYS) {
      expect(doc).toContain(key);
    }
  });
});
