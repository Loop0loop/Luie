import { describe, expect, it } from "vitest";
import { normalizeCoreAnswer } from "../../../src/main/services/features/rag/normalizeCoreAnswer";

describe("normalizeCoreAnswer", () => {
  it("중복 문장과 프롬프트 메타 라인을 제거한다", () => {
    const raw = [
      "Okay, 시작합니다.",
      "## Output Rules",
      "## Layer 3 — Retrieved Evidence",
      "핵심 답변입니다.",
      "핵심 답변입니다.",
      "보조 답변입니다.",
    ].join("\n");

    const normalized = normalizeCoreAnswer(raw);
    expect(normalized).toContain("핵심 답변입니다.");
    expect(normalized).toContain("보조 답변입니다.");
    expect(normalized).not.toContain("## Output Rules");
    expect(normalized).not.toContain("## Layer 3");
    expect(normalized).not.toContain("Okay");
  });

  it("1800자 고정 절단이 아니라 8k 한도까지 유지한다", () => {
    const longLine = "가".repeat(3000);
    const normalized = normalizeCoreAnswer(longLine);
    expect(normalized.length).toBe(3000);
  });
});
