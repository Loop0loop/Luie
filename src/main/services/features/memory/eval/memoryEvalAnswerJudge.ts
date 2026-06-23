export const MEMORY_EVAL_ANSWER_JUDGE_PROMPT_VERSION =
  "memory-eval-answer-judge-v1" as const;

export type MemoryEvalAnswerJudgeScale =
  | "grounded"
  | "unsupported"
  | "none"
  | "present"
  | "complete"
  | "missing"
  | "useful"
  | "not_useful";

export type MemoryEvalAnswerJudgeVerdict = "pass" | "fail" | "invalid";

export type MemoryEvalAnswerJudgeResult = {
  promptVersion: typeof MEMORY_EVAL_ANSWER_JUDGE_PROMPT_VERSION;
  groundedness: "grounded" | "unsupported";
  contradiction: "none" | "present";
  temporalLeakage: "none" | "present";
  omission: "none" | "present";
  writerUsefulness: "useful" | "not_useful";
  verdict: MemoryEvalAnswerJudgeVerdict;
  evidenceQuotesUsed: string[];
  rationale: string;
};

export type MemoryEvalAnswerJudgeParseResult =
  | {
      valid: true;
      result: MemoryEvalAnswerJudgeResult;
    }
  | {
      valid: false;
      reason:
        | "invalid_json"
        | "invalid_schema"
        | "unsupported_prompt_version"
        | "missing_evidence_quote";
      raw: string;
    };

const GROUNDEDNESS_VALUES = new Set(["grounded", "unsupported"]);
const NONE_PRESENT_VALUES = new Set(["none", "present"]);
const WRITER_USEFULNESS_VALUES = new Set(["useful", "not_useful"]);
const VERDICT_VALUES = new Set(["pass", "fail", "invalid"]);

export function parseMemoryEvalAnswerJudgeResult(
  raw: string,
): MemoryEvalAnswerJudgeParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { valid: false, reason: "invalid_json", raw };
  }

  if (!isRecord(parsed)) {
    return { valid: false, reason: "invalid_schema", raw };
  }
  if (parsed.promptVersion !== MEMORY_EVAL_ANSWER_JUDGE_PROMPT_VERSION) {
    return { valid: false, reason: "unsupported_prompt_version", raw };
  }
  if (
    !isStringInSet(parsed.groundedness, GROUNDEDNESS_VALUES) ||
    !isStringInSet(parsed.contradiction, NONE_PRESENT_VALUES) ||
    !isStringInSet(parsed.temporalLeakage, NONE_PRESENT_VALUES) ||
    !isStringInSet(parsed.omission, NONE_PRESENT_VALUES) ||
    !isStringInSet(parsed.writerUsefulness, WRITER_USEFULNESS_VALUES) ||
    !isStringInSet(parsed.verdict, VERDICT_VALUES) ||
    !Array.isArray(parsed.evidenceQuotesUsed) ||
    !parsed.evidenceQuotesUsed.every((item) => typeof item === "string") ||
    typeof parsed.rationale !== "string"
  ) {
    return { valid: false, reason: "invalid_schema", raw };
  }
  const evidenceQuotesUsed = parsed.evidenceQuotesUsed
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  if (evidenceQuotesUsed.length === 0) {
    return { valid: false, reason: "missing_evidence_quote", raw };
  }

  const groundedness =
    parsed.groundedness as MemoryEvalAnswerJudgeResult["groundedness"];
  const contradiction =
    parsed.contradiction as MemoryEvalAnswerJudgeResult["contradiction"];
  const temporalLeakage =
    parsed.temporalLeakage as MemoryEvalAnswerJudgeResult["temporalLeakage"];
  const omission = parsed.omission as MemoryEvalAnswerJudgeResult["omission"];
  const writerUsefulness =
    parsed.writerUsefulness as MemoryEvalAnswerJudgeResult["writerUsefulness"];
  const verdict = parsed.verdict as MemoryEvalAnswerJudgeResult["verdict"];

  return {
    valid: true,
    result: {
      promptVersion: MEMORY_EVAL_ANSWER_JUDGE_PROMPT_VERSION,
      groundedness,
      contradiction,
      temporalLeakage,
      omission,
      writerUsefulness,
      verdict,
      evidenceQuotesUsed,
      rationale: parsed.rationale,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringInSet(
  value: unknown,
  allowed: ReadonlySet<string>,
): value is string {
  return typeof value === "string" && allowed.has(value);
}
