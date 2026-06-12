import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  db,
  memoryEvalFeedback,
  project,
} from "../../../../../src/main/infra/database/index.js";
import { recordMemoryEvalFeedback } from "../../../../../src/main/services/features/memory/eval/memoryEvalFeedbackService.js";

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
});
