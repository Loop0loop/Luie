import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  db,
  memoryChunk,
  memoryEvalCase,
  memoryEvalEvidence,
  project,
} from "../../../../../src/main/infra/database/index.js";
import { auditMemoryEvalCaseQuality } from "../../../../../src/main/services/features/memory/eval/memoryEvalQualityAudit.js";

describe("auditMemoryEvalCaseQuality", () => {
  it("reports unsupported expected answers and repairs them from gold evidence", async () => {
    const projectId = crypto.randomUUID();
    const caseId = crypto.randomUUID();
    const nowIso = "2026-06-11T00:00:00.000Z";

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Eval Quality Audit",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryChunk).values({
      id: "quality-chunk-1",
      projectId,
      sourceType: "chapter",
      sourceId: "chapter-1",
      chapterId: null,
      sceneId: null,
      chunkIndex: 0,
      content: "아린은 봉인된 편지를 읽고 백야회의 목적을 깨달았다.",
      contentHash: "quality-content-hash-1",
      indexText: "아린 봉인 편지 백야회 목적",
      indexTextHash: "quality-index-hash-1",
      contextLabel: "1화",
      sourceContentHash: "quality-source-hash-1",
      startOffset: 0,
      endOffset: 31,
      paragraphStartIndex: 0,
      paragraphEndIndex: 0,
      tokenCount: 30,
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEvalCase).values({
      id: caseId,
      projectId,
      name: "quality:unsupported-answer",
      question: "1화 기준으로 아린이 무엇을 알게 됐는지 확인해줘.",
      caseType: "temporal_state",
      expectedAnswer: "아린은 봉인된 왕관을 훔쳤다.",
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
      expectedChunkId: "quality-chunk-1",
      startOffset: 0,
      endOffset: 31,
      quote: "아린은 <b>봉인된</b>\n편지를 읽고 백야회의 목적을 깨달았다.",
      updatedAt: nowIso,
    });

    const report = await auditMemoryEvalCaseQuality({ projectId });

    expect(report).toEqual({
      evalCasesScanned: 1,
      evalEvidenceScanned: 1,
      evidenceQuoteMissingInExpectedChunk: 0,
      expectedAnswerUnsupported: 1,
      repairedExpectedAnswers: 0,
    });

    const repaired = await auditMemoryEvalCaseQuality({
      projectId,
      repairExpectedAnswers: true,
      nowIso: "2026-06-12T00:00:00.000Z",
    });

    expect(repaired).toEqual({
      evalCasesScanned: 1,
      evalEvidenceScanned: 1,
      evidenceQuoteMissingInExpectedChunk: 0,
      expectedAnswerUnsupported: 1,
      repairedExpectedAnswers: 1,
    });

    const [evalCase] = await db
      .getClient()
      .select()
      .from(memoryEvalCase)
      .where(eq(memoryEvalCase.id, caseId));
    expect(evalCase).toMatchObject({
      expectedAnswer: "아린은 봉인된 편지를 읽고 백야회의 목적을 깨달았다.",
      updatedAt: "2026-06-12T00:00:00.000Z",
    });
  });
});
