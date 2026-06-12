import crypto from "node:crypto";
import { db, memoryEvalFeedback } from "../../../../infra/database/index.js";
import type { RagQaEvidence } from "../../../../../shared/types/index.js";

export type MemoryEvalFeedbackKind = "answer_wrong" | "evidence_helpful";

export type RecordMemoryEvalFeedbackInput = {
  projectId: string;
  runId?: string | null;
  caseId?: string | null;
  resultId?: string | null;
  feedbackKind: MemoryEvalFeedbackKind;
  question: string;
  answer?: string | null;
  evidence?: RagQaEvidence[];
  note?: string | null;
  nowIso?: string;
};

export type RecordMemoryEvalFeedbackResult = {
  id: string;
};

export async function recordMemoryEvalFeedback(
  input: RecordMemoryEvalFeedbackInput,
): Promise<RecordMemoryEvalFeedbackResult> {
  const id = crypto.randomUUID();
  const nowIso = input.nowIso ?? new Date().toISOString();

  await db.getClient().insert(memoryEvalFeedback).values({
    id,
    projectId: input.projectId,
    runId: input.runId ?? null,
    caseId: input.caseId ?? null,
    resultId: input.resultId ?? null,
    feedbackKind: input.feedbackKind,
    question: input.question,
    answer: input.answer ?? null,
    evidenceJson: JSON.stringify(input.evidence ?? []),
    note: input.note ?? null,
    status: "pending",
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  return { id };
}
