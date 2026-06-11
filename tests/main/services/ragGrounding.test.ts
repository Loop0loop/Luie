import { describe, expect, it } from "vitest";
import {
  buildGroundedRagQaResult,
  buildRagAnswerSafety,
  buildRagGrounding,
} from "../../../src/main/services/features/rag/grounding.js";
import type { RagQaEvidence } from "../../../src/shared/types/index.js";

const evidence = (overrides?: Partial<RagQaEvidence>): RagQaEvidence => ({
  chunkId: "chunk-1",
  chapterId: "chapter-1",
  offset: 10,
  quote: "검은 기사는 성문 앞에서 레온이라는 이름을 들었다.",
  ...overrides,
});

describe("RAG grounding status", () => {
  it("marks answers without evidence as insufficient instead of confirmed", () => {
    expect(buildRagGrounding({ evidence: [] })).toEqual({
      status: "insufficient_evidence",
      note: "검색된 원문 근거가 없어 확정 답변으로 취급하지 않습니다.",
    });
  });

  it("marks answers with evidence as inferred until claim-level verification exists", () => {
    expect(buildRagGrounding({ evidence: [evidence()] })).toEqual({
      status: "inferred",
      note: "검색된 원문 근거가 있지만, 문장별 검증 전이므로 추정 답변입니다.",
    });
  });

  it("marks answers with conflicting narrative memory as conflicting", () => {
    expect(
      buildRagGrounding({
        evidence: [evidence()],
        narrativeMemoryStatus: "conflicting",
      }),
    ).toEqual({
      status: "conflicting",
      note: "요청한 질문에서 설정 충돌 후보가 감지되었습니다.",
    });
  });

  it("maps insufficient evidence to a blocking safety label", () => {
    expect(
      buildRagAnswerSafety({
        grounding: buildRagGrounding({ evidence: [] }),
      }),
    ).toEqual({
      label: "insufficient_evidence",
      message: "근거가 없어 확정 답변으로 표시하지 않습니다.",
      blocksConfirmedAnswer: true,
      reasons: ["insufficient_evidence"],
    });
  });

  it("maps future fact failures to a current-chapter safety block", () => {
    expect(
      buildRagAnswerSafety({
        grounding: buildRagGrounding({ evidence: [evidence()] }),
        p0Failures: ["future_fact_used_in_past_answer"],
      }),
    ).toEqual({
      label: "temporal_blocked",
      message: "현재 회차 기준으로 사용할 수 없는 미래 정보가 감지되었습니다.",
      blocksConfirmedAnswer: true,
      reasons: ["future_fact_used_in_past_answer"],
    });
  });

  it("maps draft or deleted fact failures to a non-canonical safety block", () => {
    expect(
      buildRagAnswerSafety({
        grounding: buildRagGrounding({ evidence: [evidence()] }),
        p0Failures: ["deleted_or_draft_fact_confirmed"],
      }),
    ).toEqual({
      label: "non_canonical_source",
      message: "초안 또는 폐기된 설정이 정사처럼 사용되었습니다.",
      blocksConfirmedAnswer: true,
      reasons: ["deleted_or_draft_fact_confirmed"],
    });
  });

  it("maps generic P0 failures to a confirmed-answer block", () => {
    expect(
      buildRagAnswerSafety({
        grounding: buildRagGrounding({ evidence: [evidence()] }),
        p0Failures: ["answer_contains_unsupported_claim"],
      }),
    ).toEqual({
      label: "blocked_p0",
      message: "검수 실패가 있어 확정 답변으로 표시하지 않습니다.",
      blocksConfirmedAnswer: true,
      reasons: ["answer_contains_unsupported_claim"],
    });
  });

  it("maps answer judge temporal leakage to a current-chapter safety block", () => {
    expect(
      buildRagAnswerSafety({
        grounding: buildRagGrounding({ evidence: [evidence()] }),
        answerJudge: {
          valid: true,
          result: {
            promptVersion: "memory-eval-answer-judge-v1",
            groundedness: "grounded",
            contradiction: "none",
            temporalLeakage: "present",
            omission: "none",
            writerUsefulness: "useful",
            verdict: "fail",
            evidenceQuotesUsed: ["검은 기사는 성문 앞에서 레온이라는 이름을 들었다."],
            rationale: "답변에 현재 회차 이후 정보가 섞였다.",
          },
        },
      }),
    ).toEqual({
      label: "temporal_blocked",
      message: "현재 회차 기준으로 사용할 수 없는 미래 정보가 감지되었습니다.",
      blocksConfirmedAnswer: true,
      reasons: ["future_fact_used_in_past_answer"],
    });
  });

  it("maps unsupported answer judge verdicts to a confirmed-answer block", () => {
    expect(
      buildRagAnswerSafety({
        grounding: buildRagGrounding({ evidence: [evidence()] }),
        answerJudge: {
          valid: true,
          result: {
            promptVersion: "memory-eval-answer-judge-v1",
            groundedness: "unsupported",
            contradiction: "none",
            temporalLeakage: "none",
            omission: "none",
            writerUsefulness: "useful",
            verdict: "fail",
            evidenceQuotesUsed: ["검은 기사는 성문 앞에서 레온이라는 이름을 들었다."],
            rationale: "답변의 핵심 주장이 근거 밖에 있다.",
          },
        },
      }),
    ).toEqual({
      label: "blocked_p0",
      message: "검수 실패가 있어 확정 답변으로 표시하지 않습니다.",
      blocksConfirmedAnswer: true,
      reasons: ["answer_contains_unsupported_claim"],
    });
  });

  it("attaches grounding to the RAG QA result contract", () => {
    const result = buildGroundedRagQaResult({
      runId: "run-1",
      projectId: "project-1",
      question: "검은 기사와 레온은 같은 인물인가?",
      answer: "검은 기사와 레온은 같은 인물로 추정됩니다.",
      evidence: [evidence()],
      createdAt: "2026-06-08T00:00:00.000Z",
    });

    expect(result.grounding).toEqual({
      status: "inferred",
      note: "검색된 원문 근거가 있지만, 문장별 검증 전이므로 추정 답변입니다.",
    });
    expect(result.safety).toEqual({
      label: "inferred",
      message: "근거는 있지만 문장별 검증 전이므로 추정 답변입니다.",
      blocksConfirmedAnswer: false,
      reasons: ["inferred"],
    });
  });
});
