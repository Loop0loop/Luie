import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../../../database/main/databaseService.js";
import {
  chapter,
  memoryEntity,
  memoryEntityAlias,
  memoryEntityMention,
} from "../../../../database/schema/index.js";
import type {
  MemoryEntityAliasConfirmInput,
  MemoryEntityAliasRejectInput,
  MemoryEntityAliasReviewMutationResult,
  MemoryEntityAliasReviewQueueInput,
  MemoryEntityAliasReviewQueueResult,
  MemoryEntityConfirmInput,
  MemoryEntityRejectInput,
  MemoryEntityReviewMutationResult,
  MemoryEntityReviewQueueInput,
  MemoryEntityReviewQueueResult,
} from "../../../../../shared/types/search.js";

export {
  mergeMemoryEntities,
  splitMemoryEntityAlias,
} from "./entityMergeOperations.js";

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

    tx.update(memoryEntityAlias)
      .set({ status: "confirmed", updatedAt: nowIso })
      .where(eq(memoryEntityAlias.id, aliasRow.id))
      .run();
    tx.update(memoryEntity)
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
