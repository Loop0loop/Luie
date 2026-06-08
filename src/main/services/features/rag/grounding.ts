import type {
  NarrativeMemoryQueryResult,
  RagQaEvidence,
  RagQaGrounding,
  RagQaResult,
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
  input: Omit<RagQaResult, "grounding">,
): RagQaResult {
  return {
    ...input,
    grounding: buildRagGrounding({
      evidence: input.evidence,
      narrativeMemoryStatus: input.narrativeMemory?.status,
    }),
  };
}
