import { describe, expect, it } from "vitest";
import {
  buildGroundedRagQaResult,
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
    expect(buildRagGrounding({ evidence: [evidence()], narrativeMemoryStatus: "conflicting" })).toEqual({
      status: "conflicting",
      note: "요청한 질문에서 설정 충돌 후보가 감지되었습니다.",
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
  });
});
