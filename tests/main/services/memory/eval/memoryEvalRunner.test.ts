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
  project,
} from "../../../../../src/main/infra/database/index.js";
import { runLiveMemoryEvalSuite } from "../../../../../src/main/services/features/memory/eval/memoryEvalRunner.js";

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
      answerer: async (input) => {
        expect(input.question).toBe("아린과 백야회의 관계는?");
        return {
          answer: "백야회가 아린과 적대한다.",
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
      answer: "백야회가 아린과 적대한다.",
    });
    expect(JSON.parse(resultRow.p0Failures)).toEqual([
      "relation_direction_reversed",
    ]);
  });
});
