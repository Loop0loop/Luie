import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import {
  db,
  memoryEvalCase,
  memoryEvalEvidence,
  memoryEvalRelation,
  memoryEvalResult,
  memoryEvalRun,
} from "../../../../infra/database/index.js";
import type {
  MemoryEvalCaseDefinition,
  MemoryEvalLiveRunnerInput,
  MemoryEvalLiveRunnerResult,
  MemoryEvalSuiteCaseInput,
} from "../../../../../shared/types/index.js";
import { parseMemoryEvalAnswerJudgeResult } from "./memoryEvalAnswerJudge.js";
import { runMemoryEvalSuite } from "./memoryEvalScoring.js";

async function loadProjectEvalCases(
  projectId: string,
): Promise<MemoryEvalCaseDefinition[]> {
  const [caseRows, evidenceRows, relationRows] = await Promise.all([
    db
      .getClient()
      .select()
      .from(memoryEvalCase)
      .where(eq(memoryEvalCase.projectId, projectId)),
    db
      .getClient()
      .select()
      .from(memoryEvalEvidence)
      .where(eq(memoryEvalEvidence.projectId, projectId)),
    db
      .getClient()
      .select()
      .from(memoryEvalRelation)
      .where(eq(memoryEvalRelation.projectId, projectId)),
  ]);

  return caseRows.map((row) => ({
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    question: row.question,
    caseType: row.caseType as MemoryEvalCaseDefinition["caseType"],
    expectedAnswer: row.expectedAnswer,
    temporalScopeStartChapterId: row.temporalScopeStartChapterId,
    temporalScopeEndChapterId: row.temporalScopeEndChapterId,
    severity: row.severity as MemoryEvalCaseDefinition["severity"],
    goldEvidence: evidenceRows
      .filter((evidence) => evidence.caseId === row.id)
      .map((evidence) => ({
        id: evidence.id,
        chapterId: evidence.chapterId,
        expectedChunkId: evidence.expectedChunkId,
        startOffset: evidence.startOffset,
        endOffset: evidence.endOffset,
        quote: evidence.quote,
      })),
    expectedRelations: relationRows
      .filter((relation) => relation.caseId === row.id)
      .map((relation) => ({
        sourceName: relation.sourceName,
        targetName: relation.targetName,
        relation: relation.relation,
      })),
  }));
}

export async function runLiveMemoryEvalSuite(
  input: MemoryEvalLiveRunnerInput,
): Promise<MemoryEvalLiveRunnerResult> {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const runId = crypto.randomUUID();
  const cases = await loadProjectEvalCases(input.projectId);

  await db.getClient().insert(memoryEvalRun).values({
    id: runId,
    projectId: input.projectId,
    label: input.label,
    engineVersion: input.engineVersion,
    status: "running",
    startedAt: nowIso,
    completedAt: null,
    updatedAt: nowIso,
  });

  try {
    const suiteCases: MemoryEvalSuiteCaseInput[] = [];
    const answersByCase = new Map<string, string>();
    const answerJudgeJsonByCase = new Map<string, string>();

    for (const evalCase of cases) {
      // eslint-disable-next-line no-await-in-loop -- eval cases run sequentially so persisted answers match deterministic case order.
      const answer = await input.answerer({
        projectId: input.projectId,
        caseId: evalCase.id,
        question: evalCase.question,
        expectedAnswer: evalCase.expectedAnswer,
        caseType: evalCase.caseType,
      });
      answersByCase.set(evalCase.id, answer.answer);
      if (input.answerJudge) {
        // eslint-disable-next-line no-await-in-loop -- judge output is tied to the sequential answer for the same eval case.
        const rawJudgeResult = await input.answerJudge({
          evalCase,
          answer: answer.answer,
          evidence: answer.evidence,
        });
        answerJudgeJsonByCase.set(
          evalCase.id,
          JSON.stringify(parseMemoryEvalAnswerJudgeResult(rawJudgeResult)),
        );
      }
      suiteCases.push({
        evalCase,
        answer: answer.answer,
        retrievedEvidence: answer.evidence,
        groundingStatus: answer.groundingStatus,
        queryChapterOrder: answer.queryChapterOrder,
        observedFacts: answer.observedFacts,
        observedEntities: answer.observedEntities,
        observedRelations: answer.observedRelations,
        observedThreads: answer.observedThreads,
      });
    }

    const suiteResult = runMemoryEvalSuite({
      topK: input.topK,
      cases: suiteCases,
    });

    for (const result of suiteResult.results) {
      // eslint-disable-next-line no-await-in-loop -- result rows are persisted one-by-one for traceable run records.
      await db
        .getClient()
        .insert(memoryEvalResult)
        .values({
          id: crypto.randomUUID(),
          runId,
          caseId: result.caseId,
          projectId: input.projectId,
          groundingStatus:
            suiteCases.find((item) => item.evalCase.id === result.caseId)
              ?.groundingStatus ?? "insufficient_evidence",
          evidenceHitCount: result.evidenceHitCount,
          evidenceMissCount: result.evidenceMissCount,
          contextRecallAtK: result.contextRecallAtK,
          p0FailureCount: result.p0FailureCount,
          p0Failures: JSON.stringify(result.p0Failures),
          answer: answersByCase.get(result.caseId) ?? null,
          answerJudgeJson: answerJudgeJsonByCase.get(result.caseId) ?? null,
          updatedAt: nowIso,
        });
    }

    await db
      .getClient()
      .update(memoryEvalRun)
      .set({
        status: "completed",
        completedAt: nowIso,
        updatedAt: nowIso,
      })
      .where(eq(memoryEvalRun.id, runId));

    return {
      runId,
      ...suiteResult,
    };
  } catch (error) {
    await db
      .getClient()
      .update(memoryEvalRun)
      .set({
        status: "failed",
        completedAt: nowIso,
        updatedAt: nowIso,
      })
      .where(eq(memoryEvalRun.id, runId));
    throw error;
  }
}
