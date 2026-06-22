import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import {
  db,
  memoryEvalCase,
  memoryEvalEvidence,
  memoryEvalFeedback,
} from "../../../../infra/database/index.js";
import type {
  MemoryEvalFeedbackRecordRequest,
  MemoryEvalFeedbackRecordResult,
} from "../../../../../shared/types/index.js";

export type RecordMemoryEvalFeedbackInput = MemoryEvalFeedbackRecordRequest & {
  nowIso?: string;
};

export type RecordMemoryEvalFeedbackResult = MemoryEvalFeedbackRecordResult;

export type DetectRejectedAnswerRecurrenceInput = {
  projectId: string;
  question: string;
  answer: string;
};

export type DetectRejectedAnswerRecurrenceResult = {
  blocked: boolean;
  feedbackIds: string[];
  reason: "repeated_rejected_answer" | null;
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
  let evalEvidenceCount = 0;

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

    if (evalCaseId) {
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

      const evidenceRows = buildEvalEvidenceRows({
        caseId: evalCaseId,
        projectId: input.projectId,
        evidence: input.evidence ?? [],
        nowIso,
      });
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
    }

    if (
      input.feedbackKind === "evidence_helpful" &&
      input.caseId &&
      (input.evidence?.length ?? 0) > 0
    ) {
      const evidenceRows = buildEvalEvidenceRows({
        caseId: input.caseId,
        projectId: input.projectId,
        evidence: input.evidence ?? [],
        nowIso,
      });
      tx.insert(memoryEvalEvidence).values(evidenceRows).run();
      evalEvidenceCount = evidenceRows.length;
      tx.update(memoryEvalFeedback)
        .set({
          status: "eval_evidence_created",
          updatedAt: nowIso,
        })
        .where(eq(memoryEvalFeedback.id, id))
        .run();
    }
  });

  return { id, evalCaseId, evalEvidenceCount };
}

function buildEvalEvidenceRows(input: {
  caseId: string;
  projectId: string;
  evidence: NonNullable<RecordMemoryEvalFeedbackInput["evidence"]>;
  nowIso: string;
}) {
  return input.evidence.map((evidence) => ({
    id: crypto.randomUUID(),
    caseId: input.caseId,
    projectId: input.projectId,
    chapterId: evidence.chapterId ?? null,
    expectedChunkId: evidence.chunkId,
    startOffset: evidence.offset,
    endOffset: evidence.offset + evidence.quote.length,
    quote: evidence.quote,
    updatedAt: input.nowIso,
    createdAt: input.nowIso,
  }));
}

export async function detectRejectedAnswerRecurrence(
  input: DetectRejectedAnswerRecurrenceInput,
): Promise<DetectRejectedAnswerRecurrenceResult> {
  const rows = await db
    .getClient()
    .select({
      id: memoryEvalFeedback.id,
      question: memoryEvalFeedback.question,
      answer: memoryEvalFeedback.answer,
    })
    .from(memoryEvalFeedback)
    .where(
      and(
        eq(memoryEvalFeedback.projectId, input.projectId),
        eq(memoryEvalFeedback.feedbackKind, "answer_wrong"),
      ),
    );
  const question = normalizeFeedbackText(input.question);
  const answer = normalizeFeedbackText(input.answer);
  const feedbackIds = rows
    .filter(
      (row) =>
        normalizeFeedbackText(row.question) === question &&
        normalizeFeedbackText(row.answer ?? "") === answer,
    )
    .map((row) => row.id);

  return {
    blocked: feedbackIds.length > 0,
    feedbackIds,
    reason: feedbackIds.length > 0 ? "repeated_rejected_answer" : null,
  };
}

function normalizeFeedbackText(value: string): string {
  return value.trim().replace(/\s+/gu, " ").toLowerCase();
}
