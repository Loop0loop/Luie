import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../../../../database/main/databaseService.js";
import {
  memoryEntity,
  memoryEntityAlias,
  memoryEntityMention,
  chapter,
} from "../../../../../database/schema/index.js";
import type {
  MemoryEntityProfile,
  NarrativeMemoryFactResult,
} from "../../../../../../shared/types/search.js";
import { normalizeMemoryEntityName } from "../../entity/memoryEntityResolution.js";

export async function resolveMemoryEntityIds(input: {
  projectId: string;
  entityId?: string;
  entityName?: string;
  entityNames?: string[];
  entityType?: string;
}): Promise<string[] | null> {
  if (input.entityName || (input.entityNames?.length ?? 0) > 0) {
    const names = input.entityNames?.length
      ? input.entityNames
      : input.entityName
        ? [input.entityName]
        : [];
    if (names.length === 0) return input.entityId ? [input.entityId] : [];

    const resolved = new Set<string>();
    const normalizedType = input.entityType
      ? normalizeMemoryEntityName(input.entityType)
      : null;

    const canonicalQueries = names.map((name) => {
      const normalizedName = normalizeMemoryEntityName(name);
      return Promise.all([
        db
          .getClient()
          .select({ id: memoryEntity.id })
          .from(memoryEntity)
          .where(
            and(
              eq(memoryEntity.projectId, input.projectId),
              normalizedType
                ? eq(memoryEntity.entityType, normalizedType)
                : undefined,
              sql`lower(${memoryEntity.canonicalName}) = ${normalizedName}`,
            ),
          )
          .limit(20),
        db
          .getClient()
          .select({ entityId: memoryEntityAlias.entityId })
          .from(memoryEntityAlias)
          .where(
            and(
              eq(memoryEntityAlias.projectId, input.projectId),
              normalizedType
                ? eq(memoryEntityAlias.entityType, normalizedType)
                : undefined,
              eq(memoryEntityAlias.normalizedAlias, normalizedName),
            ),
          )
          .limit(20),
      ]);
    });

    const rowsByName = await Promise.all(canonicalQueries);
    for (const [canonicalRows, aliasRows] of rowsByName) {
      for (const row of canonicalRows.map((item) => item.id)) {
        resolved.add(row);
      }
      for (const row of aliasRows.map((item) => item.entityId)) {
        resolved.add(row);
      }
    }

    if (resolved.size > 0) {
      return [...resolved];
    }
    return input.entityId ? [input.entityId] : [];
  }

  return input.entityId ? [input.entityId] : null;
}

export async function loadEntityInfo(input: {
  projectId: string;
  entityIds: string[];
}): Promise<Map<string, { name: string; type: string }>> {
  const entityIds = [...new Set(input.entityIds)];
  if (entityIds.length === 0) return new Map();
  const rows = await db
    .getClient()
    .select({
      id: memoryEntity.id,
      name: memoryEntity.canonicalName,
      type: memoryEntity.entityType,
    })
    .from(memoryEntity)
    .where(
      and(
        eq(memoryEntity.projectId, input.projectId),
        inArray(memoryEntity.id, entityIds),
      ),
    );
  return new Map(
    rows.map((row) => [row.id, { name: row.name, type: row.type }]),
  );
}

export async function loadEntityProfiles(input: {
  projectId: string;
  entityIds?: string[];
  entityNames?: string[];
  entityType?: string;
}): Promise<MemoryEntityProfile[]> {
  const entityIds = input.entityIds
    ? [...new Set(input.entityIds)].filter(Boolean)
    : [];

  if (entityIds.length === 0) {
    return [];
  }

  const normalizedType = input.entityType
    ? normalizeMemoryEntityName(input.entityType)
    : null;

  const rows = await db
    .getClient()
    .select({
      id: memoryEntity.id,
      canonicalName: memoryEntity.canonicalName,
      entityType: memoryEntity.entityType,
      status: memoryEntity.status,
    })
    .from(memoryEntity)
    .where(
      and(
        eq(memoryEntity.projectId, input.projectId),
        inArray(memoryEntity.id, entityIds),
        normalizedType ? eq(memoryEntity.entityType, normalizedType) : undefined,
      ),
    )
    .orderBy(memoryEntity.canonicalName);

  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);

  const [aliasRows, mentionRows] = await Promise.all([
    db
      .getClient()
      .select({
        entityId: memoryEntityAlias.entityId,
        alias: memoryEntityAlias.alias,
      })
      .from(memoryEntityAlias)
      .where(
        and(
          eq(memoryEntityAlias.projectId, input.projectId),
          inArray(memoryEntityAlias.entityId, ids),
          normalizedType
            ? eq(memoryEntityAlias.entityType, normalizedType)
            : undefined,
        ),
      ),
    db
      .getClient()
      .select({
        entityId: memoryEntityMention.entityId,
        mentionCount: sql<number>`count(${memoryEntityMention.id})`.mapWith(
          Number,
        ) as never,
        firstMentionChapterOrder: sql<number>`min(${chapter.order})`.mapWith(
          Number,
        ) as never,
        lastMentionChapterOrder: sql<number>`max(${chapter.order})`.mapWith(
          Number,
        ) as never,
      })
      .from(memoryEntityMention)
      .leftJoin(chapter, eq(memoryEntityMention.chapterId, chapter.id))
      .where(
        and(
          eq(memoryEntityMention.projectId, input.projectId),
          inArray(memoryEntityMention.entityId, ids),
        ),
      )
      .groupBy(memoryEntityMention.entityId),
  ]);

  const aliasesByEntity = new Map<string, string[]>();
  for (const row of aliasRows) {
    const list = aliasesByEntity.get(row.entityId) ?? [];
    const alias = row.alias.trim();
    if (alias.length > 0 && !list.includes(alias)) {
      list.push(alias);
      aliasesByEntity.set(row.entityId, list);
    }
  }

  const mentionsByEntity = new Map<
    string,
    { mentionCount: number | null; firstMentionChapterOrder: number | null; lastMentionChapterOrder: number | null }
  >();
  for (const row of mentionRows) {
    mentionsByEntity.set(row.entityId, {
      mentionCount: row.mentionCount ?? 0,
      firstMentionChapterOrder: row.firstMentionChapterOrder ?? null,
      lastMentionChapterOrder: row.lastMentionChapterOrder ?? null,
    });
  }

  const canonicalMatch =
    new Set(rows.map((row) => row.canonicalName.trim().toLowerCase()));
  const extraAliasRows = aliasRows.filter(
    (aliasRow) =>
      !canonicalMatch.has(aliasRow.alias.trim().toLowerCase()) &&
      aliasRow.alias.trim().length > 0,
  );
  for (const row of extraAliasRows) {
    const list = aliasesByEntity.get(row.entityId) ?? [];
    if (!list.includes(row.alias)) {
      list.push(row.alias);
      aliasesByEntity.set(row.entityId, list);
    }
  }

  return rows.map((row) => {
    const mentions = mentionsByEntity.get(row.id);
    const aliases = aliasesByEntity.get(row.id) ?? [];
    return {
      id: row.id,
      canonicalName: row.canonicalName,
      entityType: row.entityType,
      status: row.status,
      aliases,
      aliasCount: aliases.length,
      mentionCount: mentions?.mentionCount ?? 0,
      firstMentionChapterOrder: mentions?.firstMentionChapterOrder ?? null,
      lastMentionChapterOrder: mentions?.lastMentionChapterOrder ?? null,
    };
  });
}

export function resolveRelatedEntity(input: {
  fact: {
    subjectEntityId: string;
    objectEntityId: string | null;
    objectValue: string | null;
  };
  filterEntityIds: string[];
  entityInfo: Map<string, { name: string; type: string }>;
}): Pick<
  NarrativeMemoryFactResult,
  "relatedEntityId" | "relatedEntityName" | "relatedEntityType"
> {
  const currentIds = new Set(input.filterEntityIds);
  const relatedId = currentIds.has(input.fact.subjectEntityId)
    ? input.fact.objectEntityId
    : input.fact.subjectEntityId;
  const relatedInfo = relatedId ? input.entityInfo.get(relatedId) : null;
  return {
    relatedEntityId: relatedId,
    relatedEntityName: relatedInfo?.name ?? input.fact.objectValue,
    relatedEntityType: relatedInfo?.type ?? null,
  };
}
