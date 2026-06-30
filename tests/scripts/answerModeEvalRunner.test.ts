import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("answer mode eval runner", () => {
  it("keeps the Memory Engine answer leash explicit", () => {
    const source = readFileSync(
      resolve(process.cwd(), "scripts/run-answer-mode-eval.ts"),
      "utf8",
    );

    expect(source).toContain("answer_mode_v1.jsonl");
    expect(source).toContain('"EVIDENCE"');
    expect(source).toContain('"INSUFFICIENT"');
    expect(source).toContain('"ADVISORY"');
    expect(source).toContain("GEMINI_API_KEY is required");
    expect(source).toContain('fallbackPolicy: "fail-closed"');
    expect(source).toContain("missing evidence quote");
    expect(source).toContain("inferMode");
    expect(source).toContain("ADVISORY에서는 evidence를 빈 배열로 둔다");
    expect(source).toContain("INSUFFICIENT에서는 evidence를 빈 배열로 둔다");
  });
});
