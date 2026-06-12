import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  db,
  memoryEvalCase,
  memoryEvalEvidence,
  memoryEvalRelation,
  memoryEvalResult,
  memoryEvalRun,
  memoryFact,
  project,
} from "../../../../../src/main/infra/database/index.js";
import { runLiveMemoryEvalSuite } from "../../../../../src/main/services/features/memory/eval/memoryEvalRunner.js";
import { MEMORY_EVAL_ANSWER_JUDGE_PROMPT_VERSION } from "../../../../../src/main/services/features/memory/eval/memoryEvalAnswerJudge.js";

describe("runLiveMemoryEvalSuite", () => {
  it("loads project eval cases, scores answerer output, and persists run results", async () => {
    const projectId = crypto.randomUUID();
    const caseId = crypto.randomUUID();
    const nowIso = "2026-06-08T00:00:00.000Z";

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Eval Runner",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEvalCase).values({
      id: caseId,
      projectId,
      name: "관계 방향",
      question: "아린과 백야회의 관계는?",
      caseType: "relation",
      expectedAnswer: "아린은 백야회와 적대한다.",
      temporalScopeStartChapterId: null,
      temporalScopeEndChapterId: null,
      severity: "p0",
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEvalEvidence).values({
      id: crypto.randomUUID(),
      caseId,
      projectId,
      chapterId: null,
      expectedChunkId: "chunk-1",
      startOffset: null,
      endOffset: null,
      quote: "아린은 백야회의 추적을 피했다.",
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEvalRelation).values({
      id: crypto.randomUUID(),
      caseId,
      projectId,
      sourceName: "아린",
      targetName: "백야회",
      relation: "hostile_to",
      temporalScope: null,
      expectedAttributes: null,
      updatedAt: nowIso,
    });

    const result = await runLiveMemoryEvalSuite({
      projectId,
      label: "test-run",
      engineVersion: "test-engine",
      topK: 3,
      nowIso,
      answerJudge: async ({ answer, evidence }) => {
        expect(answer).toBe("아린은 백야회의 추적을 피했다.");
        expect(evidence).toHaveLength(1);
        return JSON.stringify({
          promptVersion: MEMORY_EVAL_ANSWER_JUDGE_PROMPT_VERSION,
          groundedness: "grounded",
          contradiction: "none",
          temporalLeakage: "none",
          omission: "none",
          writerUsefulness: "useful",
          verdict: "pass",
          evidenceQuotesUsed: ["아린은 백야회의 추적을 피했다."],
          rationale: "답변이 제공된 근거 안에서만 판단된다.",
        });
      },
      answerer: async (input) => {
        expect(input.question).toBe("아린과 백야회의 관계는?");
        return {
          answer: "아린은 백야회의 추적을 피했다.",
          groundingStatus: "confirmed",
          evidence: [
            {
              chunkId: "chunk-1",
              chapterId: null,
              offset: 0,
              quote: "아린은 백야회의 추적을 피했다.",
            },
          ],
          observedRelations: [
            {
              sourceName: "백야회",
              targetName: "아린",
              relation: "hostile_to",
            },
          ],
        };
      },
    });

    expect(result.caseCount).toBe(1);
    expect(result.totalP0FailureCount).toBe(1);
    expect(result.results[0]?.p0Failures).toEqual([
      "relation_direction_reversed",
    ]);
    expect(result.p0FailureTypeCounts).toEqual({
      relation_direction_reversed: 1,
    });
    expect(result.writerTaskBenchmark).toMatchObject({
      schemaVersion: 1,
      taskCount: 5,
      caseCount: 1,
      successRate: 0,
      evidenceSatisfactionRate: 1,
      falseConfidenceRate: 0,
    });
    expect(result.writerTaskBenchmark.averageResponseTimeMs).toBeGreaterThanOrEqual(
      0,
    );
    expect(result.writerTaskBenchmark.tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          taskId: "character-relation-check",
          caseCount: 1,
          p0FailureCount: 1,
        }),
      ]),
    );

    const [runRow] = await db
      .getClient()
      .select()
      .from(memoryEvalRun)
      .where(eq(memoryEvalRun.id, result.runId));
    expect(runRow).toMatchObject({
      projectId,
      label: "test-run",
      engineVersion: "test-engine",
      status: "completed",
    });

    const [resultRow] = await db
      .getClient()
      .select()
      .from(memoryEvalResult)
      .where(eq(memoryEvalResult.runId, result.runId));
    expect(resultRow).toMatchObject({
      caseId,
      projectId,
      groundingStatus: "confirmed",
      evidenceHitCount: 1,
      p0FailureCount: 1,
      answer: "아린은 백야회의 추적을 피했다.",
    });
    expect(JSON.parse(resultRow.answerJudgeJson ?? "{}")).toMatchObject({
      valid: true,
      result: {
        promptVersion: MEMORY_EVAL_ANSWER_JUDGE_PROMPT_VERSION,
        verdict: "pass",
      },
    });
    expect(JSON.parse(resultRow.p0Failures)).toEqual([
      "relation_direction_reversed",
    ]);
  });

  it("persists invalid judge artifacts without creating confirmed memory", async () => {
    const projectId = crypto.randomUUID();
    const caseId = crypto.randomUUID();
    const nowIso = "2026-06-08T00:00:00.000Z";

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Eval Runner Invalid Judge",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEvalCase).values({
      id: caseId,
      projectId,
      name: "근거 없는 judge",
      question: "아린이 무엇을 했는가?",
      caseType: "qa",
      expectedAnswer: "아린은 백야회의 추적을 피했다.",
      temporalScopeStartChapterId: null,
      temporalScopeEndChapterId: null,
      severity: "p0",
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEvalEvidence).values({
      id: crypto.randomUUID(),
      caseId,
      projectId,
      chapterId: null,
      expectedChunkId: "chunk-judge-invalid",
      startOffset: null,
      endOffset: null,
      quote: "아린은 백야회의 추적을 피했다.",
      updatedAt: nowIso,
    });

    const result = await runLiveMemoryEvalSuite({
      projectId,
      label: "invalid-judge-run",
      engineVersion: "test-engine",
      topK: 3,
      nowIso,
      answerJudge: async () =>
        JSON.stringify({
          promptVersion: MEMORY_EVAL_ANSWER_JUDGE_PROMPT_VERSION,
          groundedness: "grounded",
          contradiction: "none",
          temporalLeakage: "none",
          omission: "none",
          writerUsefulness: "useful",
          verdict: "pass",
          evidenceQuotesUsed: [],
          rationale: "근거 없이 판단한다.",
        }),
      answerer: async () => ({
        answer: "아린은 백야회의 추적을 피했다.",
        groundingStatus: "confirmed",
        evidence: [
          {
            chunkId: "chunk-judge-invalid",
            chapterId: null,
            offset: 0,
            quote: "아린은 백야회의 추적을 피했다.",
          },
        ],
      }),
    });

    const [resultRow] = await db
      .getClient()
      .select()
      .from(memoryEvalResult)
      .where(eq(memoryEvalResult.runId, result.runId));
    expect(JSON.parse(resultRow.answerJudgeJson ?? "{}")).toMatchObject({
      valid: false,
      reason: "missing_evidence_quote",
    });

    const memoryFacts = await db
      .getClient()
      .select()
      .from(memoryFact)
      .where(eq(memoryFact.projectId, projectId));
    expect(memoryFacts).toHaveLength(0);
  });

  it("uses stored query chapter order to catch future facts when answerer omits it", async () => {
    const projectId = crypto.randomUUID();
    const caseId = crypto.randomUUID();
    const nowIso = "2026-06-08T00:00:00.000Z";

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Eval Runner Temporal Scope",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEvalCase).values({
      id: caseId,
      projectId,
      name: "temporal-chapter:3:future-fact",
      question: "3화 기준으로, 아린이 백야회의 목적을 알아도 되는가?",
      caseType: "temporal_state",
      expectedAnswer: "3화 기준으로는 아직 근거가 부족하다.",
      temporalScopeStartChapterId: null,
      temporalScopeEndChapterId: null,
      queryChapterOrder: 3,
      severity: "p0",
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEvalEvidence).values({
      id: crypto.randomUUID(),
      caseId,
      projectId,
      chapterId: null,
      expectedChunkId: "chunk-future",
      startOffset: null,
      endOffset: null,
      quote: "8화에서 아린은 백야회의 목적을 알게 된다.",
      updatedAt: nowIso,
    });

    const result = await runLiveMemoryEvalSuite({
      projectId,
      label: "temporal-run",
      engineVersion: "test-engine",
      topK: 3,
      nowIso,
      answerer: async () => ({
        answer: "아린은 백야회의 목적을 알고 있다.",
        groundingStatus: "confirmed",
        evidence: [
          {
            chunkId: "chunk-future",
            chapterId: null,
            offset: 0,
            quote: "8화에서 아린은 백야회의 목적을 알게 된다.",
          },
        ],
        observedFacts: [
          {
            id: "future-fact",
            status: "confirmed",
            observedAtChapterOrder: 8,
            usedAs: "confirmed",
          },
        ],
      }),
    });

    expect(result.results[0]?.p0Failures).toContain(
      "future_fact_used_in_past_answer",
    );
    expect(result.p0FailureTypeCounts).toMatchObject({
      future_fact_used_in_past_answer: 1,
    });
  });
});
