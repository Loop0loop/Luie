import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  chapter,
  db,
  memoryChunk,
  memoryEntity,
  memoryEntityMention,
  memoryEpisode,
  memoryEpisodeEvidence,
  memoryFact,
  memoryFactEvidence,
  project,
} from "../../../../../src/main/infra/database/index.js";
import { getMemoryReviewBacklogReport } from "../../../../../src/main/services/features/memory/review/memoryReviewBacklogReport.js";

describe("getMemoryReviewBacklogReport", () => {
  it("returns suggested entity and fact candidates with review evidence", async () => {
    const projectId = crypto.randomUUID();
    const chapterId = crypto.randomUUID();
    const entityId = crypto.randomUUID();
    const episodeId = crypto.randomUUID();
    const episodeEvidenceId = crypto.randomUUID();
    const factId = crypto.randomUUID();
    const nowIso = "2026-06-08T00:00:00.000Z";

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Review Backlog",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });
    await db.getClient().insert(chapter).values({
      id: chapterId,
      projectId,
      title: "1화",
      content: "아린은 백야회에 들어간다.",
      order: 1,
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
    await db.getClient().insert(memoryEntityMention).values({
      id: crypto.randomUUID(),
      projectId,
      entityId,
      aliasId: null,
      chapterId,
      chunkId: null,
      contentHash: "mention-hash",
      sourceContentHash: "source-hash",
      startOffset: 0,
      endOffset: 2,
      quote: "아린",
      extractorVersion: "entity-v1",
      confidence: 80,
      status: "suggested",
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEpisode).values({
      id: episodeId,
      projectId,
      sourceType: "chapter",
      sourceId: chapterId,
      chapterId,
      sceneId: null,
      sourceContentHash: "source-hash",
      extractorVersion: "episode-v1",
      episodeType: "event",
      title: "아린의 가입",
      summary: "아린이 백야회에 들어간다.",
      status: "suggested",
      confidence: 80,
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEpisodeEvidence).values({
      id: episodeEvidenceId,
      projectId,
      episodeId,
      chapterId,
      chunkId: null,
      contentHash: "content-hash",
      sourceContentHash: "source-hash",
      startOffset: 0,
      endOffset: 12,
      quote: "아린은 백야회에 들어간다.",
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryFact).values({
      id: factId,
      projectId,
      subjectEntityId: entityId,
      predicate: "belongs_to",
      objectEntityId: null,
      objectValue: "백야회",
      valueType: "string",
      validFromChapterId: chapterId,
      validFromChapterOrder: 1,
      validToChapterId: null,
      validToChapterOrder: null,
      observedAtChapterId: chapterId,
      observedAtChapterOrder: 1,
      confidence: 88,
      status: "suggested",
      extractorVersion: "fact-v1",
      sourceContentHash: "source-hash",
      invalidatedByFactId: null,
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryFactEvidence).values({
      id: crypto.randomUUID(),
      projectId,
      factId,
      evidenceId: episodeEvidenceId,
      updatedAt: nowIso,
    });

    const report = await getMemoryReviewBacklogReport({
      projectId,
      evidenceLimit: 2,
    });

    expect(report.counts).toEqual({
      suggestedEntities: 1,
      suggestedFacts: 1,
      staleEvidence: 0,
    });
    expect(report.entityCandidates).toEqual([
      expect.objectContaining({
        id: entityId,
        canonicalName: "아린",
        mentionCount: 1,
        mentions: [
          expect.objectContaining({
            quote: "아린",
            chapterOrder: 1,
          }),
        ],
      }),
    ]);
    expect(report.factCandidates).toEqual([
      expect.objectContaining({
        id: factId,
        subjectName: "아린",
        predicate: "belongs_to",
        evidenceCount: 1,
        evidence: [
          expect.objectContaining({
            quote: "아린은 백야회에 들어간다.",
            chapterOrder: 1,
          }),
        ],
      }),
    ]);
  });

  it("includes stale confirmed evidence as review backlog items after repair cannot resolve it", async () => {
    const projectId = crypto.randomUUID();
    const entityId = crypto.randomUUID();
    const episodeId = crypto.randomUUID();
    const episodeEvidenceId = crypto.randomUUID();
    const mentionId = crypto.randomUUID();
    const staleChunkId = crypto.randomUUID();
    const nowIso = "2026-06-08T00:00:00.000Z";

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Stale Evidence Backlog",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryChunk).values({
      id: staleChunkId,
      projectId,
      sourceType: "chapter",
      sourceId: "chapter-1",
      chapterId: null,
      sceneId: null,
      chunkIndex: 0,
      content: "이 chunk에는 더 이상 근거 문장이 없다.",
      contentHash: "stale-content-hash",
      indexText: "이 chunk에는 더 이상 근거 문장이 없다.",
      indexTextHash: "stale-index-hash",
      contextLabel: "chapter: stale",
      sourceContentHash: "source-hash",
      startOffset: 0,
      endOffset: 20,
      paragraphStartIndex: 0,
      paragraphEndIndex: 0,
      tokenCount: 20,
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEntity).values({
      id: entityId,
      projectId,
      entityType: "character",
      canonicalName: "아린",
      status: "confirmed",
      confidence: 90,
      createdBy: "system",
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEntityMention).values({
      id: mentionId,
      projectId,
      entityId,
      aliasId: null,
      chapterId: null,
      chunkId: staleChunkId,
      contentHash: "old-mention-hash",
      sourceContentHash: "source-hash",
      startOffset: 0,
      endOffset: 2,
      quote: "아린",
      extractorVersion: "entity-v1",
      confidence: 90,
      status: "suggested",
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
      episodeType: "event",
      title: "아린의 결심",
      summary: "아린이 백야회에 들어가기로 결심한다.",
      status: "confirmed",
      confidence: 80,
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEpisodeEvidence).values({
      id: episodeEvidenceId,
      projectId,
      episodeId,
      chapterId: null,
      chunkId: "missing-chunk-id",
      contentHash: "old-content-hash",
      sourceContentHash: "source-hash",
      startOffset: 0,
      endOffset: 12,
      quote: "아린은 백야회에 들어가기로 결심했다.",
      updatedAt: nowIso,
    });

    const report = await getMemoryReviewBacklogReport({
      projectId,
      evidenceLimit: 2,
    });

    expect(report.counts.staleEvidence).toBe(2);
    expect(report.staleEvidence).toEqual([
      expect.objectContaining({
        kind: "entity_mention",
        id: mentionId,
        ownerId: entityId,
        ownerTitle: "아린",
        reason: "quote_missing_from_chunk",
      }),
      expect.objectContaining({
        kind: "episode_evidence",
        id: episodeEvidenceId,
        ownerId: episodeId,
        ownerTitle: "아린의 결심",
        reason: "chunk_missing",
      }),
    ]);
  });
});
