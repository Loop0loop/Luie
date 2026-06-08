import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  db,
  memoryEvalCase,
  memoryEvalEvidence,
  memoryEpisode,
  memoryEpisodeEvidence,
  project,
} from "../../../../../src/main/infra/database/index.js";
import { materializeMemoryEvalCasesFromEpisodeEvidence } from "../../../../../src/main/services/features/memory/eval/memoryEvalCaseMaterialization.js";

describe("materializeMemoryEvalCasesFromEpisodeEvidence", () => {
  it("creates evidence-recall eval cases from episode evidence", async () => {
    const projectId = crypto.randomUUID();
    const episodeId = crypto.randomUUID();
    const evidenceId = crypto.randomUUID();
    const nowIso = "2026-06-08T00:00:00.000Z";

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Eval Materialization",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEpisode).values({
      id: episodeId,
      projectId,
      sourceType: "chapter",
      sourceId: "chapter-1",
      chapterId: null,
      sceneId: null,
      sourceContentHash: "source-hash",
      extractorVersion: "episode-v1",
      episodeType: "character_learns_secret",
      title: "아린의 깨달음",
      summary: "아린은 백야회의 목적을 알게 된다.",
      status: "suggested",
      confidence: 90,
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEpisodeEvidence).values({
      id: evidenceId,
      projectId,
      episodeId,
      chapterId: null,
      chunkId: "chunk-1",
      contentHash: "chunk-hash",
      sourceContentHash: "source-hash",
      startOffset: 10,
      endOffset: 30,
      quote: "아린은 봉인된 편지를 읽고 백야회의 목적을 깨달았다.",
      updatedAt: nowIso,
    });

    const result = await materializeMemoryEvalCasesFromEpisodeEvidence({
      projectId,
      nowIso,
      limit: 10,
    });

    expect(result).toEqual({ inspected: 1, created: 1, skipped: 0 });

    const [evalCase] = await db
      .getClient()
      .select()
      .from(memoryEvalCase)
      .where(eq(memoryEvalCase.projectId, projectId));
    expect(evalCase).toMatchObject({
      projectId,
      name: "episode evidence: 아린의 깨달음",
      caseType: "qa",
      expectedAnswer: "아린은 백야회의 목적을 알게 된다.",
      severity: "p1",
    });

    const [evalEvidence] = await db
      .getClient()
      .select()
      .from(memoryEvalEvidence)
      .where(eq(memoryEvalEvidence.caseId, evalCase.id));
    expect(evalEvidence).toMatchObject({
      projectId,
      expectedChunkId: "chunk-1",
      startOffset: 10,
      endOffset: 30,
      quote: "아린은 봉인된 편지를 읽고 백야회의 목적을 깨달았다.",
    });
  });
});
