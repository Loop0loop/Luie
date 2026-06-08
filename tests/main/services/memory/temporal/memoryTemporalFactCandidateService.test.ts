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
  memoryKnowledgeState,
  memoryRelationState,
  project,
} from "../../../../../src/main/infra/database/index.js";
import { createMemoryTemporalFactCandidate } from "../../../../../src/main/services/features/memory/temporal/memoryTemporalFactCandidateService.js";

describe("createMemoryTemporalFactCandidate", () => {
  async function seedEvidence() {
    const projectId = crypto.randomUUID();
    const chapterId = crypto.randomUUID();
    const episodeId = crypto.randomUUID();
    const evidenceId = crypto.randomUUID();
    const arinId = crypto.randomUUID();
    const baekyaId = crypto.randomUUID();
    const nowIso = "2026-06-08T00:00:00.000Z";

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Temporal Fact Candidate",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });
    await db.getClient().insert(chapter).values({
      id: chapterId,
      projectId,
      title: "10화",
      content: "아린은 백야회의 목적을 알게 된다.",
      order: 10,
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEntity).values([
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
      episodeType: "character_learns_secret",
      title: "아린이 백야회의 목적을 알게 됨",
      summary: "아린은 백야회의 목적을 알게 된다.",
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
      endOffset: 18,
      quote: "아린은 백야회의 목적을 알게 된다.",
      updatedAt: nowIso,
    });

    return { projectId, chapterId, evidenceId, arinId, baekyaId, nowIso };
  }

  it("stores a relation fact with evidence and relation state projection", async () => {
    const seed = await seedEvidence();

    const rows = await createMemoryTemporalFactCandidate({
      nowIso: seed.nowIso,
      projectId: seed.projectId,
      subjectEntityId: seed.arinId,
      predicate: "belongs_to",
      objectEntityId: seed.baekyaId,
      objectValue: null,
      valueType: "entity",
      validFromChapterId: seed.chapterId,
      validFromChapterOrder: 10,
      validToChapterId: null,
      validToChapterOrder: null,
      observedAtChapterId: seed.chapterId,
      observedAtChapterOrder: 10,
      confidence: 85,
      extractorVersion: "fact-v1",
      sourceContentHash: "source-hash",
      evidenceIds: [seed.evidenceId],
      projection: {
        kind: "relation",
        sourceEntityId: seed.arinId,
        targetEntityId: seed.baekyaId,
        relation: "belongs_to",
      },
    });

    const factRows = await db
      .getClient()
      .select()
      .from(memoryFact)
      .where(eq(memoryFact.id, rows.fact.id));
    const evidenceRows = await db
      .getClient()
      .select()
      .from(memoryFactEvidence)
      .where(eq(memoryFactEvidence.factId, rows.fact.id));
    const relationRows = await db
      .getClient()
      .select()
      .from(memoryRelationState)
      .where(eq(memoryRelationState.factId, rows.fact.id));

    expect(factRows).toHaveLength(1);
    expect(factRows[0]).toMatchObject({
      status: "suggested",
      predicate: "belongs_to",
      objectEntityId: seed.baekyaId,
      confidence: 85,
    });
    expect(evidenceRows).toHaveLength(1);
    expect(relationRows).toHaveLength(1);
    expect(relationRows[0]).toMatchObject({
      sourceEntityId: seed.arinId,
      targetEntityId: seed.baekyaId,
      relation: "belongs_to",
    });
  });

  it("rejects fact candidates without evidence", async () => {
    const seed = await seedEvidence();

    await expect(
      createMemoryTemporalFactCandidate({
        nowIso: seed.nowIso,
        projectId: seed.projectId,
        subjectEntityId: seed.arinId,
        predicate: "knows_secret",
        objectEntityId: seed.baekyaId,
        objectValue: null,
        valueType: "entity",
        validFromChapterId: seed.chapterId,
        validFromChapterOrder: 10,
        validToChapterId: null,
        validToChapterOrder: null,
        observedAtChapterId: seed.chapterId,
        observedAtChapterOrder: 10,
        confidence: 80,
        extractorVersion: "fact-v1",
        sourceContentHash: "source-hash",
        evidenceIds: [],
        projection: {
          kind: "knowledge",
          knowerEntityId: seed.arinId,
          secretEntityId: seed.baekyaId,
          knowledgeKey: "백야회 목적",
          knowledgeValue: "known",
        },
      }),
    ).rejects.toThrow("MEMORY_TEMPORAL_FACT_REQUIRES_EVIDENCE");
  });

  it("stores a knowledge fact with evidence and knowledge state projection", async () => {
    const seed = await seedEvidence();

    const rows = await createMemoryTemporalFactCandidate({
      nowIso: seed.nowIso,
      projectId: seed.projectId,
      subjectEntityId: seed.arinId,
      predicate: "knows_secret",
      objectEntityId: seed.baekyaId,
      objectValue: null,
      valueType: "entity",
      validFromChapterId: seed.chapterId,
      validFromChapterOrder: 10,
      validToChapterId: null,
      validToChapterOrder: null,
      observedAtChapterId: seed.chapterId,
      observedAtChapterOrder: 10,
      confidence: 90,
      extractorVersion: "fact-v1",
      sourceContentHash: "source-hash",
      evidenceIds: [seed.evidenceId],
      projection: {
        kind: "knowledge",
        knowerEntityId: seed.arinId,
        secretEntityId: seed.baekyaId,
        knowledgeKey: "백야회 목적",
        knowledgeValue: "known",
      },
    });

    const knowledgeRows = await db
      .getClient()
      .select()
      .from(memoryKnowledgeState)
      .where(eq(memoryKnowledgeState.factId, rows.fact.id));

    expect(knowledgeRows).toHaveLength(1);
    expect(knowledgeRows[0]).toMatchObject({
      knowerEntityId: seed.arinId,
      secretEntityId: seed.baekyaId,
      knowledgeKey: "백야회 목적",
      knowledgeValue: "known",
    });
  });
});
