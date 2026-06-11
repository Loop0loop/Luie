import type {
  NarrativeMemoryQueryResult,
  RagQaEvidence,
  RagQaGrounding,
  RagQaResult,
  RagQaSafety,
  RagQaSafetyReason,
} from "../../../../shared/types/index.js";

export function buildRagGrounding(input: {
  evidence: RagQaEvidence[];
  narrativeMemoryStatus?: NarrativeMemoryQueryResult["status"];
}): RagQaGrounding {
  if (input.narrativeMemoryStatus === "conflicting") {
    return {
      status: "conflicting",
      note: "요청한 질문에서 설정 충돌 후보가 감지되었습니다.",
    };
  }

  if (input.evidence.length === 0) {
    return {
      status: "insufficient_evidence",
      note: "검색된 원문 근거가 없어 확정 답변으로 취급하지 않습니다.",
    };
  }

  return {
    status: "inferred",
    note: "검색된 원문 근거가 있지만, 문장별 검증 전이므로 추정 답변입니다.",
  };
}

export function buildGroundedRagQaResult(
  input: Omit<RagQaResult, "grounding" | "safety"> & {
    p0Failures?: RagQaSafetyReason[];
  },
): RagQaResult {
  const grounding = buildRagGrounding({
    evidence: input.evidence,
    narrativeMemoryStatus: input.narrativeMemory?.status,
  });
  return {
    ...input,
    grounding,
    safety: buildRagAnswerSafety({
      grounding,
      p0Failures: input.p0Failures,
    }),
  };
}

export function buildRagAnswerSafety(input: {
  grounding: RagQaGrounding;
  p0Failures?: RagQaSafetyReason[];
}): RagQaSafety {
  const p0Failures = input.p0Failures ?? [];
  if (p0Failures.includes("future_fact_used_in_past_answer")) {
    return {
      label: "temporal_blocked",
      message: "현재 회차 기준으로 사용할 수 없는 미래 정보가 감지되었습니다.",
      blocksConfirmedAnswer: true,
      reasons: p0Failures,
    };
  }
  if (p0Failures.includes("deleted_or_draft_fact_confirmed")) {
    return {
      label: "non_canonical_source",
      message: "초안 또는 폐기된 설정이 정사처럼 사용되었습니다.",
      blocksConfirmedAnswer: true,
      reasons: p0Failures,
    };
  }
  if (p0Failures.length > 0) {
    return {
      label: "blocked_p0",
      message: "검수 실패가 있어 확정 답변으로 표시하지 않습니다.",
      blocksConfirmedAnswer: true,
      reasons: p0Failures,
    };
  }
  if (input.grounding.status === "insufficient_evidence") {
    return {
      label: "insufficient_evidence",
      message: "근거가 없어 확정 답변으로 표시하지 않습니다.",
      blocksConfirmedAnswer: true,
      reasons: ["insufficient_evidence"],
    };
  }
  if (input.grounding.status === "conflicting") {
    return {
      label: "conflicting",
      message: "설정 충돌 후보가 있어 확정 답변으로 표시하지 않습니다.",
      blocksConfirmedAnswer: true,
      reasons: ["conflicting"],
    };
  }
  if (input.grounding.status === "confirmed") {
    return {
      label: "confirmed",
      message: "근거와 검수 조건을 통과한 확정 답변입니다.",
      blocksConfirmedAnswer: false,
      reasons: ["confirmed"],
    };
  }
  return {
    label: "inferred",
    message: "근거는 있지만 문장별 검증 전이므로 추정 답변입니다.",
    blocksConfirmedAnswer: false,
    reasons: ["inferred"],
  };
}
