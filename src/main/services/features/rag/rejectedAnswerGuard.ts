import type { RagQaResult } from "../../../../shared/types/index.js";
import { detectRejectedAnswerRecurrence } from "../memory/eval/memoryEvalFeedbackService.js";

type RejectedAnswerDetector = typeof detectRejectedAnswerRecurrence;

export async function applyRejectedAnswerGuardToRagResult(
  result: RagQaResult,
  detect: RejectedAnswerDetector = detectRejectedAnswerRecurrence,
): Promise<RagQaResult> {
  const recurrence = await detect({
    projectId: result.projectId,
    question: result.question,
    answer: result.answer,
  });
  if (!recurrence.blocked) {
    return result;
  }

  return {
    ...result,
    safety: {
      label: "blocked_p0",
      message: "이전에 틀렸다고 표시된 동일 답변입니다.",
      blocksConfirmedAnswer: true,
      reasons: Array.from(
        new Set([...result.safety.reasons, "repeated_rejected_answer"]),
      ),
    },
  };
}
