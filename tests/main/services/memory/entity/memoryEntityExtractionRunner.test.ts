import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  db,
  memoryChunk,
  memoryEntity,
  memoryEntityAlias,
  memoryEntityMention,
  project,
} from "../../../../../src/main/infra/database/index.js";
import {
  processMemoryEntityExtraction,
  type MemoryEntityExtractor,
} from "../../../../../src/main/services/features/memory/entity/memoryEntityExtractionRunner.js";

describe("processMemoryEntityExtraction", () => {
  it("stores extracted suggested entities, aliases, and evidence mentions from memory chunks", async () => {
    const projectId = crypto.randomUUID();
    const chunkId = crypto.randomUUID();
    const nowIso = "2026-06-08T00:00:00.000Z";

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Entity Extraction",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryChunk).values({
      id: chunkId,
      projectId,
      sourceType: "chapter",
      sourceId: "chapter-1",
      chapterId: null,
      sceneId: null,
      chunkIndex: 0,
      content: "아린은 검은 기사라 불렸다.",
      contentHash: "chunk-hash",
      indexText: "아린 검은 기사",
      indexTextHash: "index-hash",
      contextLabel: "1화",
      sourceContentHash: "source-hash",
      startOffset: 10,
      endOffset: 24,
      tokenCount: 5,
      updatedAt: nowIso,
    });

    const extractor: MemoryEntityExtractor = async (input) => {
      expect(input.chunks).toHaveLength(1);
      return [
        {
          entityType: "character",
          canonicalName: "아린",
          aliases: ["검은 기사"],
          confidence: 82,
          mentions: [
            {
              chunkId,
              quote: "아린은 검은 기사라 불렸다.",
              startOffset: 10,
              endOffset: 24,
              confidence: 82,
            },
          ],
        },
      ];
    };

    const result = await processMemoryEntityExtraction({
      projectId,
      extractor,
      extractorVersion: "entity-v1",
      nowIso,
    });

    expect(result).toEqual({
      entityCount: 1,
      aliasCount: 1,
      mentionCount: 1,
    });

    const [entity] = await db
      .getClient()
      .select()
      .from(memoryEntity)
      .where(eq(memoryEntity.projectId, projectId));
    expect(entity).toMatchObject({
      entityType: "character",
      canonicalName: "아린",
      status: "suggested",
      confidence: 82,
    });

    const [alias] = await db
      .getClient()
      .select()
      .from(memoryEntityAlias)
      .where(eq(memoryEntityAlias.projectId, projectId));
    expect(alias).toMatchObject({
      entityId: entity.id,
      alias: "검은 기사",
      normalizedAlias: "검은 기사",
      status: "suggested",
    });

    const [mention] = await db
      .getClient()
      .select()
      .from(memoryEntityMention)
      .where(eq(memoryEntityMention.projectId, projectId));
    expect(mention).toMatchObject({
      entityId: entity.id,
      chunkId,
      quote: "아린은 검은 기사라 불렸다.",
      extractorVersion: "entity-v1",
      contentHash: "chunk-hash",
      sourceContentHash: "source-hash",
      startOffset: 10,
      endOffset: 24,
      status: "suggested",
    });
  });

  it("suppresses extracted entities that were already rejected", async () => {
    const projectId = crypto.randomUUID();
    const chunkId = crypto.randomUUID();
    const nowIso = "2026-06-08T00:00:00.000Z";

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Rejected Entity Extraction",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryChunk).values({
      id: chunkId,
      projectId,
      sourceType: "chapter",
      sourceId: "chapter-1",
      chapterId: null,
      sceneId: null,
      chunkIndex: 0,
      content: "아린은 검은 기사라 불렸다.",
      contentHash: "chunk-hash",
      indexText: "아린 검은 기사",
      indexTextHash: "index-hash",
      contextLabel: "1화",
      sourceContentHash: "source-hash",
      startOffset: 10,
      endOffset: 24,
      tokenCount: 5,
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEntity).values({
      id: crypto.randomUUID(),
      projectId,
      entityType: "character",
      canonicalName: "아린",
      status: "rejected",
      confidence: 50,
      createdBy: "system",
      updatedAt: nowIso,
    });

    const extractor: MemoryEntityExtractor = async () => [
      {
        entityType: "character",
        canonicalName: "아린",
        aliases: ["검은 기사"],
        confidence: 82,
        mentions: [
          {
            chunkId,
            quote: "아린은 검은 기사라 불렸다.",
            startOffset: 10,
            endOffset: 24,
            confidence: 82,
          },
        ],
      },
    ];

    const result = await processMemoryEntityExtraction({
      projectId,
      extractor,
      extractorVersion: "entity-v1",
      nowIso,
    });

    expect(result).toEqual({
      entityCount: 0,
      aliasCount: 0,
      mentionCount: 0,
    });
    const aliasRows = await db
      .getClient()
      .select()
      .from(memoryEntityAlias)
      .where(eq(memoryEntityAlias.projectId, projectId));
    const mentionRows = await db
      .getClient()
      .select()
      .from(memoryEntityMention)
      .where(eq(memoryEntityMention.projectId, projectId));
    expect(aliasRows).toHaveLength(0);
    expect(mentionRows).toHaveLength(0);
  });
});
