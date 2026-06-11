import crypto from "node:crypto";
import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  chapter,
  db,
  memoryEntity,
  memoryEpisode,
  memoryEpisodeEvidence,
  memoryFact,
  memoryFactEvidence,
  memoryFactInvalidation,
  project,
} from "../../../../../src/main/infra/database/index.js";
import { fetchConflictFactPairs } from "../../../../../src/main/services/features/memory/query/internal/conflicts.js";

describe("fetchConflictFactPairs", () => {
  it("returns both sides of a conflict with their evidence quotes", async () => {
    const projectId = crypto.randomUUID();
    const chapterId = crypto.randomUUID();
    const entityId = crypto.randomUUID();
    const oldFactId = crypto.randomUUID();
    const newFactId = crypto.randomUUID();
    const oldEpisodeId = crypto.randomUUID();
    const newEpisodeId = crypto.randomUUID();
    const oldEvidenceId = crypto.randomUUID();
    const newEvidenceId = crypto.randomUUID();
    const conflictId = crypto.randomUUID();
    const nowIso = "2026-06-08T00:00:00.000Z";

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Conflict Queue",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });
    await db.getClient().insert(chapter).values({
      id: chapterId,
      projectId,
      title: "3화",
      content: "",
      order: 3,
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEntity).values({
      id: entityId,
      projectId,
      entityType: "character",
      canonicalName: "아린",
      status: "confirmed",
      confidence: 100,
      createdBy: "system",
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEpisode).values([
      {
        id: oldEpisodeId,
        projectId,
        sourceType: "chapter",
        sourceId: chapterId,
        chapterId,
        sceneId: null,
        sourceContentHash: "source-hash",
        extractorVersion: "episode-v1",
        episodeType: "state",
        title: "왼손잡이",
        summary: "아린은 왼손으로 검을 잡는다.",
        status: "confirmed",
        confidence: 90,
        updatedAt: nowIso,
      },
      {
        id: newEpisodeId,
        projectId,
        sourceType: "chapter",
        sourceId: chapterId,
        chapterId,
        sceneId: null,
        sourceContentHash: "source-hash",
        extractorVersion: "episode-v1",
        episodeType: "state",
        title: "오른손잡이",
        summary: "아린은 오른손으로 검을 잡는다.",
        status: "confirmed",
        confidence: 90,
        updatedAt: nowIso,
      },
    ]);
    await db.getClient().insert(memoryEpisodeEvidence).values([
      {
        id: oldEvidenceId,
        projectId,
        episodeId: oldEpisodeId,
        chapterId,
        chunkId: "chunk-old",
        contentHash: "old-content-hash",
        sourceContentHash: "source-hash",
        startOffset: 0,
        endOffset: 18,
        quote: "아린은 왼손으로 검을 잡았다.",
        updatedAt: nowIso,
      },
      {
        id: newEvidenceId,
        projectId,
        episodeId: newEpisodeId,
        chapterId,
        chunkId: "chunk-new",
        contentHash: "new-content-hash",
        sourceContentHash: "source-hash",
        startOffset: 20,
        endOffset: 38,
        quote: "아린은 오른손으로 검을 잡았다.",
        updatedAt: nowIso,
      },
    ]);
    await db.getClient().insert(memoryFact).values([
      {
        id: oldFactId,
        projectId,
        subjectEntityId: entityId,
        predicate: "dominant_hand",
        objectEntityId: null,
        objectValue: "left",
        valueType: "string",
        validFromChapterId: chapterId,
        validFromChapterOrder: 3,
        validToChapterId: null,
        validToChapterOrder: null,
        observedAtChapterId: chapterId,
        observedAtChapterOrder: 3,
        confidence: 80,
        status: "confirmed",
        provenanceKind: "canon",
        canonStatus: "canon",
        extractorVersion: "fact-v1",
        sourceContentHash: "source-hash",
        invalidatedByFactId: null,
        updatedAt: nowIso,
      },
      {
        id: newFactId,
        projectId,
        subjectEntityId: entityId,
        predicate: "dominant_hand",
        objectEntityId: null,
        objectValue: "right",
        valueType: "string",
        validFromChapterId: chapterId,
        validFromChapterOrder: 3,
        validToChapterId: null,
        validToChapterOrder: null,
        observedAtChapterId: chapterId,
        observedAtChapterOrder: 3,
        confidence: 82,
        status: "conflicting",
        provenanceKind: "canon",
        canonStatus: "canon",
        extractorVersion: "fact-v1",
        sourceContentHash: "source-hash",
        invalidatedByFactId: oldFactId,
        updatedAt: nowIso,
      },
    ]);
    await db.getClient().insert(memoryFactEvidence).values([
      {
        id: crypto.randomUUID(),
        projectId,
        factId: oldFactId,
        evidenceId: oldEvidenceId,
        updatedAt: nowIso,
      },
      {
        id: crypto.randomUUID(),
        projectId,
        factId: newFactId,
        evidenceId: newEvidenceId,
        updatedAt: nowIso,
      },
    ]);
    await db.getClient().insert(memoryFactInvalidation).values({
      id: conflictId,
      projectId,
      invalidatedFactId: oldFactId,
      invalidatingFactId: newFactId,
      reason: "same relation slot",
      updatedAt: nowIso,
    });

    const result = await fetchConflictFactPairs({
      projectId,
      chapterOrder: null,
      includePriorMemory: false,
    });

    expect(result).toEqual([
      expect.objectContaining({
        conflictId,
        invalidatedFact: expect.objectContaining({
          id: oldFactId,
          evidenceQuotes: ["아린은 왼손으로 검을 잡았다."],
        }),
        invalidatingFact: expect.objectContaining({
          id: newFactId,
          evidenceQuotes: ["아린은 오른손으로 검을 잡았다."],
        }),
      }),
    ]);
  });

  it("excludes deferred conflict review items from the active queue", async () => {
    const projectId = crypto.randomUUID();
    const chapterId = crypto.randomUUID();
    const entityId = crypto.randomUUID();
    const oldFactId = crypto.randomUUID();
    const newFactId = crypto.randomUUID();
    const conflictId = crypto.randomUUID();
    const nowIso = "2026-06-08T00:00:00.000Z";

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Deferred Conflict Queue",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });
    await db.getClient().insert(chapter).values({
      id: chapterId,
      projectId,
      title: "3화",
      content: "",
      order: 3,
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEntity).values({
      id: entityId,
      projectId,
      entityType: "character",
      canonicalName: "아린",
      status: "confirmed",
      confidence: 100,
      createdBy: "system",
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryFact).values([
      {
        id: oldFactId,
        projectId,
        subjectEntityId: entityId,
        predicate: "dominant_hand",
        objectEntityId: null,
        objectValue: "left",
        valueType: "string",
        validFromChapterId: chapterId,
        validFromChapterOrder: 3,
        validToChapterId: null,
        validToChapterOrder: null,
        observedAtChapterId: chapterId,
        observedAtChapterOrder: 3,
        confidence: 88,
        status: "confirmed",
        provenanceKind: "canon",
        canonStatus: "canon",
        extractorVersion: "fact-v1",
        sourceContentHash: "source-hash",
        invalidatedByFactId: null,
        updatedAt: nowIso,
      },
      {
        id: newFactId,
        projectId,
        subjectEntityId: entityId,
        predicate: "dominant_hand",
        objectEntityId: null,
        objectValue: "right",
        valueType: "string",
        validFromChapterId: chapterId,
        validFromChapterOrder: 3,
        validToChapterId: null,
        validToChapterOrder: null,
        observedAtChapterId: chapterId,
        observedAtChapterOrder: 3,
        confidence: 87,
        status: "suggested",
        provenanceKind: "canon",
        canonStatus: "canon",
        extractorVersion: "fact-v1",
        sourceContentHash: "source-hash",
        invalidatedByFactId: oldFactId,
        updatedAt: nowIso,
      },
    ]);
    await db.getClient().insert(memoryFactInvalidation).values({
      id: conflictId,
      projectId,
      invalidatedFactId: oldFactId,
      invalidatingFactId: newFactId,
      reason: "same relation slot",
      updatedAt: nowIso,
    });
    await db.getClient().run(sql`
      UPDATE "MemoryFactInvalidation"
      SET "reviewStatus" = 'deferred',
          "reviewerNote" = '나중에 확인',
          "reviewedAt" = ${nowIso}
      WHERE "id" = ${conflictId};
    `);

    const result = await fetchConflictFactPairs({
      projectId,
      chapterOrder: null,
      includePriorMemory: false,
    });

    expect(result).toEqual([]);
  });
});
