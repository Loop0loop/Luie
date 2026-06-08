import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  chapter,
  db,
  memoryEntity,
  memoryEpisode,
  memoryEpisodeEvidence,
  memoryFact,
  memoryFactEvidence,
  memoryRelationState,
  project,
} from "../../../../../src/main/infra/database/index.js";
import {
  processPendingTemporalFactExtraction,
  type MemoryTemporalFactExtractor,
} from "../../../../../src/main/services/features/memory/temporal/memoryTemporalFactExtractionRunner.js";

describe("processPendingTemporalFactExtraction", () => {
  it("extracts temporal facts from episode evidence and stores suggested state rows", async () => {
    const projectId = crypto.randomUUID();
    const chapterId = crypto.randomUUID();
    const episodeId = crypto.randomUUID();
    const evidenceId = crypto.randomUUID();
    const arinId = crypto.randomUUID();
    const baekyaId = crypto.randomUUID();
    const nowIso = "2026-06-08T00:00:00.000Z";

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Temporal Fact Runner",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });
    await db.getClient().insert(chapter).values({
      id: chapterId,
      projectId,
      title: "10화",
      content: "아린은 백야회에 들어간다.",
      order: 10,
      updatedAt: nowIso,
    });
    await db
      .getClient()
      .insert(memoryEntity)
      .values([
        {
          id: arinId,
          projectId,
          entityType: "character",
          canonicalName: "아린",
          status: "confirmed",
          confidence: 100,
          createdBy: "system",
          updatedAt: nowIso,
        },
        {
          id: baekyaId,
          projectId,
          entityType: "faction",
          canonicalName: "백야회",
          status: "confirmed",
          confidence: 100,
          createdBy: "system",
          updatedAt: nowIso,
        },
      ]);
    await db.getClient().insert(memoryEpisode).values({
      id: episodeId,
      projectId,
      sourceType: "chapter",
      sourceId: chapterId,
      chapterId,
      sceneId: null,
      sourceContentHash: "source-hash",
      extractorVersion: "episode-v1",
      episodeType: "relation_changes",
      title: "아린이 백야회에 들어감",
      summary: "아린은 백야회에 들어간다.",
      status: "suggested",
      confidence: 90,
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEpisodeEvidence).values({
      id: evidenceId,
      projectId,
      episodeId,
      chapterId,
      chunkId: "chunk-1",
      contentHash: "chunk-hash",
      sourceContentHash: "source-hash",
      startOffset: 0,
      endOffset: 14,
      quote: "아린은 백야회에 들어간다.",
      updatedAt: nowIso,
    });

    const extractor: MemoryTemporalFactExtractor = async (input) => {
      expect(input.evidence).toHaveLength(1);
      expect(
        input.entities.map((entity) => entity.canonicalName).sort(),
      ).toEqual(["아린", "백야회"].sort());
      return [
        {
          subjectEntityId: arinId,
          predicate: "belongs_to",
          objectEntityId: baekyaId,
          objectValue: null,
          valueType: "entity",
          validFromChapterId: chapterId,
          validFromChapterOrder: 10,
          validToChapterId: null,
          validToChapterOrder: null,
          observedAtChapterId: chapterId,
          observedAtChapterOrder: 10,
          confidence: 88,
          sourceContentHash: "source-hash",
          evidenceIds: [evidenceId],
          projection: {
            kind: "relation",
            sourceEntityId: arinId,
            targetEntityId: baekyaId,
            relation: "belongs_to",
          },
        },
      ];
    };

    const result = await processPendingTemporalFactExtraction({
      projectId,
      extractor,
      nowIso,
      limit: 20,
    });

    expect(result).toEqual({ extracted: 1 });

    const facts = await db
      .getClient()
      .select()
      .from(memoryFact)
      .where(eq(memoryFact.projectId, projectId));
    const factEvidence = await db
      .getClient()
      .select()
      .from(memoryFactEvidence)
      .where(eq(memoryFactEvidence.factId, facts[0].id));
    const relationRows = await db
      .getClient()
      .select()
      .from(memoryRelationState)
      .where(eq(memoryRelationState.factId, facts[0].id));

    expect(facts).toHaveLength(1);
    expect(facts[0].predicate).toBe("belongs_to");
    expect(factEvidence).toHaveLength(1);
    expect(relationRows).toHaveLength(1);
  });
});
