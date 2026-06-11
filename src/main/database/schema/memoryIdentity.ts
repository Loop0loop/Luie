import { sql } from "drizzle-orm";
import { foreignKey, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { project } from "./foundation.js";
import { chapter } from "./manuscript.js";

export const memoryEntity = sqliteTable(
  "MemoryEntity",
  {
    id: text("id").primaryKey().notNull(),
    projectId: text("projectId").notNull(),
    entityType: text("entityType").notNull(),
    canonicalName: text("canonicalName").notNull(),
    status: text("status").notNull().default("suggested"),
    provenanceKind: text("provenanceKind").notNull().default("unknown"),
    canonStatus: text("canonStatus").notNull().default("unknown"),
    confidence: integer("confidence").notNull().default(0),
    createdBy: text("createdBy").notNull().default("system"),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
    deletedAt: text("deletedAt"),
    rejectedAt: text("rejectedAt"),
    rejectionReason: text("rejectionReason"),
  },
  (table) => [
    index("MemoryEntity_projectId_type_idx").on(table.projectId, table.entityType),
    index("MemoryEntity_projectId_status_idx").on(table.projectId, table.status),
    uniqueIndex("MemoryEntity_id_projectId_key").on(table.id, table.projectId),
    uniqueIndex("MemoryEntity_projectId_type_name_key").on(
      table.projectId,
      table.entityType,
      table.canonicalName,
    ),
    foreignKey({
      name: "MemoryEntity_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
  ],
);

export const memoryEntityAlias = sqliteTable(
  "MemoryEntityAlias",
  {
    id: text("id").primaryKey().notNull(),
    projectId: text("projectId").notNull(),
    entityId: text("entityId").notNull(),
    entityType: text("entityType").notNull(),
    alias: text("alias").notNull(),
    normalizedAlias: text("normalizedAlias").notNull(),
    status: text("status").notNull().default("suggested"),
    provenanceKind: text("provenanceKind").notNull().default("unknown"),
    canonStatus: text("canonStatus").notNull().default("unknown"),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
    rejectedAt: text("rejectedAt"),
    rejectionReason: text("rejectionReason"),
  },
  (table) => [
    index("MemoryEntityAlias_entityId_idx").on(table.entityId),
    uniqueIndex("MemoryEntityAlias_projectId_alias_key").on(
      table.projectId,
      table.entityType,
      table.normalizedAlias,
    ),
    foreignKey({
      name: "MemoryEntityAlias_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "MemoryEntityAlias_entityId_fkey",
      columns: [table.entityId],
      foreignColumns: [memoryEntity.id],
    }).onDelete("cascade").onUpdate("cascade"),
  ],
);

export const memoryEntityMention = sqliteTable(
  "MemoryEntityMention",
  {
    id: text("id").primaryKey().notNull(),
    projectId: text("projectId").notNull(),
    entityId: text("entityId").notNull(),
    aliasId: text("aliasId"),
    chapterId: text("chapterId"),
    chunkId: text("chunkId"),
    contentHash: text("contentHash").notNull().default(""),
    sourceContentHash: text("sourceContentHash").notNull().default(""),
    startOffset: integer("startOffset"),
    endOffset: integer("endOffset"),
    quote: text("quote").notNull(),
    extractorVersion: text("extractorVersion").notNull().default("manual"),
    confidence: integer("confidence").notNull().default(0),
    status: text("status").notNull().default("suggested"),
    provenanceKind: text("provenanceKind").notNull().default("unknown"),
    canonStatus: text("canonStatus").notNull().default("unknown"),
    reviewStatus: text("reviewStatus").notNull().default("pending"),
    reviewerNote: text("reviewerNote"),
    reviewedAt: text("reviewedAt"),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => [
    index("MemoryEntityMention_entityId_idx").on(table.entityId),
    index("MemoryEntityMention_projectId_chapterId_idx").on(table.projectId, table.chapterId),
    foreignKey({
      name: "MemoryEntityMention_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "MemoryEntityMention_entityId_fkey",
      columns: [table.entityId],
      foreignColumns: [memoryEntity.id],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "MemoryEntityMention_aliasId_fkey",
      columns: [table.aliasId],
      foreignColumns: [memoryEntityAlias.id],
    }).onDelete("set null").onUpdate("cascade"),
    foreignKey({
      name: "MemoryEntityMention_chapterId_fkey",
      columns: [table.chapterId],
      foreignColumns: [chapter.id],
    }).onDelete("set null").onUpdate("cascade"),
  ],
);

export const memoryEntityMergeAudit = sqliteTable(
  "MemoryEntityMergeAudit",
  {
    id: text("id").primaryKey().notNull(),
    projectId: text("projectId").notNull(),
    sourceEntityId: text("sourceEntityId").notNull(),
    targetEntityId: text("targetEntityId").notNull(),
    aliasId: text("aliasId"),
    action: text("action").notNull(),
    reason: text("reason"),
    createdBy: text("createdBy").notNull().default("user"),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => [
    index("MemoryEntityMergeAudit_projectId_source_idx").on(
      table.projectId,
      table.sourceEntityId,
    ),
    index("MemoryEntityMergeAudit_projectId_target_idx").on(
      table.projectId,
      table.targetEntityId,
    ),
    foreignKey({
      name: "MemoryEntityMergeAudit_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "MemoryEntityMergeAudit_sourceEntityId_fkey",
      columns: [table.sourceEntityId],
      foreignColumns: [memoryEntity.id],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "MemoryEntityMergeAudit_targetEntityId_fkey",
      columns: [table.targetEntityId],
      foreignColumns: [memoryEntity.id],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "MemoryEntityMergeAudit_aliasId_fkey",
      columns: [table.aliasId],
      foreignColumns: [memoryEntityAlias.id],
    }).onDelete("set null").onUpdate("cascade"),
  ],
);
