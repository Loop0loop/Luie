import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import {
  db,
  memoryEvalCase,
  memoryEvalEvidence,
  memoryEvalFeedback,
} from "../../../../infra/database/index.js";
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
  createEvalCaseCandidate?: boolean;
  nowIso?: string;
};

export type RecordMemoryEvalFeedbackResult = {
  id: string;
  evalCaseId?: string;
};

export async function recordMemoryEvalFeedback(
  input: RecordMemoryEvalFeedbackInput,
): Promise<RecordMemoryEvalFeedbackResult> {
  const id = crypto.randomUUID();
  const nowIso = input.nowIso ?? new Date().toISOString();
  const evalCaseId =
    input.createEvalCaseCandidate && input.feedbackKind === "answer_wrong"
      ? crypto.randomUUID()
      : undefined;

  db.getClient().transaction((tx) => {
    tx.insert(memoryEvalFeedback).values({
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
    }).run();

    if (!evalCaseId) return;

    tx.insert(memoryEvalCase).values({
      id: evalCaseId,
      projectId: input.projectId,
      name: `feedback:answer_wrong:${id}`,
      question: input.question,
      caseType: "qa",
      expectedAnswer: input.note ?? null,
      temporalScopeStartChapterId: null,
      temporalScopeEndChapterId: null,
      severity: "p0",
      updatedAt: nowIso,
    }).run();

    const evidenceRows = (input.evidence ?? []).map((evidence) => ({
      id: crypto.randomUUID(),
      caseId: evalCaseId,
      projectId: input.projectId,
      chapterId: evidence.chapterId ?? null,
      expectedChunkId: evidence.chunkId,
      startOffset: evidence.offset,
      endOffset: evidence.offset + evidence.quote.length,
      quote: evidence.quote,
      updatedAt: nowIso,
      createdAt: nowIso,
    }));
    if (evidenceRows.length > 0) {
      tx.insert(memoryEvalEvidence).values(evidenceRows).run();
    }
    tx.update(memoryEvalFeedback)
      .set({
        status: "eval_case_created",
        updatedAt: nowIso,
      })
      .where(eq(memoryEvalFeedback.id, id))
      .run();
  });

  return { id, evalCaseId };
}
