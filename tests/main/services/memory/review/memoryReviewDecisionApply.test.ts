import crypto from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import {
  chapter,
  db,
  memoryEntity,
  memoryEntityMention,
  memoryFact,
  project,
} from "../../../../../src/main/infra/database/index.js";
import {
  applyMemoryReviewDecisions,
  validateMemoryReviewDecisionsAgainstDb,
  validateMemoryReviewDecisions,
} from "../../../../../src/main/services/features/memory/review/memoryReviewDecisionApply.js";

describe("applyMemoryReviewDecisions", () => {
  async function seedReviewRows() {
    const projectId = crypto.randomUUID();
    const chapterId = crypto.randomUUID();
    const entityId = crypto.randomUUID();
    const factId = crypto.randomUUID();
    const nowIso = "2026-06-08T00:00:00.000Z";

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Apply Review",
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
      confidence: 90,
      status: "suggested",
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

    return { projectId, entityId, factId, nowIso };
  }

  it("applies user review decisions and persists the package once", async () => {
    const seed = await seedReviewRows();
    const persistPackageAfterMutation = vi.fn(async () => undefined);

    const result = await applyMemoryReviewDecisions(
      {
        projectId: seed.projectId,
        entities: [{ id: seed.entityId, action: "confirm" }],
        facts: [{ id: seed.factId, action: "reject", reason: "근거 약함" }],
      },
      {
        nowIso: seed.nowIso,
        persistPackageAfterMutation,
      },
    );

    expect(result).toMatchObject({
      projectId: seed.projectId,
      attempted: 2,
      updated: 2,
      failed: 0,
      persisted: true,
    });
    expect(persistPackageAfterMutation).toHaveBeenCalledWith(
      seed.projectId,
      "memory:review-decision-apply",
    );
    const [entityRow] = await db
      .getClient()
      .select()
      .from(memoryEntity)
      .where(eq(memoryEntity.id, seed.entityId));
    const [factRow] = await db
      .getClient()
      .select()
      .from(memoryFact)
      .where(eq(memoryFact.id, seed.factId));

    expect(entityRow.status).toBe("confirmed");
    expect(factRow.status).toBe("rejected");
    expect(factRow.rejectionReason).toBe("근거 약함");
  });

  it("reports fact rejection without reason as a failed decision", async () => {
    const seed = await seedReviewRows();
    const persistPackageAfterMutation = vi.fn(async () => undefined);

    const result = await applyMemoryReviewDecisions(
      {
        projectId: seed.projectId,
        facts: [{ id: seed.factId, action: "reject" }],
      },
      {
        nowIso: seed.nowIso,
        persistPackageAfterMutation,
      },
    );

    expect(result).toMatchObject({
      attempted: 1,
      updated: 0,
      failed: 1,
      persisted: false,
    });
    expect(result.results[0]?.error).toContain("requires a non-empty reason");
    expect(persistPackageAfterMutation).not.toHaveBeenCalled();
  });

  it("validates dry-run decisions without mutating rows", () => {
    const result = validateMemoryReviewDecisions({
      projectId: "project-1",
      entities: [{ id: "entity-1", action: "TODO" }],
      facts: [{ id: "fact-1", action: "reject" }],
    });

    expect(result).toMatchObject({
      projectId: "project-1",
      attempted: 2,
      updated: 0,
      failed: 2,
      persisted: false,
    });
    expect(result.results).toEqual([
      expect.objectContaining({
        kind: "entity",
        id: "entity-1",
        action: "TODO",
        error: expect.stringContaining("Unsupported review decision action"),
      }),
      expect.objectContaining({
        kind: "fact",
        id: "fact-1",
        action: "reject",
        error: expect.stringContaining("requires a non-empty reason"),
      }),
    ]);
  });

  it("validates dry-run decisions against current DB candidate status", async () => {
    const seed = await seedReviewRows();

    await db
      .getClient()
      .update(memoryEntity)
      .set({ status: "confirmed", updatedAt: seed.nowIso })
      .where(eq(memoryEntity.id, seed.entityId));

    const result = await validateMemoryReviewDecisionsAgainstDb({
      projectId: seed.projectId,
      entities: [{ id: seed.entityId, action: "confirm" }],
      facts: [
        { id: seed.factId, action: "confirm" },
        { id: crypto.randomUUID(), action: "confirm" },
      ],
    });

    expect(result).toMatchObject({
      attempted: 3,
      updated: 0,
      failed: 2,
      persisted: false,
    });
    expect(result.results[0]).toEqual(
      expect.objectContaining({
        kind: "entity",
        id: seed.entityId,
        error: "entity review candidate is not suggested: confirmed",
      }),
    );
    expect(result.results[1]).toEqual(
      expect.objectContaining({
        kind: "fact",
        id: seed.factId,
      }),
    );
    expect(result.results[1]).not.toHaveProperty("error");
    expect(result.results[2]).toEqual(
      expect.objectContaining({
        kind: "fact",
        error: "fact review candidate not found",
      }),
    );
  });
});
