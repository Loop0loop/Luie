import { and, desc, eq, or, sql } from "drizzle-orm";
import crypto from "node:crypto";
import { db } from "../../../../database/main/databaseService.js";
import {
  memoryCharacterState,
  chapter,
  memoryEntity,
  memoryEntityAlias,
  memoryEntityMergeAudit,
  memoryEntityMention,
  memoryEpisodeParticipant,
  memoryFact,
  memoryKnowledgeState,
  memoryRelationState,
  memoryStateChangeCandidate,
} from "../../../../database/schema/index.js";
import type {
  MemoryEntityAliasConfirmInput,
  MemoryEntityAliasRejectInput,
  MemoryEntityAliasReviewMutationResult,
  MemoryEntityAliasReviewQueueInput,
  MemoryEntityAliasReviewQueueResult,
  MemoryEntityAliasSplitInput,
  MemoryEntityAliasSplitResult,
  MemoryEntityConfirmInput,
  MemoryEntityMergeInput,
  MemoryEntityMergeResult,
  MemoryEntityRejectInput,
  MemoryEntityReviewMutationResult,
  MemoryEntityReviewQueueInput,
  MemoryEntityReviewQueueResult,
} from "../../../../../shared/types/search.js";

const DEFAULT_REVIEW_LIMIT = 50;
const MAX_REVIEW_LIMIT = 200;

function clampLimit(limit: number | undefined): number {
  if (!limit) return DEFAULT_REVIEW_LIMIT;
  return Math.min(Math.max(limit, 1), MAX_REVIEW_LIMIT);
}

export async function listSuggestedMemoryEntityAliases(
  input: MemoryEntityAliasReviewQueueInput,
): Promise<MemoryEntityAliasReviewQueueResult> {
  const rows = await db
    .getClient()
    .select({
      id: memoryEntityAlias.id,
      projectId: memoryEntityAlias.projectId,
      entityId: memoryEntityAlias.entityId,
      entityType: memoryEntityAlias.entityType,
      canonicalName: memoryEntity.canonicalName,
      entityStatus: memoryEntity.status,
      alias: memoryEntityAlias.alias,
      normalizedAlias: memoryEntityAlias.normalizedAlias,
      status: memoryEntityAlias.status,
      createdAt: memoryEntityAlias.createdAt,
      updatedAt: memoryEntityAlias.updatedAt,
    })
    .from(memoryEntityAlias)
    .innerJoin(memoryEntity, eq(memoryEntityAlias.entityId, memoryEntity.id))
    .where(
      and(
        eq(memoryEntityAlias.projectId, input.projectId),
        eq(memoryEntityAlias.status, "suggested"),
      ),
    )
    .orderBy(desc(memoryEntityAlias.updatedAt))
    .limit(clampLimit(input.limit));

  return { items: rows };
}

export async function listSuggestedMemoryEntities(
  input: MemoryEntityReviewQueueInput,
): Promise<MemoryEntityReviewQueueResult> {
  const rows = await db
    .getClient()
    .select({
      id: memoryEntity.id,
      projectId: memoryEntity.projectId,
      entityType: memoryEntity.entityType,
      canonicalName: memoryEntity.canonicalName,
      status: memoryEntity.status,
      confidence: memoryEntity.confidence,
      createdBy: memoryEntity.createdBy,
      createdAt: memoryEntity.createdAt,
      updatedAt: memoryEntity.updatedAt,
      mentionCount: sql<number>`count(${memoryEntityMention.id})`,
      firstMentionChapterOrder: sql<number | null>`min(${chapter.order})`,
      lastMentionChapterOrder: sql<number | null>`max(${chapter.order})`,
    })
    .from(memoryEntity)
    .leftJoin(
      memoryEntityMention,
      and(
        eq(memoryEntityMention.projectId, memoryEntity.projectId),
        eq(memoryEntityMention.entityId, memoryEntity.id),
      ),
    )
    .leftJoin(chapter, eq(chapter.id, memoryEntityMention.chapterId))
    .where(
      and(
        eq(memoryEntity.projectId, input.projectId),
        eq(memoryEntity.status, "suggested"),
      ),
    )
    .groupBy(memoryEntity.id)
    .orderBy(desc(memoryEntity.updatedAt))
    .limit(clampLimit(input.limit));

  return {
    items: rows.map((row) => ({
      ...row,
      mentionCount: Number(row.mentionCount ?? 0),
      firstMentionChapterOrder:
        row.firstMentionChapterOrder === null
          ? null
          : Number(row.firstMentionChapterOrder),
      lastMentionChapterOrder:
        row.lastMentionChapterOrder === null
          ? null
          : Number(row.lastMentionChapterOrder),
    })),
  };
}

export async function confirmMemoryEntity(
  input: MemoryEntityConfirmInput & { nowIso?: string },
): Promise<MemoryEntityReviewMutationResult> {
  const updated = await db
    .getClient()
    .update(memoryEntity)
    .set({
      status: "confirmed",
      updatedAt: input.nowIso ?? new Date().toISOString(),
    })
    .where(
      and(
        eq(memoryEntity.projectId, input.projectId),
        eq(memoryEntity.id, input.entityId),
        eq(memoryEntity.status, "suggested"),
      ),
    );

  return {
    updated: updated.changes > 0,
    status: updated.changes > 0 ? "confirmed" : undefined,
    canonicalExportable: updated.changes > 0,
  };
}

export async function rejectMemoryEntity(
  input: MemoryEntityRejectInput & { nowIso?: string },
): Promise<MemoryEntityReviewMutationResult> {
  const updated = await db
    .getClient()
    .update(memoryEntity)
    .set({
      status: "rejected",
      updatedAt: input.nowIso ?? new Date().toISOString(),
    })
    .where(
      and(
        eq(memoryEntity.projectId, input.projectId),
        eq(memoryEntity.id, input.entityId),
        eq(memoryEntity.status, "suggested"),
      ),
    );

  return {
    updated: updated.changes > 0,
    status: updated.changes > 0 ? "rejected" : undefined,
    canonicalExportable: updated.changes > 0,
  };
}

export async function confirmMemoryEntityAlias(
  input: MemoryEntityAliasConfirmInput & { nowIso?: string },
): Promise<MemoryEntityAliasReviewMutationResult> {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const updated = db.getClient().transaction((tx) => {
    const [aliasRow] = tx
      .select({
        id: memoryEntityAlias.id,
        entityId: memoryEntityAlias.entityId,
      })
      .from(memoryEntityAlias)
      .where(
        and(
          eq(memoryEntityAlias.projectId, input.projectId),
          eq(memoryEntityAlias.id, input.aliasId),
          eq(memoryEntityAlias.status, "suggested"),
        ),
      )
      .limit(1)
      .all();

    if (!aliasRow) return false;

    tx
      .update(memoryEntityAlias)
      .set({ status: "confirmed", updatedAt: nowIso })
      .where(eq(memoryEntityAlias.id, aliasRow.id))
      .run();
    tx
      .update(memoryEntity)
      .set({ status: "confirmed", updatedAt: nowIso })
      .where(
        and(
          eq(memoryEntity.projectId, input.projectId),
          eq(memoryEntity.id, aliasRow.entityId),
        ),
      )
      .run();

    return true;
  });

  return { updated };
}

export async function rejectMemoryEntityAlias(
  input: MemoryEntityAliasRejectInput & { nowIso?: string },
): Promise<MemoryEntityAliasReviewMutationResult> {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const result = await db
    .getClient()
    .update(memoryEntityAlias)
    .set({ status: "rejected", updatedAt: nowIso })
    .where(
      and(
        eq(memoryEntityAlias.projectId, input.projectId),
        eq(memoryEntityAlias.id, input.aliasId),
        eq(memoryEntityAlias.status, "suggested"),
      ),
    )
    .returning({ id: memoryEntityAlias.id });

  return { updated: result.length > 0 };
}

export async function mergeMemoryEntities(
  input: MemoryEntityMergeInput & { nowIso?: string },
): Promise<MemoryEntityMergeResult> {
  if (input.sourceEntityId === input.targetEntityId) {
    return { updated: false };
  }

  const nowIso = input.nowIso ?? new Date().toISOString();
  const updated = db.getClient().transaction((tx) => {
    const rows = tx
      .select({
        id: memoryEntity.id,
        entityType: memoryEntity.entityType,
      })
      .from(memoryEntity)
      .where(
        and(
          eq(memoryEntity.projectId, input.projectId),
          or(
            eq(memoryEntity.id, input.targetEntityId),
            eq(memoryEntity.id, input.sourceEntityId),
          ),
        ),
      )
      .all();

    const target = rows.find((row) => row.id === input.targetEntityId);
    const source = rows.find((row) => row.id === input.sourceEntityId);
    if (!target || !source || target.entityType !== source.entityType) {
      return false;
    }

    tx
      .update(memoryEntityAlias)
      .set({
        entityId: input.targetEntityId,
        status: "confirmed",
        updatedAt: nowIso,
      })
      .where(
        and(
          eq(memoryEntityAlias.projectId, input.projectId),
          eq(memoryEntityAlias.entityId, input.sourceEntityId),
        ),
      )
      .run();
    tx
      .update(memoryEntityMention)
      .set({ entityId: input.targetEntityId, updatedAt: nowIso })
      .where(
        and(
          eq(memoryEntityMention.projectId, input.projectId),
          eq(memoryEntityMention.entityId, input.sourceEntityId),
        ),
      )
      .run();
    tx
      .update(memoryEpisodeParticipant)
      .set({ entityId: input.targetEntityId, updatedAt: nowIso })
      .where(
        and(
          eq(memoryEpisodeParticipant.projectId, input.projectId),
          eq(memoryEpisodeParticipant.entityId, input.sourceEntityId),
        ),
      )
      .run();
    tx
      .update(memoryStateChangeCandidate)
      .set({ subjectEntityId: input.targetEntityId, updatedAt: nowIso })
      .where(
        and(
          eq(memoryStateChangeCandidate.projectId, input.projectId),
          eq(memoryStateChangeCandidate.subjectEntityId, input.sourceEntityId),
        ),
      )
      .run();
    tx
      .update(memoryFact)
      .set({ subjectEntityId: input.targetEntityId, updatedAt: nowIso })
      .where(
        and(
          eq(memoryFact.projectId, input.projectId),
          eq(memoryFact.subjectEntityId, input.sourceEntityId),
        ),
      )
      .run();
    tx
      .update(memoryFact)
      .set({ objectEntityId: input.targetEntityId, updatedAt: nowIso })
      .where(
        and(
          eq(memoryFact.projectId, input.projectId),
          eq(memoryFact.objectEntityId, input.sourceEntityId),
        ),
      )
      .run();
    tx
      .update(memoryRelationState)
      .set({ sourceEntityId: input.targetEntityId, updatedAt: nowIso })
      .where(
        and(
          eq(memoryRelationState.projectId, input.projectId),
          eq(memoryRelationState.sourceEntityId, input.sourceEntityId),
        ),
      )
      .run();
    tx
      .update(memoryRelationState)
      .set({ targetEntityId: input.targetEntityId, updatedAt: nowIso })
      .where(
        and(
          eq(memoryRelationState.projectId, input.projectId),
          eq(memoryRelationState.targetEntityId, input.sourceEntityId),
        ),
      )
      .run();
    tx
      .update(memoryCharacterState)
      .set({ entityId: input.targetEntityId, updatedAt: nowIso })
      .where(
        and(
          eq(memoryCharacterState.projectId, input.projectId),
          eq(memoryCharacterState.entityId, input.sourceEntityId),
        ),
      )
      .run();
    tx
      .update(memoryKnowledgeState)
      .set({ knowerEntityId: input.targetEntityId, updatedAt: nowIso })
      .where(
        and(
          eq(memoryKnowledgeState.projectId, input.projectId),
          eq(memoryKnowledgeState.knowerEntityId, input.sourceEntityId),
        ),
      )
      .run();
    tx
      .update(memoryKnowledgeState)
      .set({ secretEntityId: input.targetEntityId, updatedAt: nowIso })
      .where(
        and(
          eq(memoryKnowledgeState.projectId, input.projectId),
          eq(memoryKnowledgeState.secretEntityId, input.sourceEntityId),
        ),
      )
      .run();
    tx
      .update(memoryEntity)
      .set({
        status: "deprecated",
        deletedAt: nowIso,
        updatedAt: nowIso,
      })
      .where(
        and(
          eq(memoryEntity.projectId, input.projectId),
          eq(memoryEntity.id, input.sourceEntityId),
        ),
      )
      .run();
    tx
      .update(memoryEntity)
      .set({
        status: "confirmed",
        updatedAt: nowIso,
      })
      .where(
        and(
          eq(memoryEntity.projectId, input.projectId),
          eq(memoryEntity.id, input.targetEntityId),
        ),
      )
      .run();
    tx
      .insert(memoryEntityMergeAudit)
      .values({
        id: crypto.randomUUID(),
        projectId: input.projectId,
        sourceEntityId: input.sourceEntityId,
        targetEntityId: input.targetEntityId,
        aliasId: null,
        action: "merge",
        reason: null,
        createdBy: "user",
        updatedAt: nowIso,
      })
      .run();

    return true;
  });

  return { updated };
}

export async function splitMemoryEntityAlias(
  input: MemoryEntityAliasSplitInput & { nowIso?: string },
): Promise<MemoryEntityAliasSplitResult> {
  const canonicalName = input.canonicalName.trim();
  if (!canonicalName) {
    return { updated: false, entityId: null };
  }

  const nowIso = input.nowIso ?? new Date().toISOString();
  const entityId = crypto.randomUUID();
  const updated = db.getClient().transaction((tx) => {
    const [aliasRow] = tx
      .select({
        id: memoryEntityAlias.id,
        entityId: memoryEntityAlias.entityId,
        entityType: memoryEntityAlias.entityType,
        alias: memoryEntityAlias.alias,
        normalizedAlias: memoryEntityAlias.normalizedAlias,
      })
      .from(memoryEntityAlias)
      .where(
        and(
          eq(memoryEntityAlias.projectId, input.projectId),
          eq(memoryEntityAlias.id, input.aliasId),
        ),
      )
      .limit(1)
      .all();

    if (!aliasRow) return false;

    tx
      .insert(memoryEntity)
      .values({
        id: entityId,
        projectId: input.projectId,
        entityType: aliasRow.entityType,
        canonicalName,
        status: "confirmed",
        confidence: 100,
        createdBy: "user",
        updatedAt: nowIso,
      })
      .run();
    tx
      .update(memoryEntityAlias)
      .set({
        entityId,
        alias: aliasRow.alias,
        normalizedAlias: aliasRow.normalizedAlias,
        status: "confirmed",
        updatedAt: nowIso,
      })
      .where(eq(memoryEntityAlias.id, aliasRow.id))
      .run();
    tx
      .update(memoryEntityMention)
      .set({ entityId, updatedAt: nowIso })
      .where(
        and(
          eq(memoryEntityMention.projectId, input.projectId),
          eq(memoryEntityMention.aliasId, aliasRow.id),
        ),
      )
      .run();
    tx
      .insert(memoryEntityMergeAudit)
      .values({
        id: crypto.randomUUID(),
        projectId: input.projectId,
        sourceEntityId: aliasRow.entityId,
        targetEntityId: entityId,
        aliasId: aliasRow.id,
        action: "split",
        reason: null,
        createdBy: "user",
        updatedAt: nowIso,
      })
      .run();

    return true;
  });

  return { updated, entityId: updated ? entityId : null };
}
