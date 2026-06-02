import { sql } from "drizzle-orm";
import { blob, foreignKey, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { project } from "./foundation.js";
import { chapter } from "./manuscript.js";

export const memoryChunk = sqliteTable(
  "MemoryChunk",
  {
    id: text("id").primaryKey().notNull(),
    projectId: text("projectId").notNull(),
    sourceType: text("sourceType").notNull(),
    sourceId: text("sourceId").notNull(),
    chapterId: text("chapterId"),
    sceneId: text("sceneId"),
    chunkIndex: integer("chunkIndex").notNull(),
    content: text("content").notNull(),
    contentHash: text("contentHash").notNull(),
    startOffset: integer("startOffset"),
    endOffset: integer("endOffset"),
    tokenCount: integer("tokenCount").notNull().default(0),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => [
    index("MemoryChunk_projectId_source_idx").on(table.projectId, table.sourceType, table.sourceId),
    index("MemoryChunk_projectId_chapterId_idx").on(table.projectId, table.chapterId),
    index("MemoryChunk_projectId_sceneId_idx").on(table.projectId, table.sceneId),
    uniqueIndex("MemoryChunk_source_chunkIndex_key").on(
      table.sourceType,
      table.sourceId,
      table.chunkIndex,
    ),
    foreignKey({
      name: "MemoryChunk_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
  ],
);

export const memoryBuildJob = sqliteTable(
  "MemoryBuildJob",
  {
    id: text("id").primaryKey().notNull(),
    projectId: text("projectId").notNull(),
    targetType: text("targetType").notNull(),
    targetId: text("targetId").notNull(),
    jobType: text("jobType").notNull(),
    status: text("status").notNull().default("pending"),
    priority: integer("priority").notNull().default(50),
    attempts: integer("attempts").notNull().default(0),
    error: text("error"),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => [
    index("MemoryBuildJob_projectId_status_priority_idx").on(
      table.projectId,
      table.status,
      table.priority,
    ),
    index("MemoryBuildJob_target_idx").on(table.targetType, table.targetId),
    foreignKey({
      name: "MemoryBuildJob_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
  ],
);

export const chapterSummary = sqliteTable(
  "ChapterSummary",
  {
    id: text("id").primaryKey().notNull(),
    projectId: text("projectId").notNull(),
    chapterId: text("chapterId").notNull(),
    chapterNumber: integer("chapterNumber").notNull().default(0),
    summary: text("summary").notNull(),
    contentHash: text("contentHash").notNull().default(""),
    isFallback: integer("isFallback", { mode: "boolean" }).notNull().default(false),
    model: text("model"),
    generatedAt: text("generatedAt").notNull(),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => [
    uniqueIndex("ChapterSummary_chapterId_key").on(table.chapterId),
    index("ChapterSummary_projectId_idx").on(table.projectId),
    foreignKey({
      name: "ChapterSummary_chapterId_fkey",
      columns: [table.chapterId],
      foreignColumns: [chapter.id],
    }).onDelete("cascade").onUpdate("cascade"),
  ],
);

export const memoryEmbedding = sqliteTable(
  "MemoryEmbedding",
  {
    id: text("id").primaryKey().notNull(),
    chunkId: text("chunkId").notNull(),
    projectId: text("projectId").notNull(),
    contentHash: text("contentHash").notNull().default(""),
    vec: blob("vec", { mode: "buffer" }).notNull(),
    dimension: integer("dimension").notNull(),
    model: text("model"),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => [
    uniqueIndex("MemoryEmbedding_chunkId_key").on(table.chunkId),
    index("MemoryEmbedding_projectId_idx").on(table.projectId),
    foreignKey({
      name: "MemoryEmbedding_chunkId_fkey",
      columns: [table.chunkId],
      foreignColumns: [memoryChunk.id],
    }).onDelete("cascade").onUpdate("cascade"),
  ],
);
