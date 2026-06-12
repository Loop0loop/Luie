import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  db,
  chapter,
  memoryEvalCase,
  memoryEvalEvidence,
  memoryEvalFeedback,
  project,
} from "../../../../../src/main/infra/database/index.js";
import {
  detectRejectedAnswerRecurrence,
  recordMemoryEvalFeedback,
} from "../../../../../src/main/services/features/memory/eval/memoryEvalFeedbackService.js";

describe("recordMemoryEvalFeedback", () => {
  it("stores writer feedback for a wrong answer", async () => {
    const projectId = crypto.randomUUID();
    const nowIso = "2026-06-12T15:00:00.000Z";
    await db.getClient().insert(project).values({
      id: projectId,
      title: "Writer Feedback",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });

    const feedback = await recordMemoryEvalFeedback({
      projectId,
      runId: "run-1",
      caseId: "case-1",
      resultId: "result-1",
      feedbackKind: "answer_wrong",
      question: "아린이 3화 기준으로 이 사실을 알아도 되나?",
      answer: "알고 있다.",
      evidence: [
        {
          chunkId: "chunk-8",
          chapterId: "chapter-8",
          offset: 12,
          quote: "8화에서 아린은 사실을 알게 된다.",
        },
      ],
      note: "3화 기준으로는 미래 정보다.",
      nowIso,
    });

    const [row] = await db
      .getClient()
      .select()
      .from(memoryEvalFeedback)
      .where(eq(memoryEvalFeedback.id, feedback.id));

    expect(row).toMatchObject({
      id: feedback.id,
      projectId,
      runId: "run-1",
      caseId: "case-1",
      resultId: "result-1",
      feedbackKind: "answer_wrong",
      question: "아린이 3화 기준으로 이 사실을 알아도 되나?",
      answer: "알고 있다.",
      note: "3화 기준으로는 미래 정보다.",
      status: "pending",
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    expect(JSON.parse(row.evidenceJson)).toEqual([
      {
        chunkId: "chunk-8",
        chapterId: "chapter-8",
        offset: 12,
        quote: "8화에서 아린은 사실을 알게 된다.",
      },
    ]);
  });

  it("creates an eval case candidate from wrong-answer feedback", async () => {
    const projectId = crypto.randomUUID();
    const nowIso = "2026-06-12T15:10:00.000Z";
    await db.getClient().insert(project).values({
      id: projectId,
      title: "Writer Feedback Candidate",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });
    await db.getClient().insert(chapter).values({
      id: "chapter-8",
      projectId,
      title: "8화",
      content: "8화에서 아린은 봉인의 정체를 알게 된다.",
      order: 8,
      updatedAt: nowIso,
    });

    const feedback = await recordMemoryEvalFeedback({
      projectId,
      feedbackKind: "answer_wrong",
      question: "3화 기준으로 아린이 봉인을 알아도 되나?",
      answer: "알고 있다.",
      evidence: [
        {
          chunkId: "chunk-8",
          chapterId: "chapter-8",
          offset: 12,
          quote: "8화에서 아린은 봉인의 정체를 알게 된다.",
        },
      ],
      note: "3화 기준으로는 아직 모른다.",
      createEvalCaseCandidate: true,
      nowIso,
    });

    expect(feedback.evalCaseId).toBeTruthy();

    const [feedbackRow] = await db
      .getClient()
      .select()
      .from(memoryEvalFeedback)
      .where(eq(memoryEvalFeedback.id, feedback.id));
    expect(feedbackRow.status).toBe("eval_case_created");

    const [caseRow] = await db
      .getClient()
      .select()
      .from(memoryEvalCase)
      .where(eq(memoryEvalCase.id, feedback.evalCaseId ?? ""));
    expect(caseRow).toMatchObject({
      id: feedback.evalCaseId,
      projectId,
      name: `feedback:answer_wrong:${feedback.id}`,
      question: "3화 기준으로 아린이 봉인을 알아도 되나?",
      expectedAnswer: "3화 기준으로는 아직 모른다.",
      caseType: "qa",
      severity: "p0",
      updatedAt: nowIso,
    });

    const evidenceRows = await db
      .getClient()
      .select()
      .from(memoryEvalEvidence)
      .where(eq(memoryEvalEvidence.caseId, feedback.evalCaseId ?? ""));
    expect(evidenceRows).toEqual([
      expect.objectContaining({
        projectId,
        expectedChunkId: "chunk-8",
        chapterId: "chapter-8",
        startOffset: 12,
        endOffset: 35,
        quote: "8화에서 아린은 봉인의 정체를 알게 된다.",
        updatedAt: nowIso,
      }),
    ]);
  });

  it("detects repeated wrong answers while allowing revised answers", async () => {
    const projectId = crypto.randomUUID();
    const nowIso = "2026-06-12T15:20:00.000Z";
    await db.getClient().insert(project).values({
      id: projectId,
      title: "Rejected Answer Guard",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });

    const rejected = await recordMemoryEvalFeedback({
      projectId,
      feedbackKind: "answer_wrong",
      question: "3화 기준으로 아린이 봉인을 알아도 되나?",
      answer: "알고 있다.",
      note: "3화 기준으로는 아직 모른다.",
      nowIso,
    });
    await recordMemoryEvalFeedback({
      projectId,
      feedbackKind: "evidence_helpful",
      question: "3화 기준으로 아린이 봉인을 알아도 되나?",
      answer: "근거가 좋다.",
      nowIso,
    });

    await expect(
      detectRejectedAnswerRecurrence({
        projectId,
        question: " 3화 기준으로 아린이 봉인을 알아도 되나? ",
        answer: "알고 있다.",
      }),
    ).resolves.toEqual({
      blocked: true,
      feedbackIds: [rejected.id],
      reason: "repeated_rejected_answer",
    });

    await expect(
      detectRejectedAnswerRecurrence({
        projectId,
        question: "3화 기준으로 아린이 봉인을 알아도 되나?",
        answer: "3화 기준으로는 아직 모른다.",
      }),
    ).resolves.toEqual({
      blocked: false,
      feedbackIds: [],
      reason: null,
    });
  });
});
