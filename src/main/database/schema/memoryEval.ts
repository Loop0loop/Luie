import { sql } from "drizzle-orm";
import { foreignKey, index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { project } from "./foundation.js";
import { chapter } from "./manuscript.js";

export const memoryEvalCase = sqliteTable(
  "MemoryEvalCase",
  {
    id: text("id").primaryKey().notNull(),
    projectId: text("projectId").notNull(),
    name: text("name").notNull(),
    question: text("question").notNull(),
    caseType: text("caseType").notNull().default("qa"),
    expectedAnswer: text("expectedAnswer"),
    temporalScopeStartChapterId: text("temporalScopeStartChapterId"),
    temporalScopeEndChapterId: text("temporalScopeEndChapterId"),
    severity: text("severity").notNull().default("p1"),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => [
    index("MemoryEvalCase_projectId_caseType_idx").on(table.projectId, table.caseType),
    index("MemoryEvalCase_projectId_severity_idx").on(table.projectId, table.severity),
    foreignKey({
      name: "MemoryEvalCase_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
  ],
);

export const memoryEvalEvidence = sqliteTable(
  "MemoryEvalEvidence",
  {
    id: text("id").primaryKey().notNull(),
    caseId: text("caseId").notNull(),
    projectId: text("projectId").notNull(),
    chapterId: text("chapterId"),
    expectedChunkId: text("expectedChunkId"),
    startOffset: integer("startOffset"),
    endOffset: integer("endOffset"),
    quote: text("quote").notNull(),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => [
    index("MemoryEvalEvidence_caseId_idx").on(table.caseId),
    index("MemoryEvalEvidence_projectId_chapterId_idx").on(table.projectId, table.chapterId),
    foreignKey({
      name: "MemoryEvalEvidence_caseId_fkey",
      columns: [table.caseId],
      foreignColumns: [memoryEvalCase.id],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "MemoryEvalEvidence_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "MemoryEvalEvidence_chapterId_fkey",
      columns: [table.chapterId],
      foreignColumns: [chapter.id],
    }).onDelete("set null").onUpdate("cascade"),
  ],
);

// Fixture storage for later entity/relation/temporal scorers. Phase 1 only
// scores evidence recall and unsupported confirmed answers.
export const memoryEvalEntity = sqliteTable(
  "MemoryEvalEntity",
  {
    id: text("id").primaryKey().notNull(),
    caseId: text("caseId").notNull(),
    projectId: text("projectId").notNull(),
    name: text("name").notNull(),
    entityType: text("entityType").notNull(),
    expectedAttributes: text("expectedAttributes"),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => [
    index("MemoryEvalEntity_caseId_idx").on(table.caseId),
    index("MemoryEvalEntity_projectId_name_idx").on(table.projectId, table.name),
    foreignKey({
      name: "MemoryEvalEntity_caseId_fkey",
      columns: [table.caseId],
      foreignColumns: [memoryEvalCase.id],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "MemoryEvalEntity_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
  ],
);

export const memoryEvalRelation = sqliteTable(
  "MemoryEvalRelation",
  {
    id: text("id").primaryKey().notNull(),
    caseId: text("caseId").notNull(),
    projectId: text("projectId").notNull(),
    sourceName: text("sourceName").notNull(),
    targetName: text("targetName").notNull(),
    relation: text("relation").notNull(),
    temporalScope: text("temporalScope"),
    expectedAttributes: text("expectedAttributes"),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => [
    index("MemoryEvalRelation_caseId_idx").on(table.caseId),
    index("MemoryEvalRelation_projectId_relation_idx").on(table.projectId, table.relation),
    foreignKey({
      name: "MemoryEvalRelation_caseId_fkey",
      columns: [table.caseId],
      foreignColumns: [memoryEvalCase.id],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "MemoryEvalRelation_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
  ],
);

export const memoryEvalRun = sqliteTable(
  "MemoryEvalRun",
  {
    id: text("id").primaryKey().notNull(),
    projectId: text("projectId").notNull(),
    label: text("label").notNull(),
    engineVersion: text("engineVersion").notNull(),
    status: text("status").notNull().default("running"),
    startedAt: text("startedAt").notNull(),
    completedAt: text("completedAt"),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => [
    index("MemoryEvalRun_projectId_startedAt_idx").on(table.projectId, table.startedAt),
    index("MemoryEvalRun_projectId_status_idx").on(table.projectId, table.status),
    foreignKey({
      name: "MemoryEvalRun_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
  ],
);

export const memoryEvalResult = sqliteTable(
  "MemoryEvalResult",
  {
    id: text("id").primaryKey().notNull(),
    runId: text("runId").notNull(),
    caseId: text("caseId").notNull(),
    projectId: text("projectId").notNull(),
    groundingStatus: text("groundingStatus").notNull(),
    evidenceHitCount: integer("evidenceHitCount").notNull().default(0),
    evidenceMissCount: integer("evidenceMissCount").notNull().default(0),
    contextRecallAtK: real("contextRecallAtK").notNull().default(0),
    p0FailureCount: integer("p0FailureCount").notNull().default(0),
    p0Failures: text("p0Failures").notNull().default("[]"),
    answer: text("answer"),
    answerJudgeJson: text("answerJudgeJson"),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => [
    index("MemoryEvalResult_runId_idx").on(table.runId),
    index("MemoryEvalResult_caseId_idx").on(table.caseId),
    index("MemoryEvalResult_projectId_p0_idx").on(table.projectId, table.p0FailureCount),
    foreignKey({
      name: "MemoryEvalResult_runId_fkey",
      columns: [table.runId],
      foreignColumns: [memoryEvalRun.id],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "MemoryEvalResult_caseId_fkey",
      columns: [table.caseId],
      foreignColumns: [memoryEvalCase.id],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "MemoryEvalResult_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
  ],
);
