import { describe, expect, it } from "vitest";
import {
  safetyLabel,
  safetyTone,
} from "../../src/renderer/src/features/research/components/analysisSection/runtime/runtimeHelpers.js";

describe("analysis safety labels", () => {
  it("labels blocked and warning RAG answers distinctly", () => {
    expect(safetyLabel("blocked_p0")).toBe("차단");
    expect(safetyLabel("temporal_blocked")).toBe("회차 기준 불가");
    expect(safetyLabel("non_canonical_source")).toBe("정사 아님");
    expect(safetyLabel("insufficient_evidence")).toBe("근거 부족");
    expect(safetyLabel("inferred")).toBe("추정");
  });

  it("uses danger tones for blocked answers and warning tones for inferred answers", () => {
    expect(safetyTone("blocked_p0")).toContain("text-danger");
    expect(safetyTone("temporal_blocked")).toContain("text-danger");
    expect(safetyTone("non_canonical_source")).toContain("text-danger");
    expect(safetyTone("inferred")).toContain("text-warning");
  });
});
