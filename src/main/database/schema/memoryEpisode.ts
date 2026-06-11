import { sql } from "drizzle-orm";
import { foreignKey, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { project } from "./foundation.js";
import { chapter, scene } from "./manuscript.js";
import { memoryEntity } from "./memoryIdentity.js";

export const memoryEpisodeExtractionJob = sqliteTable(
  "MemoryEpisodeExtractionJob",
  {
    id: text("id").primaryKey().notNull(),
    projectId: text("projectId").notNull(),
    sourceType: text("sourceType").notNull(),
    sourceId: text("sourceId").notNull(),
    sourceContentHash: text("sourceContentHash").notNull(),
    extractorVersion: text("extractorVersion").notNull(),
    status: text("status").notNull().default("pending"),
    priority: integer("priority").notNull().default(50),
    attempts: integer("attempts").notNull().default(0),
    error: text("error"),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => [
    index("MemoryEpisodeExtractionJob_projectId_status_priority_idx").on(
      table.projectId,
      table.status,
      table.priority,
    ),
    uniqueIndex("MemoryEpisodeExtractionJob_source_version_key").on(
      table.projectId,
      table.sourceType,
      table.sourceId,
      table.sourceContentHash,
      table.extractorVersion,
    ),
    foreignKey({
      name: "MemoryEpisodeExtractionJob_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
  ],
);

export const memoryEpisode = sqliteTable(
  "MemoryEpisode",
  {
    id: text("id").primaryKey().notNull(),
    projectId: text("projectId").notNull(),
    sourceType: text("sourceType").notNull(),
    sourceId: text("sourceId").notNull(),
    chapterId: text("chapterId"),
    sceneId: text("sceneId"),
    sourceContentHash: text("sourceContentHash").notNull(),
    extractorVersion: text("extractorVersion").notNull(),
    episodeType: text("episodeType").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    status: text("status").notNull().default("suggested"),
    provenanceKind: text("provenanceKind").notNull().default("unknown"),
    canonStatus: text("canonStatus").notNull().default("unknown"),
    confidence: integer("confidence").notNull().default(0),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
    rejectedAt: text("rejectedAt"),
    rejectionReason: text("rejectionReason"),
  },
  (table) => [
    index("MemoryEpisode_projectId_source_idx").on(table.projectId, table.sourceType, table.sourceId),
    index("MemoryEpisode_projectId_status_idx").on(table.projectId, table.status),
    index("MemoryEpisode_projectId_chapterId_idx").on(table.projectId, table.chapterId),
    uniqueIndex("MemoryEpisode_id_projectId_key").on(table.id, table.projectId),
    foreignKey({
      name: "MemoryEpisode_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "MemoryEpisode_chapterId_fkey",
      columns: [table.chapterId],
      foreignColumns: [chapter.id],
    }).onDelete("set null").onUpdate("cascade"),
    foreignKey({
      name: "MemoryEpisode_sceneId_fkey",
      columns: [table.sceneId],
      foreignColumns: [scene.id],
    }).onDelete("set null").onUpdate("cascade"),
  ],
);

export const memoryEpisodeParticipant = sqliteTable(
  "MemoryEpisodeParticipant",
  {
    id: text("id").primaryKey().notNull(),
    projectId: text("projectId").notNull(),
    episodeId: text("episodeId").notNull(),
    entityId: text("entityId"),
    surfaceName: text("surfaceName").notNull(),
    role: text("role").notNull().default("mentioned"),
    status: text("status").notNull().default("suggested"),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
    rejectedAt: text("rejectedAt"),
    rejectionReason: text("rejectionReason"),
  },
  (table) => [
    index("MemoryEpisodeParticipant_episodeId_idx").on(table.episodeId),
    foreignKey({
      name: "MemoryEpisodeParticipant_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "MemoryEpisodeParticipant_episodeId_fkey",
      columns: [table.episodeId],
      foreignColumns: [memoryEpisode.id],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "MemoryEpisodeParticipant_entityId_fkey",
      columns: [table.entityId],
      foreignColumns: [memoryEntity.id],
    }).onDelete("set null").onUpdate("cascade"),
  ],
);

export const memoryEpisodeEvidence = sqliteTable(
  "MemoryEpisodeEvidence",
  {
    id: text("id").primaryKey().notNull(),
    projectId: text("projectId").notNull(),
    episodeId: text("episodeId").notNull(),
    chapterId: text("chapterId"),
    chunkId: text("chunkId"),
    contentHash: text("contentHash").notNull(),
    sourceContentHash: text("sourceContentHash").notNull(),
    startOffset: integer("startOffset"),
    endOffset: integer("endOffset"),
    quote: text("quote").notNull(),
    provenanceKind: text("provenanceKind").notNull().default("unknown"),
    canonStatus: text("canonStatus").notNull().default("unknown"),
    reviewStatus: text("reviewStatus").notNull().default("pending"),
    reviewerNote: text("reviewerNote"),
    reviewedAt: text("reviewedAt"),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => [
    index("MemoryEpisodeEvidence_episodeId_idx").on(table.episodeId),
    index("MemoryEpisodeEvidence_projectId_chapterId_idx").on(table.projectId, table.chapterId),
    uniqueIndex("MemoryEpisodeEvidence_id_projectId_key").on(table.id, table.projectId),
    foreignKey({
      name: "MemoryEpisodeEvidence_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "MemoryEpisodeEvidence_episodeId_fkey",
      columns: [table.episodeId],
      foreignColumns: [memoryEpisode.id],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "MemoryEpisodeEvidence_chapterId_fkey",
      columns: [table.chapterId],
      foreignColumns: [chapter.id],
    }).onDelete("set null").onUpdate("cascade"),
  ],
);

export const memoryStateChangeCandidate = sqliteTable(
  "MemoryStateChangeCandidate",
  {
    id: text("id").primaryKey().notNull(),
    projectId: text("projectId").notNull(),
    episodeId: text("episodeId").notNull(),
    evidenceId: text("evidenceId").notNull(),
    subjectEntityId: text("subjectEntityId"),
    stateType: text("stateType").notNull(),
    beforeValue: text("beforeValue"),
    afterValue: text("afterValue").notNull(),
    status: text("status").notNull().default("suggested"),
    confidence: integer("confidence").notNull().default(0),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
    rejectedAt: text("rejectedAt"),
    rejectionReason: text("rejectionReason"),
  },
  (table) => [
    index("MemoryStateChangeCandidate_episodeId_idx").on(table.episodeId),
    index("MemoryStateChangeCandidate_projectId_status_idx").on(table.projectId, table.status),
    foreignKey({
      name: "MemoryStateChangeCandidate_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "MemoryStateChangeCandidate_episodeId_fkey",
      columns: [table.episodeId],
      foreignColumns: [memoryEpisode.id],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "MemoryStateChangeCandidate_evidenceId_fkey",
      columns: [table.evidenceId],
      foreignColumns: [memoryEpisodeEvidence.id],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "MemoryStateChangeCandidate_subjectEntityId_fkey",
      columns: [table.subjectEntityId],
      foreignColumns: [memoryEntity.id],
    }).onDelete("set null").onUpdate("cascade"),
  ],
);
