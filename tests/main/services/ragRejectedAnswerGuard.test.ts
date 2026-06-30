import { describe, expect, it, vi } from "vitest";
import type { RagQaResult } from "../../../src/shared/types/index.js";
import { applyRejectedAnswerGuardToRagResult } from "../../../src/main/services/features/rag/rejectedAnswerGuard.js";

const baseResult = (): RagQaResult => ({
  runId: "run-1",
  projectId: "550e8400-e29b-41d4-a716-446655440000",
  question: "3화 기준으로 아린이 이 사실을 알아도 되나?",
  answer: "알고 있다.",
  answerMode: "EVIDENCE",
  evidence: [
    {
      chunkId: "chunk-8",
      chapterId: null,
      offset: 12,
      quote: "8화에서 아린은 사실을 알게 된다.",
    },
  ],
  grounding: {
    status: "inferred",
    note: "검색된 원문 근거가 있지만, 문장별 검증 전이므로 추정 답변입니다.",
  },
  safety: {
    label: "inferred",
    message: "근거는 있지만 문장별 검증 전이므로 추정 답변입니다.",
    blocksConfirmedAnswer: false,
    reasons: ["inferred"],
  },
  createdAt: "2026-06-13T00:00:00.000Z",
});

describe("applyRejectedAnswerGuardToRagResult", () => {
  it("blocks a generated answer that repeats stored answer_wrong feedback", async () => {
    const detect = vi.fn().mockResolvedValue({
      blocked: true,
      feedbackIds: ["feedback-1"],
      reason: "repeated_rejected_answer",
    });

    const result = await applyRejectedAnswerGuardToRagResult(baseResult(), detect);

    expect(detect).toHaveBeenCalledWith({
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      question: "3화 기준으로 아린이 이 사실을 알아도 되나?",
      answer: "알고 있다.",
    });
    expect(result.safety).toMatchObject({
      label: "blocked_p0",
      blocksConfirmedAnswer: true,
    });
    expect(result.safety.reasons).toContain("repeated_rejected_answer");
  });

  it("leaves non-recurring answers unchanged", async () => {
    const resultInput = baseResult();
    const detect = vi.fn().mockResolvedValue({
      blocked: false,
      feedbackIds: [],
      reason: null,
    });

    const result = await applyRejectedAnswerGuardToRagResult(resultInput, detect);

    expect(result).toBe(resultInput);
  });
});
