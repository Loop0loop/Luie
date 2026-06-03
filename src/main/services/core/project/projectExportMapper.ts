/**
 * Export DTO mapper — converts Drizzle DB rows to ORM-independent export DTOs.
 *
 * Export types are pure data transfer objects and must NOT reference any ORM types
 * (Prisma or Drizzle). This mapper is the single conversion boundary.
 */

import type {
  ChapterExportRecord,
  CharacterExportRecord,
  TermExportRecord,
  EventExportRecord,
  FactionExportRecord,
  SnapshotExportRecord,
  WorldEntity,
  WorldEntityType,
  EntityRelation,
  WorldEntitySourceType,
  RelationKind,
} from "../../../../shared/types/index.js";
import type * as schema from "../../../infra/database/index.js";
import { buildCanonicalWorldEntityPointers } from "../../world/entityRelationPointers.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDate(value: string | Date | number | null | undefined): Date {
  if (value === null || value === undefined) return new Date();
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  return new Date(value);
}

function toNullableDate(value: string | Date | number | null | undefined): Date | null {
  if (value === null || value === undefined) return null;
  return toDate(value);
}

function normalizeNullableString(value: string | null | undefined): string | null {
  return value ?? null;
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

export function toChapterExportDto(
  row: typeof schema.chapter.$inferSelect,
): ChapterExportRecord {
  return {
    id: row.id,
    title: row.title,
    order: row.order,
    updatedAt: toDate(row.updatedAt),
    content: row.content,
  };
}

export function toCharacterExportDto(
  row: typeof schema.character.$inferSelect,
): CharacterExportRecord {
  return {
    id: row.id,
    name: row.name,
    description: normalizeNullableString(row.description),
    firstAppearance: normalizeNullableString(row.firstAppearance),
    attributes: normalizeNullableString(row.attributes),
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt),
    deletedAt: toNullableDate(row.deletedAt),
  };
}

export function toTermExportDto(
  row: typeof schema.term.$inferSelect,
): TermExportRecord {
  return {
    id: row.id,
    term: row.term,
    definition: normalizeNullableString(row.definition),
    category: normalizeNullableString(row.category),
    firstAppearance: normalizeNullableString(row.firstAppearance),
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt),
    deletedAt: toNullableDate(row.deletedAt),
  };
}

export function toEventExportDto(
  row: typeof schema.event.$inferSelect,
): EventExportRecord {
  return {
    id: row.id,
    name: row.name,
    description: normalizeNullableString(row.description),
    firstAppearance: normalizeNullableString(row.firstAppearance),
    attributes: normalizeNullableString(row.attributes),
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt),
    deletedAt: toNullableDate(row.deletedAt),
  };
}

export function toFactionExportDto(
  row: typeof schema.faction.$inferSelect,
): FactionExportRecord {
  return {
    id: row.id,
    name: row.name,
    description: normalizeNullableString(row.description),
    firstAppearance: normalizeNullableString(row.firstAppearance),
    attributes: normalizeNullableString(row.attributes),
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt),
    deletedAt: toNullableDate(row.deletedAt),
  };
}

export function toSnapshotExportDto(
  row: typeof schema.snapshot.$inferSelect,
): SnapshotExportRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    chapterId: row.chapterId ?? null,
    content: row.content,
    description: normalizeNullableString(row.description),
    createdAt: toDate(row.createdAt),
  };
}

export function toWorldEntityExportDto(
  row: typeof schema.worldEntity.$inferSelect,
): WorldEntity {
  return {
    id: row.id,
    projectId: row.projectId,
    type: row.type as WorldEntityType,
    name: row.name,
    description: normalizeNullableString(row.description),
    firstAppearance: normalizeNullableString(row.firstAppearance),
    attributes: normalizeNullableString(row.attributes),
    positionX: row.positionX,
    positionY: row.positionY,
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt),
  };
}

export function toEntityRelationExportDto(
  row: typeof schema.entityRelation.$inferSelect,
): EntityRelation {
  const sourceType = row.sourceType as WorldEntitySourceType;
  const targetType = row.targetType as WorldEntitySourceType;
  const pointers = buildCanonicalWorldEntityPointers({
    sourceId: row.sourceId,
    sourceType,
    targetId: row.targetId,
    targetType,
  });
  return {
    id: row.id,
    projectId: row.projectId,
    sourceId: row.sourceId,
    sourceType,
    targetId: row.targetId,
    targetType,
    relation: row.relation as RelationKind,
    attributes: normalizeNullableString(row.attributes),
    sourceWorldEntityId: pointers.sourceWorldEntityId,
    targetWorldEntityId: pointers.targetWorldEntityId,
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt),
  };
}
