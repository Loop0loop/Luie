/* eslint-disable no-await-in-loop -- Entity extraction writes are intentionally sequential to preserve candidate, alias, and mention ordering. */
import crypto from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import {
  db,
  memoryChunk,
  memoryEntity,
  memoryEntityAlias,
  memoryEntityMention,
} from "../../../../infra/database/index.js";
import { normalizeMemoryEntityName } from "./memoryEntityResolution.js";

export type MemoryEntityExtractionChunk = {
  id: string;
  projectId: string;
  sourceType: string;
  sourceId: string;
  chapterId: string | null;
  chunkIndex: number;
  content: string;
  contentHash: string;
  sourceContentHash: string;
  startOffset: number | null;
  endOffset: number | null;
};

export type MemoryEntityExtractorMention = {
  chunkId: string;
  quote: string;
  startOffset: number | null;
  endOffset: number | null;
  confidence?: number;
};

export type MemoryEntityExtractorCandidate = {
  entityType: string;
  canonicalName: string;
  aliases?: string[];
  confidence?: number;
  mentions: MemoryEntityExtractorMention[];
};

export type MemoryEntityExtractor = (input: {
  projectId: string;
  chunks: MemoryEntityExtractionChunk[];
}) => Promise<MemoryEntityExtractorCandidate[]>;

export async function processMemoryEntityExtraction(input: {
  projectId: string;
  extractor: MemoryEntityExtractor;
  extractorVersion: string;
  nowIso?: string;
  limit?: number;
}): Promise<{ entityCount: number; aliasCount: number; mentionCount: number }> {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const chunks = await db
    .getClient()
    .select({
      id: memoryChunk.id,
      projectId: memoryChunk.projectId,
      sourceType: memoryChunk.sourceType,
      sourceId: memoryChunk.sourceId,
      chapterId: memoryChunk.chapterId,
      chunkIndex: memoryChunk.chunkIndex,
      content: memoryChunk.content,
      contentHash: memoryChunk.contentHash,
      sourceContentHash: memoryChunk.sourceContentHash,
      startOffset: memoryChunk.startOffset,
      endOffset: memoryChunk.endOffset,
    })
    .from(memoryChunk)
    .where(eq(memoryChunk.projectId, input.projectId))
    .orderBy(
      asc(memoryChunk.sourceType),
      asc(memoryChunk.sourceId),
      asc(memoryChunk.chunkIndex),
    )
    .limit(input.limit ?? 50);

  const candidates = await input.extractor({
    projectId: input.projectId,
    chunks,
  });
  const chunksById = new Map(chunks.map((chunk) => [chunk.id, chunk]));

  let entityCount = 0;
  let aliasCount = 0;
  let mentionCount = 0;

  for (const candidate of candidates) {
    const entityType = normalizeMemoryEntityName(candidate.entityType);
    const canonicalName = candidate.canonicalName.trim();
    if (!entityType || !canonicalName || candidate.mentions.length === 0) {
      continue;
    }

    const entityId = await getOrCreateSuggestedEntity({
      projectId: input.projectId,
      entityType,
      canonicalName,
      confidence: candidate.confidence ?? 0,
      nowIso,
    });
    if (entityId === null) continue;
    entityCount += 1;

    for (const alias of candidate.aliases ?? []) {
      const trimmedAlias = alias.trim();
      if (!trimmedAlias) continue;
      const inserted = await insertSuggestedAlias({
        projectId: input.projectId,
        entityId,
        entityType,
        alias: trimmedAlias,
        nowIso,
      });
      if (inserted) aliasCount += 1;
    }

    for (const mention of candidate.mentions) {
      const chunk = chunksById.get(mention.chunkId);
      if (!chunk) continue;
      await db
        .getClient()
        .insert(memoryEntityMention)
        .values({
          id: crypto.randomUUID(),
          projectId: input.projectId,
          entityId,
          aliasId: null,
          chapterId: chunk.chapterId,
          chunkId: chunk.id,
          contentHash: chunk.contentHash,
          sourceContentHash: chunk.sourceContentHash,
          startOffset: mention.startOffset,
          endOffset: mention.endOffset,
          quote: mention.quote,
          extractorVersion: input.extractorVersion,
          confidence: mention.confidence ?? candidate.confidence ?? 0,
          status: "suggested",
          updatedAt: nowIso,
        });
      mentionCount += 1;
    }
  }

  return { entityCount, aliasCount, mentionCount };
}

async function getOrCreateSuggestedEntity(input: {
  projectId: string;
  entityType: string;
  canonicalName: string;
  confidence: number;
  nowIso: string;
}): Promise<string | null> {
  const [existing] = await db
    .getClient()
    .select({ id: memoryEntity.id, status: memoryEntity.status })
    .from(memoryEntity)
    .where(
      and(
        eq(memoryEntity.projectId, input.projectId),
        eq(memoryEntity.entityType, input.entityType),
        eq(memoryEntity.canonicalName, input.canonicalName),
      ),
    )
    .limit(1);
  if (existing) {
    return existing.status === "rejected" ? null : existing.id;
  }

  const id = crypto.randomUUID();
  await db.getClient().insert(memoryEntity).values({
    id,
    projectId: input.projectId,
    entityType: input.entityType,
    canonicalName: input.canonicalName,
    status: "suggested",
    confidence: input.confidence,
    createdBy: "system",
    updatedAt: input.nowIso,
  });
  return id;
}

async function insertSuggestedAlias(input: {
  projectId: string;
  entityId: string;
  entityType: string;
  alias: string;
  nowIso: string;
}): Promise<boolean> {
  const normalizedAlias = normalizeMemoryEntityName(input.alias);
  const [existing] = await db
    .getClient()
    .select({ id: memoryEntityAlias.id })
    .from(memoryEntityAlias)
    .where(
      and(
        eq(memoryEntityAlias.projectId, input.projectId),
        eq(memoryEntityAlias.entityType, input.entityType),
        eq(memoryEntityAlias.normalizedAlias, normalizedAlias),
      ),
    )
    .limit(1);
  if (existing) return false;

  await db.getClient().insert(memoryEntityAlias).values({
    id: crypto.randomUUID(),
    projectId: input.projectId,
    entityId: input.entityId,
    entityType: input.entityType,
    alias: input.alias,
    normalizedAlias,
    status: "suggested",
    updatedAt: input.nowIso,
  });
  return true;
}
