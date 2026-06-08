import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import {
  chapter,
  db,
  memoryEntity,
  memoryEntityMention,
  memoryEpisodeEvidence,
  memoryFact,
  memoryFactEvidence,
} from "../../../../infra/database/index.js";

export type MemoryReviewEntityMention = {
  id: string;
  chapterId: string | null;
  chapterOrder: number | null;
  quote: string;
  confidence: number;
};

export type MemoryReviewEntityCandidate = {
  id: string;
  entityType: string;
  canonicalName: string;
  status: string;
  confidence: number;
  mentionCount: number;
  mentions: MemoryReviewEntityMention[];
};

export type MemoryReviewFactEvidence = {
  id: string;
  evidenceId: string;
  chapterId: string | null;
  chapterOrder: number | null;
  quote: string;
};

export type MemoryReviewFactCandidate = {
  id: string;
  subjectEntityId: string;
  subjectName: string | null;
  predicate: string;
  objectEntityId: string | null;
  objectName: string | null;
  objectValue: string | null;
  valueType: string;
  status: string;
  confidence: number;
  validFromChapterOrder: number;
  validToChapterOrder: number | null;
  observedAtChapterOrder: number;
  evidenceCount: number;
  evidence: MemoryReviewFactEvidence[];
};

export type MemoryReviewBacklogReport = {
  projectId: string;
  generatedAt: string;
  entityCandidates: MemoryReviewEntityCandidate[];
  factCandidates: MemoryReviewFactCandidate[];
  counts: {
    suggestedEntities: number;
    suggestedFacts: number;
  };
};

export async function getMemoryReviewBacklogReport(input: {
  projectId: string;
  limit?: number;
  evidenceLimit?: number;
}): Promise<MemoryReviewBacklogReport> {
  const limit = Math.max(1, Math.min(input.limit ?? 50, 200));
  const evidenceLimit = Math.max(1, Math.min(input.evidenceLimit ?? 3, 10));
  const client = db.getClient();

  const entities = await client
    .select({
      id: memoryEntity.id,
      entityType: memoryEntity.entityType,
      canonicalName: memoryEntity.canonicalName,
      status: memoryEntity.status,
      confidence: memoryEntity.confidence,
    })
    .from(memoryEntity)
    .where(
      and(
        eq(memoryEntity.projectId, input.projectId),
        eq(memoryEntity.status, "suggested"),
      ),
    )
    .orderBy(desc(memoryEntity.confidence), asc(memoryEntity.canonicalName))
    .limit(limit);

  const entityIds = entities.map((entity) => entity.id);
  const entityMentions =
    entityIds.length === 0
      ? []
      : await client
          .select({
            id: memoryEntityMention.id,
            entityId: memoryEntityMention.entityId,
            chapterId: memoryEntityMention.chapterId,
            chapterOrder: chapter.order,
            quote: memoryEntityMention.quote,
            confidence: memoryEntityMention.confidence,
          })
          .from(memoryEntityMention)
          .leftJoin(chapter, eq(chapter.id, memoryEntityMention.chapterId))
          .where(
            and(
              eq(memoryEntityMention.projectId, input.projectId),
              inArray(memoryEntityMention.entityId, entityIds),
            ),
          )
          .orderBy(
            asc(memoryEntityMention.entityId),
            asc(chapter.order),
            desc(memoryEntityMention.confidence),
          );

  const mentionsByEntity = new Map<string, MemoryReviewEntityMention[]>();
  for (const mention of entityMentions) {
    const list = mentionsByEntity.get(mention.entityId) ?? [];
    if (list.length < evidenceLimit) {
      list.push({
        id: mention.id,
        chapterId: mention.chapterId,
        chapterOrder: mention.chapterOrder ?? null,
        quote: mention.quote,
        confidence: mention.confidence,
      });
    }
    mentionsByEntity.set(mention.entityId, list);
  }

  const subjectEntity = alias(memoryEntity, "reviewSubjectEntity");
  const objectEntity = alias(memoryEntity, "reviewObjectEntity");
  const facts = await client
    .select({
      id: memoryFact.id,
      subjectEntityId: memoryFact.subjectEntityId,
      subjectName: subjectEntity.canonicalName,
      predicate: memoryFact.predicate,
      objectEntityId: memoryFact.objectEntityId,
      objectName: objectEntity.canonicalName,
      objectValue: memoryFact.objectValue,
      valueType: memoryFact.valueType,
      status: memoryFact.status,
      confidence: memoryFact.confidence,
      validFromChapterOrder: memoryFact.validFromChapterOrder,
      validToChapterOrder: memoryFact.validToChapterOrder,
      observedAtChapterOrder: memoryFact.observedAtChapterOrder,
    })
    .from(memoryFact)
    .leftJoin(
      subjectEntity,
      and(
        eq(subjectEntity.projectId, memoryFact.projectId),
        eq(subjectEntity.id, memoryFact.subjectEntityId),
      ),
    )
    .leftJoin(
      objectEntity,
      and(
        eq(objectEntity.projectId, memoryFact.projectId),
        eq(objectEntity.id, memoryFact.objectEntityId),
      ),
    )
    .where(
      and(
        eq(memoryFact.projectId, input.projectId),
        eq(memoryFact.status, "suggested"),
      ),
    )
    .orderBy(desc(memoryFact.confidence), asc(memoryFact.predicate))
    .limit(limit);

  const factIds = facts.map((fact) => fact.id);
  const factEvidence =
    factIds.length === 0
      ? []
      : await client
          .select({
            id: memoryFactEvidence.id,
            factId: memoryFactEvidence.factId,
            evidenceId: memoryFactEvidence.evidenceId,
            chapterId: memoryEpisodeEvidence.chapterId,
            chapterOrder: chapter.order,
            quote: memoryEpisodeEvidence.quote,
          })
          .from(memoryFactEvidence)
          .innerJoin(
            memoryEpisodeEvidence,
            and(
              eq(memoryEpisodeEvidence.projectId, memoryFactEvidence.projectId),
              eq(memoryEpisodeEvidence.id, memoryFactEvidence.evidenceId),
            ),
          )
          .leftJoin(chapter, eq(chapter.id, memoryEpisodeEvidence.chapterId))
          .where(
            and(
              eq(memoryFactEvidence.projectId, input.projectId),
              inArray(memoryFactEvidence.factId, factIds),
            ),
          )
          .orderBy(asc(memoryFactEvidence.factId), asc(chapter.order));

  const evidenceByFact = new Map<string, MemoryReviewFactEvidence[]>();
  for (const evidence of factEvidence) {
    const list = evidenceByFact.get(evidence.factId) ?? [];
    if (list.length < evidenceLimit) {
      list.push({
        id: evidence.id,
        evidenceId: evidence.evidenceId,
        chapterId: evidence.chapterId,
        chapterOrder: evidence.chapterOrder ?? null,
        quote: evidence.quote,
      });
    }
    evidenceByFact.set(evidence.factId, list);
  }

  return {
    projectId: input.projectId,
    generatedAt: new Date().toISOString(),
    entityCandidates: entities.map((entity) => ({
      ...entity,
      mentionCount: entityMentions.filter(
        (mention) => mention.entityId === entity.id,
      ).length,
      mentions: mentionsByEntity.get(entity.id) ?? [],
    })),
    factCandidates: facts.map((fact) => ({
      ...fact,
      evidenceCount: factEvidence.filter(
        (evidence) => evidence.factId === fact.id,
      ).length,
      evidence: evidenceByFact.get(fact.id) ?? [],
    })),
    counts: {
      suggestedEntities: entities.length,
      suggestedFacts: facts.length,
    },
  };
}
