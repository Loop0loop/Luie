import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  chapter,
  db,
  memoryEntity,
  memoryFact,
  memoryFactInvalidation,
  project,
} from "../../../../../src/main/infra/database/index.js";
import {
  confirmMemoryTemporalFact,
  listSuggestedMemoryTemporalFacts,
  rejectMemoryTemporalFact,
  resolveMemoryTemporalFactConflict,
} from "../../../../../src/main/services/features/memory/temporal/memoryTemporalFactReviewService.js";

describe("memoryTemporalFactReviewService", () => {
  async function seedFact() {
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
      status: "suggested",
      extractorVersion: "fact-v1",
      sourceContentHash: "source-hash",
      invalidatedByFactId: null,
      updatedAt: nowIso,
    });

    return { projectId, chapterId, factId, nowIso, subjectId, objectId };
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
    const seed = await seedFact();

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
    const seed = await seedFact();
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
