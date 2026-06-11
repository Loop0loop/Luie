import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  db,
  memoryChunk,
  memoryEntity,
  memoryEntityMention,
  memoryEvalCase,
  memoryEvalEvidence,
  memoryEpisode,
  memoryEpisodeEvidence,
  project,
} from "../../../../src/main/infra/database/index.js";
import { repairMemoryEvidenceChunkLinks } from "../../../../src/main/services/features/memory/repair/memoryEvidenceChunkLinkRepair.js";

describe("repairMemoryEvidenceChunkLinks", () => {
  it("relinks stale episode evidence and entity mentions to current chunks", async () => {
    const projectId = crypto.randomUUID();
    const entityId = crypto.randomUUID();
    const episodeId = crypto.randomUUID();
    const episodeEvidenceId = crypto.randomUUID();
    const evalCaseId = crypto.randomUUID();
    const evalEvidenceId = crypto.randomUUID();
    const mentionId = crypto.randomUUID();
    const currentChunkId = crypto.randomUUID();
    const nowIso = "2026-06-08T00:00:00.000Z";

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Repair Memory Evidence",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryChunk).values({
      id: currentChunkId,
      projectId,
      sourceType: "chapter",
      sourceId: "chapter-1",
      chapterId: null,
      sceneId: null,
      chunkIndex: 0,
      content:
        "앞부분. 아린은 봉인된 편지를 읽고 백야회의 목적을 깨달았다. 뒷부분.",
      contentHash: "current-chunk-hash",
      indexText:
        "앞부분. 아린은 봉인된 편지를 읽고 백야회의 목적을 깨달았다. 뒷부분.",
      indexTextHash: "current-index-hash",
      contextLabel: "chapter: repair",
      sourceContentHash: "source-hash",
      startOffset: 100,
      endOffset: 180,
      paragraphStartIndex: 1,
      paragraphEndIndex: 1,
      tokenCount: 80,
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEntity).values({
      id: entityId,
      projectId,
      entityType: "character",
      canonicalName: "아린",
      status: "suggested",
      confidence: 90,
      createdBy: "system",
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
      title: "아린이 목적을 알게 됨",
      summary: "아린은 백야회의 목적을 알게 된다.",
      status: "suggested",
      confidence: 0,
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEpisodeEvidence).values({
      id: episodeEvidenceId,
      projectId,
      episodeId,
      chapterId: null,
      chunkId: "stale-chunk-id",
      contentHash: "old-chunk-hash",
      sourceContentHash: "source-hash",
      startOffset: 104,
      endOffset: 134,
      quote: "아린은 봉인된 편지를 읽고 백야회의 목적을 깨달았다.",
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEntityMention).values({
      id: mentionId,
      projectId,
      entityId,
      aliasId: null,
      chapterId: null,
      chunkId: "stale-mention-chunk-id",
      contentHash: "old-mention-hash",
      sourceContentHash: "source-hash",
      startOffset: 104,
      endOffset: 106,
      quote: "아린",
      extractorVersion: "entity-v1",
      confidence: 90,
      status: "suggested",
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEvalCase).values({
      id: evalCaseId,
      projectId,
      name: "stale eval evidence",
      question: "근거를 찾아라.",
      caseType: "qa",
      expectedAnswer: "백야회의 목적",
      temporalScopeStartChapterId: null,
      temporalScopeEndChapterId: null,
      severity: "p1",
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEvalEvidence).values({
      id: evalEvidenceId,
      caseId: evalCaseId,
      projectId,
      chapterId: null,
      expectedChunkId: "stale-eval-chunk-id",
      startOffset: 104,
      endOffset: 134,
      quote: "아린은 봉인된 편지를 읽고 백야회의 목적을 깨달았다.",
      updatedAt: nowIso,
    });

    const result = await repairMemoryEvidenceChunkLinks({ projectId, nowIso });

    expect(result).toEqual({
      episodeEvidenceScanned: 1,
      episodeEvidenceRepaired: 1,
      episodeEvidenceUnresolved: 0,
      entityMentionScanned: 1,
      entityMentionRepaired: 1,
      entityMentionUnresolved: 0,
      evalEvidenceScanned: 1,
      evalEvidenceRepaired: 1,
      evalEvidenceUnresolved: 0,
    });

    const [episodeEvidence] = await db
      .getClient()
      .select()
      .from(memoryEpisodeEvidence)
      .where(eq(memoryEpisodeEvidence.id, episodeEvidenceId));
    expect(episodeEvidence).toMatchObject({
      chunkId: currentChunkId,
      contentHash: "current-chunk-hash",
    });

    const [mention] = await db
      .getClient()
      .select()
      .from(memoryEntityMention)
      .where(eq(memoryEntityMention.id, mentionId));
    expect(mention).toMatchObject({
      chunkId: currentChunkId,
      contentHash: "current-chunk-hash",
    });

    const [evalEvidence] = await db
      .getClient()
      .select()
      .from(memoryEvalEvidence)
      .where(eq(memoryEvalEvidence.id, evalEvidenceId));
    expect(evalEvidence).toMatchObject({
      expectedChunkId: currentChunkId,
    });
  });

  it("relinks eval evidence when the stored chunk exists but does not contain the quote", async () => {
    const projectId = crypto.randomUUID();
    const evalCaseId = crypto.randomUUID();
    const evalEvidenceId = crypto.randomUUID();
    const wrongChunkId = crypto.randomUUID();
    const currentChunkId = crypto.randomUUID();
    const nowIso = "2026-06-08T00:00:00.000Z";

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Repair Wrong Eval Chunk",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });
    await db
      .getClient()
      .insert(memoryChunk)
      .values([
        {
          id: wrongChunkId,
          projectId,
          sourceType: "chapter",
          sourceId: "chapter-1",
          chapterId: null,
          sceneId: null,
          chunkIndex: 0,
          content: "아린은 전혀 다른 장면에서 침묵했다.",
          contentHash: "wrong-chunk-hash",
          indexText: "아린은 전혀 다른 장면에서 침묵했다.",
          indexTextHash: "wrong-index-hash",
          contextLabel: "chapter: wrong",
          sourceContentHash: "source-hash",
          startOffset: 0,
          endOffset: 20,
          paragraphStartIndex: 0,
          paragraphEndIndex: 0,
          tokenCount: 20,
          updatedAt: nowIso,
        },
        {
          id: currentChunkId,
          projectId,
          sourceType: "chapter",
          sourceId: "chapter-1",
          chapterId: null,
          sceneId: null,
          chunkIndex: 1,
          content:
            "앞부분. 나는 아내의 이름을 속으로만 한 번 불러 보았다. 뒷부분.",
          contentHash: "current-chunk-hash",
          indexText:
            "앞부분. 나는 아내의 이름을 속으로만 한 번 불러 보았다. 뒷부분.",
          indexTextHash: "current-index-hash",
          contextLabel: "chapter: current",
          sourceContentHash: "source-hash",
          startOffset: 100,
          endOffset: 170,
          paragraphStartIndex: 1,
          paragraphEndIndex: 1,
          tokenCount: 70,
          updatedAt: nowIso,
        },
      ]);
    await db.getClient().insert(memoryEvalCase).values({
      id: evalCaseId,
      projectId,
      name: "wrong eval evidence",
      question: "아내의 이름 근거를 찾아라.",
      caseType: "qa",
      expectedAnswer: "나는 아내의 이름을 속으로만 한 번 불러 보았다.",
      temporalScopeStartChapterId: null,
      temporalScopeEndChapterId: null,
      severity: "p1",
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEvalEvidence).values({
      id: evalEvidenceId,
      caseId: evalCaseId,
      projectId,
      chapterId: null,
      expectedChunkId: wrongChunkId,
      startOffset: 104,
      endOffset: 134,
      quote: "나는 아내의 이름을 속으로만 한 번 불러 보았다.",
      updatedAt: nowIso,
    });

    const result = await repairMemoryEvidenceChunkLinks({ projectId, nowIso });

    expect(result.evalEvidenceScanned).toBe(1);
    expect(result.evalEvidenceRepaired).toBe(1);
    const [evalEvidence] = await db
      .getClient()
      .select()
      .from(memoryEvalEvidence)
      .where(eq(memoryEvalEvidence.id, evalEvidenceId));
    expect(evalEvidence.expectedChunkId).toBe(currentChunkId);
  });
});
