import { describe, expect, it } from "vitest";
import {
  MEMORY_EVAL_ANSWER_JUDGE_PROMPT_VERSION,
  parseMemoryEvalAnswerJudgeResult,
} from "../../../../../src/main/services/features/memory/eval/memoryEvalAnswerJudge.js";

describe("parseMemoryEvalAnswerJudgeResult", () => {
  it("accepts grounded judge JSON with the current prompt version", () => {
    const result = parseMemoryEvalAnswerJudgeResult(
      JSON.stringify({
        promptVersion: MEMORY_EVAL_ANSWER_JUDGE_PROMPT_VERSION,
        groundedness: "grounded",
        contradiction: "none",
        temporalLeakage: "none",
        omission: "none",
        writerUsefulness: "useful",
        verdict: "pass",
        evidenceQuotesUsed: ["아린은 백야회의 추적을 피했다."],
        rationale: "답변이 제공된 근거 문장 안에서만 판단된다.",
      }),
    );

    expect(result.valid).toBe(true);
    expect(result.result).toMatchObject({
      promptVersion: MEMORY_EVAL_ANSWER_JUDGE_PROMPT_VERSION,
      verdict: "pass",
      groundedness: "grounded",
    });
  });

  it("marks judge output invalid when no evidence quote is used", () => {
    const result = parseMemoryEvalAnswerJudgeResult(
      JSON.stringify({
        promptVersion: MEMORY_EVAL_ANSWER_JUDGE_PROMPT_VERSION,
        groundedness: "grounded",
        contradiction: "none",
        temporalLeakage: "none",
        omission: "none",
        writerUsefulness: "useful",
        verdict: "pass",
        evidenceQuotesUsed: [],
        rationale: "근거 없이 판단한다.",
      }),
    );

    expect(result).toEqual({
      valid: false,
      reason: "missing_evidence_quote",
      raw: expect.any(String),
    });
  });

  it("marks malformed judge output invalid", () => {
    const result = parseMemoryEvalAnswerJudgeResult("not-json");

    expect(result).toEqual({
      valid: false,
      reason: "invalid_json",
      raw: "not-json",
    });
  });
});
