import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  chapter,
  db,
  memoryEntity,
  memoryEntityAlias,
  memoryEntityMergeAudit,
  memoryEntityMention,
  memoryFact,
  project,
} from "../../../../../src/main/infra/database/index.js";
import {
  confirmMemoryEntity,
  confirmMemoryEntityAlias,
  listSuggestedMemoryEntities,
  listSuggestedMemoryEntityAliases,
  mergeMemoryEntities,
  rejectMemoryEntity,
  rejectMemoryEntityAlias,
  splitMemoryEntityAlias,
} from "../../../../../src/main/services/features/memory/entity/memoryEntityReviewService.js";

describe("memoryEntityReviewService", () => {
  async function seedAlias() {
    const projectId = crypto.randomUUID();
    const entityId = crypto.randomUUID();
    const aliasId = crypto.randomUUID();
    const nowIso = "2026-06-08T00:00:00.000Z";

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Entity Review",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEntity).values({
      id: entityId,
      projectId,
      entityType: "character",
      canonicalName: "아린",
      status: "suggested",
      provenanceKind: "canon",
      canonStatus: "canon",
      confidence: 70,
      createdBy: "system",
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEntityAlias).values({
      id: aliasId,
      projectId,
      entityId,
      entityType: "character",
      alias: "검은 기사",
      normalizedAlias: "검은 기사",
      status: "suggested",
      updatedAt: nowIso,
    });

    return { projectId, entityId, aliasId, nowIso };
  }

  async function attachEntityMention(input: {
    projectId: string;
    entityId: string;
    aliasId?: string | null;
    nowIso: string;
    contentHash?: string;
    sourceContentHash?: string;
    quote?: string;
  }) {
    await db.getClient().insert(memoryEntityMention).values({
      id: crypto.randomUUID(),
      projectId: input.projectId,
      entityId: input.entityId,
      aliasId: input.aliasId ?? null,
      chapterId: null,
      chunkId: null,
      contentHash: input.contentHash ?? "mention-hash",
      sourceContentHash: input.sourceContentHash ?? "source-hash",
      startOffset: 0,
      endOffset: 2,
      quote: input.quote ?? "아린",
      extractorVersion: "entity-v1",
      confidence: 80,
      status: "suggested",
      updatedAt: input.nowIso,
    });
  }

  it("lists suggested aliases with canonical entity names", async () => {
    const seed = await seedAlias();

    const result = await listSuggestedMemoryEntityAliases({
      projectId: seed.projectId,
      limit: 20,
    });

    expect(result.items).toEqual([
      expect.objectContaining({
        id: seed.aliasId,
        entityId: seed.entityId,
        canonicalName: "아린",
        alias: "검은 기사",
        status: "suggested",
      }),
    ]);
  });

  it("confirms a suggested alias and canonical entity", async () => {
    const seed = await seedAlias();
    await attachEntityMention({
      projectId: seed.projectId,
      entityId: seed.entityId,
      aliasId: seed.aliasId,
      nowIso: seed.nowIso,
      quote: "검은 기사",
    });

    const result = await confirmMemoryEntityAlias({
      projectId: seed.projectId,
      aliasId: seed.aliasId,
      nowIso: seed.nowIso,
    });

    expect(result.updated).toBe(true);
    const [aliasRow] = await db
      .getClient()
      .select()
      .from(memoryEntityAlias)
      .where(eq(memoryEntityAlias.id, seed.aliasId));
    const [entityRow] = await db
      .getClient()
      .select()
      .from(memoryEntity)
      .where(eq(memoryEntity.id, seed.entityId));

    expect(aliasRow.status).toBe("confirmed");
    expect(entityRow.status).toBe("confirmed");
  });

  it("lists suggested entities and confirms one as canonical exportable memory", async () => {
    const seed = await seedAlias();
    await attachEntityMention({
      projectId: seed.projectId,
      entityId: seed.entityId,
      nowIso: seed.nowIso,
    });

    const list = await listSuggestedMemoryEntities({
      projectId: seed.projectId,
      limit: 20,
    });
    expect(list.items).toEqual([
      expect.objectContaining({
        id: seed.entityId,
        canonicalName: "아린",
        status: "suggested",
        provenanceKind: "canon",
        canonStatus: "canon",
        mentionCount: 1,
      }),
    ]);

    const result = await confirmMemoryEntity({
      projectId: seed.projectId,
      entityId: seed.entityId,
      nowIso: seed.nowIso,
    });

    expect(result).toEqual({
      updated: true,
      status: "confirmed",
      canonicalExportable: true,
    });
    const [entityRow] = await db
      .getClient()
      .select()
      .from(memoryEntity)
      .where(eq(memoryEntity.id, seed.entityId));
    expect(entityRow.status).toBe("confirmed");
  });

  it("blocks confirming a suggested entity when mention evidence is missing", async () => {
    const seed = await seedAlias();

    await expect(
      confirmMemoryEntity({
        projectId: seed.projectId,
        entityId: seed.entityId,
        nowIso: seed.nowIso,
      }),
    ).rejects.toThrow("MEMORY_ENTITY_EVIDENCE_REQUIRED");

    const [entityRow] = await db
      .getClient()
      .select()
      .from(memoryEntity)
      .where(eq(memoryEntity.id, seed.entityId));
    expect(entityRow.status).toBe("suggested");
  });

  it("blocks confirming an alias when alias mention evidence is missing", async () => {
    const seed = await seedAlias();
    await attachEntityMention({
      projectId: seed.projectId,
      entityId: seed.entityId,
      aliasId: null,
      nowIso: seed.nowIso,
    });

    await expect(
      confirmMemoryEntityAlias({
        projectId: seed.projectId,
        aliasId: seed.aliasId,
        nowIso: seed.nowIso,
      }),
    ).rejects.toThrow("MEMORY_ENTITY_EVIDENCE_REQUIRED");

    const [aliasRow] = await db
      .getClient()
      .select()
      .from(memoryEntityAlias)
      .where(eq(memoryEntityAlias.id, seed.aliasId));
    const [entityRow] = await db
      .getClient()
      .select()
      .from(memoryEntity)
      .where(eq(memoryEntity.id, seed.entityId));
    expect(aliasRow.status).toBe("suggested");
    expect(entityRow.status).toBe("suggested");
  });

  it("rejects a suggested entity as reviewed canonical memory", async () => {
    const seed = await seedAlias();

    const result = await rejectMemoryEntity({
      projectId: seed.projectId,
      entityId: seed.entityId,
      reason: "동명이인 오탐",
      nowIso: seed.nowIso,
    });

    expect(result).toEqual({
      updated: true,
      status: "rejected",
      canonicalExportable: true,
    });
    const [entityRow] = await db
      .getClient()
      .select()
      .from(memoryEntity)
      .where(eq(memoryEntity.id, seed.entityId));
    expect(entityRow.status).toBe("rejected");
    expect(entityRow.rejectedAt).toBe(seed.nowIso);
    expect(entityRow.rejectionReason).toBe("동명이인 오탐");
  });

  it("rejects a suggested alias without changing the canonical entity", async () => {
    const seed = await seedAlias();

    const result = await rejectMemoryEntityAlias({
      projectId: seed.projectId,
      aliasId: seed.aliasId,
      reason: "별칭이 아니라 호칭",
      nowIso: seed.nowIso,
    });

    expect(result.updated).toBe(true);
    const [aliasRow] = await db
      .getClient()
      .select()
      .from(memoryEntityAlias)
      .where(eq(memoryEntityAlias.id, seed.aliasId));
    const [entityRow] = await db
      .getClient()
      .select()
      .from(memoryEntity)
      .where(eq(memoryEntity.id, seed.entityId));

    expect(aliasRow.status).toBe("rejected");
    expect(aliasRow.rejectedAt).toBe(seed.nowIso);
    expect(aliasRow.rejectionReason).toBe("별칭이 아니라 호칭");
    expect(entityRow.status).toBe("suggested");
  });

  it("merges a duplicate entity into the canonical target and preserves attached memory rows", async () => {
    const projectId = crypto.randomUUID();
    const targetEntityId = crypto.randomUUID();
    const sourceEntityId = crypto.randomUUID();
    const aliasId = crypto.randomUUID();
    const mentionId = crypto.randomUUID();
    const chapterId = crypto.randomUUID();
    const factId = crypto.randomUUID();
    const nowIso = "2026-06-08T00:00:00.000Z";

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Entity Merge",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });
    await db.getClient().insert(chapter).values({
      id: chapterId,
      projectId,
      title: "1화",
      content: "",
      order: 1,
      updatedAt: nowIso,
    });
    await db
      .getClient()
      .insert(memoryEntity)
      .values([
        {
          id: targetEntityId,
          projectId,
          entityType: "character",
          canonicalName: "아린",
          status: "confirmed",
          confidence: 90,
          createdBy: "system",
          updatedAt: nowIso,
        },
        {
          id: sourceEntityId,
          projectId,
          entityType: "character",
          canonicalName: "검은 기사",
          status: "suggested",
          confidence: 70,
          createdBy: "system",
          updatedAt: nowIso,
        },
      ]);
    await db.getClient().insert(memoryEntityAlias).values({
      id: aliasId,
      projectId,
      entityId: sourceEntityId,
      entityType: "character",
      alias: "검은 기사",
      normalizedAlias: "검은 기사",
      status: "suggested",
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEntityMention).values({
      id: mentionId,
      projectId,
      entityId: sourceEntityId,
      aliasId,
      chapterId,
      chunkId: null,
      contentHash: "mention-hash",
      sourceContentHash: "source-hash",
      startOffset: 0,
      endOffset: 4,
      quote: "검은 기사",
      extractorVersion: "entity-v1",
      confidence: 80,
      status: "suggested",
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryFact).values({
      id: factId,
      projectId,
      subjectEntityId: sourceEntityId,
      predicate: "alive_status",
      objectEntityId: null,
      objectValue: "alive",
      valueType: "string",
      validFromChapterId: chapterId,
      validFromChapterOrder: 1,
      validToChapterId: null,
      validToChapterOrder: null,
      observedAtChapterId: chapterId,
      observedAtChapterOrder: 1,
      confidence: 80,
      status: "suggested",
      extractorVersion: "fact-v1",
      sourceContentHash: "source-hash",
      invalidatedByFactId: null,
      updatedAt: nowIso,
    });

    const result = await mergeMemoryEntities({
      projectId,
      targetEntityId,
      sourceEntityId,
      nowIso,
    });

    expect(result.updated).toBe(true);
    const [aliasRow] = await db
      .getClient()
      .select()
      .from(memoryEntityAlias)
      .where(eq(memoryEntityAlias.id, aliasId));
    const [mentionRow] = await db
      .getClient()
      .select()
      .from(memoryEntityMention)
      .where(eq(memoryEntityMention.id, mentionId));
    const [factRow] = await db
      .getClient()
      .select()
      .from(memoryFact)
      .where(eq(memoryFact.id, factId));
    const [sourceRow] = await db
      .getClient()
      .select()
      .from(memoryEntity)
      .where(eq(memoryEntity.id, sourceEntityId));
    const auditRows = await db
      .getClient()
      .select()
      .from(memoryEntityMergeAudit)
      .where(eq(memoryEntityMergeAudit.sourceEntityId, sourceEntityId));

    expect(aliasRow.entityId).toBe(targetEntityId);
    expect(aliasRow.status).toBe("confirmed");
    expect(mentionRow.entityId).toBe(targetEntityId);
    expect(factRow.subjectEntityId).toBe(targetEntityId);
    expect(sourceRow.status).toBe("deprecated");
    expect(sourceRow.deletedAt).toBe(nowIso);
    expect(auditRows).toEqual([
      expect.objectContaining({
        projectId,
        sourceEntityId,
        targetEntityId,
        action: "merge",
      }),
    ]);
  });

  it("splits an alias and alias-linked mentions into a new canonical entity", async () => {
    const projectId = crypto.randomUUID();
    const originalEntityId = crypto.randomUUID();
    const aliasId = crypto.randomUUID();
    const mentionId = crypto.randomUUID();
    const chapterId = crypto.randomUUID();
    const nowIso = "2026-06-08T00:00:00.000Z";

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Entity Split",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });
    await db.getClient().insert(chapter).values({
      id: chapterId,
      projectId,
      title: "1화",
      content: "",
      order: 1,
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEntity).values({
      id: originalEntityId,
      projectId,
      entityType: "character",
      canonicalName: "아린",
      status: "confirmed",
      confidence: 90,
      createdBy: "system",
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEntityAlias).values({
      id: aliasId,
      projectId,
      entityId: originalEntityId,
      entityType: "character",
      alias: "검은 기사",
      normalizedAlias: "검은 기사",
      status: "suggested",
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEntityMention).values({
      id: mentionId,
      projectId,
      entityId: originalEntityId,
      aliasId,
      chapterId,
      chunkId: null,
      contentHash: "mention-hash",
      sourceContentHash: "source-hash",
      startOffset: 0,
      endOffset: 4,
      quote: "검은 기사",
      extractorVersion: "entity-v1",
      confidence: 80,
      status: "suggested",
      updatedAt: nowIso,
    });

    const result = await splitMemoryEntityAlias({
      projectId,
      aliasId,
      canonicalName: "검은 기사",
      nowIso,
    });

    expect(result.updated).toBe(true);
    expect(result.entityId).not.toBe(originalEntityId);
    const [newEntity] = await db
      .getClient()
      .select()
      .from(memoryEntity)
      .where(eq(memoryEntity.id, result.entityId));
    const [aliasRow] = await db
      .getClient()
      .select()
      .from(memoryEntityAlias)
      .where(eq(memoryEntityAlias.id, aliasId));
    const [mentionRow] = await db
      .getClient()
      .select()
      .from(memoryEntityMention)
      .where(eq(memoryEntityMention.id, mentionId));
    const [originalEntity] = await db
      .getClient()
      .select()
      .from(memoryEntity)
      .where(eq(memoryEntity.id, originalEntityId));
    const auditRows = await db
      .getClient()
      .select()
      .from(memoryEntityMergeAudit)
      .where(eq(memoryEntityMergeAudit.sourceEntityId, originalEntityId));

    expect(newEntity).toMatchObject({
      projectId,
      entityType: "character",
      canonicalName: "검은 기사",
      status: "confirmed",
    });
    expect(aliasRow.entityId).toBe(result.entityId);
    expect(aliasRow.status).toBe("confirmed");
    expect(mentionRow.entityId).toBe(result.entityId);
    expect(originalEntity.status).toBe("confirmed");
    expect(originalEntity.deletedAt).toBeNull();
    expect(auditRows).toEqual([
      expect.objectContaining({
        projectId,
        sourceEntityId: originalEntityId,
        targetEntityId: result.entityId,
        action: "split",
        aliasId,
      }),
    ]);
  });
});
