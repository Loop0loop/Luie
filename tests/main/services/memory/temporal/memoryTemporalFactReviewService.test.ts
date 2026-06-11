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
  memoryFactInvalidation,
  project,
} from "../../../../../src/main/infra/database/index.js";
import {
  backfillLegacyConfirmedMemoryFactCanonStatus,
  confirmMemoryTemporalFact,
  listSuggestedMemoryTemporalFacts,
  rejectMemoryTemporalFact,
  resolveMemoryTemporalFactConflict,
} from "../../../../../src/main/services/features/memory/temporal/memoryTemporalFactReviewService.js";

describe("memoryTemporalFactReviewService", () => {
  async function seedFact(input?: {
    provenanceKind?: string;
    canonStatus?: string;
    status?: string;
  }) {
    const projectId = crypto.randomUUID();
    const chapterId = crypto.randomUUID();
    const subjectId = crypto.randomUUID();
    const objectId = crypto.randomUUID();
    const factId = crypto.randomUUID();
    const nowIso = "2026-06-08T00:00:00.000Z";

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Temporal Fact Review",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });
    await db.getClient().insert(chapter).values({
      id: chapterId,
      projectId,
      title: "10화",
      content: "",
      order: 10,
      updatedAt: nowIso,
    });
    await db
      .getClient()
      .insert(memoryEntity)
      .values([
        {
          id: subjectId,
          projectId,
          entityType: "character",
          canonicalName: "아린",
          status: "confirmed",
          confidence: 100,
          createdBy: "system",
          updatedAt: nowIso,
        },
        {
          id: objectId,
          projectId,
          entityType: "faction",
          canonicalName: "백야회",
          status: "confirmed",
          confidence: 100,
          createdBy: "system",
          updatedAt: nowIso,
        },
      ]);
    await db.getClient().insert(memoryFact).values({
      id: factId,
      projectId,
      subjectEntityId: subjectId,
      predicate: "belongs_to",
      objectEntityId: objectId,
      objectValue: null,
      valueType: "entity",
      validFromChapterId: chapterId,
      validFromChapterOrder: 10,
      validToChapterId: null,
      validToChapterOrder: null,
      observedAtChapterId: chapterId,
      observedAtChapterOrder: 10,
      confidence: 88,
      status: input?.status ?? "suggested",
      provenanceKind: input?.provenanceKind,
      canonStatus: input?.canonStatus,
      extractorVersion: "fact-v1",
      sourceContentHash: "source-hash",
      invalidatedByFactId: null,
      updatedAt: nowIso,
    });

    return { projectId, chapterId, factId, nowIso, subjectId, objectId };
  }

  async function attachChapterEvidence(input: {
    projectId: string;
    chapterId: string;
    factId: string;
    nowIso: string;
    sourceType?: string;
  }) {
    const episodeId = crypto.randomUUID();
    const evidenceId = crypto.randomUUID();
    await db.getClient().insert(memoryEpisode).values({
      id: episodeId,
      projectId: input.projectId,
      sourceType: input.sourceType ?? "chapter",
      sourceId: input.chapterId,
      chapterId: input.chapterId,
      sceneId: null,
      sourceContentHash: "source-hash",
      extractorVersion: "episode-v1",
      episodeType: "relationship",
      title: "가입",
      summary: "아린이 백야회 소속임이 드러난다.",
      status: "confirmed",
      confidence: 90,
      updatedAt: input.nowIso,
    });
    await db.getClient().insert(memoryEpisodeEvidence).values({
      id: evidenceId,
      projectId: input.projectId,
      episodeId,
      chapterId: input.chapterId,
      chunkId: null,
      contentHash: "content-hash",
      sourceContentHash: "source-hash",
      startOffset: 0,
      endOffset: 12,
      quote: "아린은 백야회의 문장을 들어 보였다.",
      updatedAt: input.nowIso,
    });
    await db.getClient().insert(memoryFactEvidence).values({
      id: crypto.randomUUID(),
      projectId: input.projectId,
      factId: input.factId,
      evidenceId,
      updatedAt: input.nowIso,
    });
  }

  it("lists suggested temporal facts with entity names", async () => {
    const seed = await seedFact();

    const result = await listSuggestedMemoryTemporalFacts({
      projectId: seed.projectId,
      limit: 20,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: seed.factId,
      predicate: "belongs_to",
      subjectEntityName: "아린",
      objectEntityName: "백야회",
      status: "suggested",
    });
  });

  it("confirms a suggested temporal fact as user-approved canonical memory", async () => {
    const seed = await seedFact({ provenanceKind: "canon", canonStatus: "canon" });
    await attachChapterEvidence(seed);

    const result = await confirmMemoryTemporalFact({
      projectId: seed.projectId,
      factId: seed.factId,
      nowIso: seed.nowIso,
    });

    expect(result).toEqual({
      updated: true,
      status: "confirmed",
      canonicalExportable: true,
    });
    const [row] = await db
      .getClient()
      .select()
      .from(memoryFact)
      .where(eq(memoryFact.id, seed.factId));
    expect(row.status).toBe("confirmed");
    expect(row.provenanceKind).toBe("canon");
    expect(row.canonStatus).toBe("canon");
  });

  it("blocks confirmation when provenance and canon status are missing", async () => {
    const seed = await seedFact();

    await expect(
      confirmMemoryTemporalFact({
        projectId: seed.projectId,
        factId: seed.factId,
        nowIso: seed.nowIso,
      }),
    ).rejects.toThrow("MEMORY_FACT_CANON_STATUS_REQUIRED");

    const [row] = await db
      .getClient()
      .select()
      .from(memoryFact)
      .where(eq(memoryFact.id, seed.factId));
    expect(row.status).toBe("suggested");
  });

  it("blocks confirmation when canonical temporal fact evidence is missing", async () => {
    const seed = await seedFact({ provenanceKind: "canon", canonStatus: "canon" });

    await expect(
      confirmMemoryTemporalFact({
        projectId: seed.projectId,
        factId: seed.factId,
        nowIso: seed.nowIso,
      }),
    ).rejects.toThrow("MEMORY_FACT_EVIDENCE_REQUIRED");

    const [row] = await db
      .getClient()
      .select()
      .from(memoryFact)
      .where(eq(memoryFact.id, seed.factId));
    expect(row.status).toBe("suggested");
  });

  it("blocks draft or discarded facts from becoming confirmed canonical memory", async () => {
    const draftSeed = await seedFact({
      provenanceKind: "draft",
      canonStatus: "draft",
    });

    await expect(
      confirmMemoryTemporalFact({
        projectId: draftSeed.projectId,
        factId: draftSeed.factId,
        nowIso: draftSeed.nowIso,
      }),
    ).rejects.toThrow("MEMORY_FACT_CANON_STATUS_REQUIRED");

    const [row] = await db
      .getClient()
      .select()
      .from(memoryFact)
      .where(eq(memoryFact.id, draftSeed.factId));
    expect(row.status).toBe("suggested");
    expect(row.provenanceKind).toBe("draft");
    expect(row.canonStatus).toBe("draft");
  });

  it("backfills only legacy confirmed facts with chapter or scene evidence as canonical memory", async () => {
    const canonicalSeed = await seedFact({ status: "confirmed" });
    const noteSeed = await seedFact({ status: "confirmed" });
    const noEvidenceSeed = await seedFact({ status: "confirmed" });
    await attachChapterEvidence(canonicalSeed);
    await attachChapterEvidence({ ...noteSeed, sourceType: "note" });

    const result = await backfillLegacyConfirmedMemoryFactCanonStatus({
      projectId: canonicalSeed.projectId,
      nowIso: canonicalSeed.nowIso,
    });
    await backfillLegacyConfirmedMemoryFactCanonStatus({
      projectId: noteSeed.projectId,
      nowIso: noteSeed.nowIso,
    });
    await backfillLegacyConfirmedMemoryFactCanonStatus({
      projectId: noEvidenceSeed.projectId,
      nowIso: noEvidenceSeed.nowIso,
    });

    expect(result.updated).toBe(1);
    const rows = await db
      .getClient()
      .select({
        id: memoryFact.id,
        provenanceKind: memoryFact.provenanceKind,
        canonStatus: memoryFact.canonStatus,
      })
      .from(memoryFact);
    const byId = new Map(rows.map((row) => [row.id, row]));
    expect(byId.get(canonicalSeed.factId)).toMatchObject({
      provenanceKind: "canon",
      canonStatus: "canon",
    });
    expect(byId.get(noteSeed.factId)).toMatchObject({
      provenanceKind: "unknown",
      canonStatus: "unknown",
    });
    expect(byId.get(noEvidenceSeed.factId)).toMatchObject({
      provenanceKind: "unknown",
      canonStatus: "unknown",
    });
  });

  it("rejects a suggested temporal fact with a reason", async () => {
    const seed = await seedFact();

    const result = await rejectMemoryTemporalFact({
      projectId: seed.projectId,
      factId: seed.factId,
      reason: "관계가 명확하지 않음",
      nowIso: seed.nowIso,
    });

    expect(result.updated).toBe(true);
    const [row] = await db
      .getClient()
      .select()
      .from(memoryFact)
      .where(eq(memoryFact.id, seed.factId));
    expect(row.status).toBe("rejected");
    expect(row.rejectionReason).toBe("관계가 명확하지 않음");
  });

  it("resolves a conflict by confirming the winner and rejecting the opposing fact in one transaction", async () => {
    const seed = await seedFact({ provenanceKind: "canon", canonStatus: "canon" });
    await attachChapterEvidence(seed);
    const losingFactId = crypto.randomUUID();
    const conflictId = crypto.randomUUID();

    await db.getClient().insert(memoryFact).values({
      id: losingFactId,
      projectId: seed.projectId,
      subjectEntityId: seed.subjectId,
      predicate: "hostile_to",
      objectEntityId: seed.objectId,
      objectValue: null,
      valueType: "entity",
      validFromChapterId: seed.chapterId,
      validFromChapterOrder: 10,
      validToChapterId: null,
      validToChapterOrder: null,
      observedAtChapterId: seed.chapterId,
      observedAtChapterOrder: 10,
      confidence: 70,
      status: "conflicting",
      provenanceKind: "canon",
      canonStatus: "canon",
      extractorVersion: "fact-v1",
      sourceContentHash: "source-hash",
      invalidatedByFactId: null,
      updatedAt: seed.nowIso,
    });
    await db.getClient().insert(memoryFactInvalidation).values({
      id: conflictId,
      projectId: seed.projectId,
      invalidatedFactId: losingFactId,
      invalidatingFactId: seed.factId,
      reason: "same relation slot",
      updatedAt: seed.nowIso,
    });

    const result = await resolveMemoryTemporalFactConflict({
      projectId: seed.projectId,
      conflictId,
      winnerFactId: seed.factId,
      reason: "검토 후 신규 사실 채택",
      nowIso: seed.nowIso,
    });

    expect(result.updated).toBe(true);
    const rows = await db
      .getClient()
      .select()
      .from(memoryFact)
      .where(eq(memoryFact.projectId, seed.projectId));
    const winner = rows.find((row) => row.id === seed.factId);
    const loser = rows.find((row) => row.id === losingFactId);

    expect(winner?.status).toBe("confirmed");
    expect(loser?.status).toBe("rejected");
    expect(loser?.invalidatedByFactId).toBe(seed.factId);
    expect(loser?.rejectionReason).toBe("검토 후 신규 사실 채택");
  });
});
