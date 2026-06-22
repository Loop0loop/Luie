import { sql } from "drizzle-orm";
import { check, foreignKey, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { project } from "./foundation.js";
import { memoryChunk, chapterSummary } from "./memory.js";
import { memoryEpisode } from "./memoryEpisode.js";
import { memoryFact } from "./memoryTemporal.js";

export const memoryNarrativeSummary = sqliteTable(
  "MemoryNarrativeSummary",
  {
    id: text("id").primaryKey().notNull(),
    projectId: text("projectId").notNull(),
    summaryType: text("summaryType").notNull(),
    scopeType: text("scopeType").notNull(),
    scopeId: text("scopeId"),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    status: text("status").notNull().default("suggested"),
    confidence: integer("confidence").notNull().default(0),
    extractorVersion: text("extractorVersion").notNull(),
    sourceContentHash: text("sourceContentHash").notNull(),
    generatedAt: text("generatedAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
    rejectedAt: text("rejectedAt"),
    rejectionReason: text("rejectionReason"),
  },
  (table) => [
    index("MemoryNarrativeSummary_projectId_type_idx").on(table.projectId, table.summaryType),
    index("MemoryNarrativeSummary_projectId_scope_idx").on(table.projectId, table.scopeType, table.scopeId),
    index("MemoryNarrativeSummary_projectId_status_idx").on(table.projectId, table.status),
    uniqueIndex("MemoryNarrativeSummary_id_projectId_key").on(table.id, table.projectId),
    foreignKey({
      name: "MemoryNarrativeSummary_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
  ],
);

export const memoryNarrativeSummarySource = sqliteTable(
  "MemoryNarrativeSummarySource",
  {
    id: text("id").primaryKey().notNull(),
    projectId: text("projectId").notNull(),
    summaryId: text("summaryId").notNull(),
    sourceType: text("sourceType").notNull(),
    episodeId: text("episodeId"),
    factId: text("factId"),
    chunkId: text("chunkId"),
    chapterSummaryId: text("chapterSummaryId"),
    quote: text("quote"),
    contentHash: text("contentHash").notNull(),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => [
    index("MemoryNarrativeSummarySource_summaryId_idx").on(table.summaryId),
    index("MemoryNarrativeSummarySource_projectId_sourceType_idx").on(table.projectId, table.sourceType),
    foreignKey({
      name: "MemoryNarrativeSummarySource_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "MemoryNarrativeSummarySource_summaryId_fkey",
      columns: [table.summaryId, table.projectId],
      foreignColumns: [memoryNarrativeSummary.id, memoryNarrativeSummary.projectId],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "MemoryNarrativeSummarySource_episodeId_fkey",
      columns: [table.episodeId, table.projectId],
      foreignColumns: [memoryEpisode.id, memoryEpisode.projectId],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "MemoryNarrativeSummarySource_factId_fkey",
      columns: [table.factId, table.projectId],
      foreignColumns: [memoryFact.id, memoryFact.projectId],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "MemoryNarrativeSummarySource_chunkId_fkey",
      columns: [table.chunkId, table.projectId],
      foreignColumns: [memoryChunk.id, memoryChunk.projectId],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "MemoryNarrativeSummarySource_chapterSummaryId_fkey",
      columns: [table.chapterSummaryId, table.projectId],
      foreignColumns: [chapterSummary.id, chapterSummary.projectId],
    }).onDelete("cascade").onUpdate("cascade"),
    check(
      "MemoryNarrativeSummarySource_single_source_check",
      sql`(
        ("sourceType" = 'episode' AND "episodeId" IS NOT NULL AND "factId" IS NULL AND "chunkId" IS NULL AND "chapterSummaryId" IS NULL) OR
        ("sourceType" = 'fact' AND "episodeId" IS NULL AND "factId" IS NOT NULL AND "chunkId" IS NULL AND "chapterSummaryId" IS NULL) OR
        ("sourceType" = 'chunk' AND "episodeId" IS NULL AND "factId" IS NULL AND "chunkId" IS NOT NULL AND "chapterSummaryId" IS NULL) OR
        ("sourceType" = 'chapter_summary' AND "episodeId" IS NULL AND "factId" IS NULL AND "chunkId" IS NULL AND "chapterSummaryId" IS NOT NULL)
      )`,
    ),
  ],
);
