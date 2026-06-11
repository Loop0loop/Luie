import { sql } from "drizzle-orm";
import { foreignKey, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { project } from "./foundation.js";
import { chapter } from "./manuscript.js";
import { memoryEpisodeEvidence } from "./memoryEpisode.js";
import { memoryEntity } from "./memoryIdentity.js";

export const memoryFact = sqliteTable(
  "MemoryFact",
  {
    id: text("id").primaryKey().notNull(),
    projectId: text("projectId").notNull(),
    subjectEntityId: text("subjectEntityId").notNull(),
    predicate: text("predicate").notNull(),
    objectEntityId: text("objectEntityId"),
    objectValue: text("objectValue"),
    valueType: text("valueType").notNull(),
    validFromChapterId: text("validFromChapterId").notNull(),
    validFromChapterOrder: integer("validFromChapterOrder").notNull(),
    validToChapterId: text("validToChapterId"),
    validToChapterOrder: integer("validToChapterOrder"),
    observedAtChapterId: text("observedAtChapterId").notNull(),
    observedAtChapterOrder: integer("observedAtChapterOrder").notNull(),
    confidence: integer("confidence").notNull().default(0),
    status: text("status").notNull().default("suggested"),
    provenanceKind: text("provenanceKind").notNull().default("unknown"),
    canonStatus: text("canonStatus").notNull().default("unknown"),
    extractorVersion: text("extractorVersion").notNull(),
    sourceContentHash: text("sourceContentHash").notNull(),
    invalidatedByFactId: text("invalidatedByFactId"),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
    rejectedAt: text("rejectedAt"),
    rejectionReason: text("rejectionReason"),
  },
  (table) => [
    index("MemoryFact_projectId_subject_predicate_idx").on(
      table.projectId,
      table.subjectEntityId,
      table.predicate,
    ),
    index("MemoryFact_projectId_validity_idx").on(
      table.projectId,
      table.validFromChapterOrder,
      table.validToChapterOrder,
    ),
    index("MemoryFact_projectId_status_idx").on(table.projectId, table.status),
    uniqueIndex("MemoryFact_id_projectId_key").on(table.id, table.projectId),
    foreignKey({
      name: "MemoryFact_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "MemoryFact_subjectEntityId_fkey",
      columns: [table.subjectEntityId, table.projectId],
      foreignColumns: [memoryEntity.id, memoryEntity.projectId],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "MemoryFact_objectEntityId_fkey",
      columns: [table.objectEntityId, table.projectId],
      foreignColumns: [memoryEntity.id, memoryEntity.projectId],
    }).onDelete("restrict").onUpdate("cascade"),
    foreignKey({
      name: "MemoryFact_validFromChapterId_fkey",
      columns: [table.validFromChapterId],
      foreignColumns: [chapter.id],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "MemoryFact_validToChapterId_fkey",
      columns: [table.validToChapterId],
      foreignColumns: [chapter.id],
    }).onDelete("set null").onUpdate("cascade"),
    foreignKey({
      name: "MemoryFact_observedAtChapterId_fkey",
      columns: [table.observedAtChapterId],
      foreignColumns: [chapter.id],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "MemoryFact_invalidatedByFactId_fkey",
      columns: [table.invalidatedByFactId, table.projectId],
      foreignColumns: [table.id, table.projectId],
    }).onDelete("cascade").onUpdate("cascade"),
  ],
);

export const memoryFactEvidence = sqliteTable(
  "MemoryFactEvidence",
  {
    id: text("id").primaryKey().notNull(),
    projectId: text("projectId").notNull(),
    factId: text("factId").notNull(),
    evidenceId: text("evidenceId").notNull(),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => [
    index("MemoryFactEvidence_factId_idx").on(table.factId),
    foreignKey({
      name: "MemoryFactEvidence_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "MemoryFactEvidence_factId_fkey",
      columns: [table.factId, table.projectId],
      foreignColumns: [memoryFact.id, memoryFact.projectId],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "MemoryFactEvidence_evidenceId_fkey",
      columns: [table.evidenceId, table.projectId],
      foreignColumns: [memoryEpisodeEvidence.id, memoryEpisodeEvidence.projectId],
    }).onDelete("cascade").onUpdate("cascade"),
  ],
);

export const memoryFactInvalidation = sqliteTable(
  "MemoryFactInvalidation",
  {
    id: text("id").primaryKey().notNull(),
    projectId: text("projectId").notNull(),
    invalidatedFactId: text("invalidatedFactId").notNull(),
    invalidatingFactId: text("invalidatingFactId").notNull(),
    reason: text("reason").notNull(),
    reviewStatus: text("reviewStatus").notNull().default("pending"),
    reviewerNote: text("reviewerNote"),
    reviewedAt: text("reviewedAt"),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => [
    index("MemoryFactInvalidation_invalidatedFactId_idx").on(table.invalidatedFactId),
    foreignKey({
      name: "MemoryFactInvalidation_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "MemoryFactInvalidation_invalidatedFactId_fkey",
      columns: [table.invalidatedFactId, table.projectId],
      foreignColumns: [memoryFact.id, memoryFact.projectId],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "MemoryFactInvalidation_invalidatingFactId_fkey",
      columns: [table.invalidatingFactId, table.projectId],
      foreignColumns: [memoryFact.id, memoryFact.projectId],
    }).onDelete("cascade").onUpdate("cascade"),
  ],
);

export const memoryRelationState = sqliteTable(
  "MemoryRelationState",
  {
    id: text("id").primaryKey().notNull(),
    projectId: text("projectId").notNull(),
    factId: text("factId").notNull(),
    sourceEntityId: text("sourceEntityId").notNull(),
    targetEntityId: text("targetEntityId").notNull(),
    relation: text("relation").notNull(),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => [
    index("MemoryRelationState_projectId_relation_idx").on(table.projectId, table.relation),
    foreignKey({
      name: "MemoryRelationState_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "MemoryRelationState_factId_fkey",
      columns: [table.factId, table.projectId],
      foreignColumns: [memoryFact.id, memoryFact.projectId],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "MemoryRelationState_sourceEntityId_fkey",
      columns: [table.sourceEntityId, table.projectId],
      foreignColumns: [memoryEntity.id, memoryEntity.projectId],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "MemoryRelationState_targetEntityId_fkey",
      columns: [table.targetEntityId, table.projectId],
      foreignColumns: [memoryEntity.id, memoryEntity.projectId],
    }).onDelete("cascade").onUpdate("cascade"),
  ],
);

export const memoryCharacterState = sqliteTable(
  "MemoryCharacterState",
  {
    id: text("id").primaryKey().notNull(),
    projectId: text("projectId").notNull(),
    factId: text("factId").notNull(),
    entityId: text("entityId").notNull(),
    stateType: text("stateType").notNull(),
    stateValue: text("stateValue").notNull(),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => [
    index("MemoryCharacterState_projectId_stateType_idx").on(table.projectId, table.stateType),
    foreignKey({
      name: "MemoryCharacterState_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "MemoryCharacterState_factId_fkey",
      columns: [table.factId, table.projectId],
      foreignColumns: [memoryFact.id, memoryFact.projectId],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "MemoryCharacterState_entityId_fkey",
      columns: [table.entityId, table.projectId],
      foreignColumns: [memoryEntity.id, memoryEntity.projectId],
    }).onDelete("cascade").onUpdate("cascade"),
  ],
);

export const memoryKnowledgeState = sqliteTable(
  "MemoryKnowledgeState",
  {
    id: text("id").primaryKey().notNull(),
    projectId: text("projectId").notNull(),
    factId: text("factId").notNull(),
    knowerEntityId: text("knowerEntityId").notNull(),
    secretEntityId: text("secretEntityId"),
    knowledgeKey: text("knowledgeKey").notNull(),
    knowledgeValue: text("knowledgeValue").notNull(),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => [
    index("MemoryKnowledgeState_projectId_knower_idx").on(table.projectId, table.knowerEntityId),
    foreignKey({
      name: "MemoryKnowledgeState_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "MemoryKnowledgeState_factId_fkey",
      columns: [table.factId, table.projectId],
      foreignColumns: [memoryFact.id, memoryFact.projectId],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "MemoryKnowledgeState_knowerEntityId_fkey",
      columns: [table.knowerEntityId, table.projectId],
      foreignColumns: [memoryEntity.id, memoryEntity.projectId],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "MemoryKnowledgeState_secretEntityId_fkey",
      columns: [table.secretEntityId, table.projectId],
      foreignColumns: [memoryEntity.id, memoryEntity.projectId],
    }).onDelete("restrict").onUpdate("cascade"),
  ],
);
