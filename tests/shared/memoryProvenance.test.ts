import { describe, expect, it } from "vitest";
import {
  memoryCanonStatusLabel,
  memoryProvenanceKindLabel,
} from "../../src/shared/types/memoryProvenance.js";

describe("memory provenance labels", () => {
  it("labels provenance separately from sourceType", () => {
    expect(memoryProvenanceKindLabel("canon")).toBe("원문");
    expect(memoryProvenanceKindLabel("draft")).toBe("초안");
    expect(memoryProvenanceKindLabel("discarded")).toBe("폐기");
    expect(memoryProvenanceKindLabel("user_note")).toBe("작가 메모");
    expect(memoryProvenanceKindLabel("imported")).toBe("외부 가져오기");
  });

  it("labels canon status for renderer display", () => {
    expect(memoryCanonStatusLabel("canon")).toBe("정사");
    expect(memoryCanonStatusLabel("draft")).toBe("초안");
    expect(memoryCanonStatusLabel("discarded")).toBe("폐기");
    expect(memoryCanonStatusLabel("inferred")).toBe("추론");
    expect(memoryCanonStatusLabel("unknown")).toBe("미확인");
  });
});
