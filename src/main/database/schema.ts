import { sql } from "drizzle-orm";
import {
  blob,
  foreignKey,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const project = sqliteTable("Project", {
  id: text("id").primaryKey().notNull(),
  title: text("title").notNull(),
  description: text("description"),
  projectPath: text("projectPath"),
  createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updatedAt").notNull(),
});

export const projectAttachment = sqliteTable(
  "ProjectAttachment",
  {
    projectId: text("projectId").notNull(),
    projectPath: text("projectPath"),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId] }),
    uniqueIndex("ProjectAttachment_projectPath_key").on(table.projectPath),
    foreignKey({
      name: "ProjectAttachment_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
  ],
);

export const projectLocalState = sqliteTable(
  "ProjectLocalState",
  {
    projectId: text("projectId").notNull(),
    lastOpenedAt: text("lastOpenedAt"),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId] }),
    index("ProjectLocalState_lastOpenedAt_idx").on(table.lastOpenedAt),
    foreignKey({
      name: "ProjectLocalState_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
  ],
);

export const projectSettings = sqliteTable(
  "ProjectSettings",
  {
    id: text("id").primaryKey().notNull(),
    projectId: text("projectId").notNull(),
    autoSave: integer("autoSave", { mode: "boolean" }).notNull().default(sql`1`),
    autoSaveInterval: integer("autoSaveInterval").notNull().default(30),
    llmModelPath: text("llmModelPath"),
    llmEmbeddingModelPath: text("llmEmbeddingModelPath"),
    llmEmbeddingDimension: integer("llmEmbeddingDimension").notNull().default(1024),
    llmProviderHint: text("llmProviderHint"),
  },
  (table) => [
    uniqueIndex("ProjectSettings_projectId_key").on(table.projectId),
    foreignKey({
      name: "ProjectSettings_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
  ],
);

export const chapter = sqliteTable(
  "Chapter",
  {
    id: text("id").primaryKey().notNull(),
    projectId: text("projectId").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull().default(""),
    synopsis: text("synopsis"),
    order: integer("order").notNull(),
    wordCount: integer("wordCount").notNull().default(0),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
    deletedAt: text("deletedAt"),
  },
  (table) => [
    index("Chapter_projectId_order_idx").on(table.projectId, table.order),
    foreignKey({
      name: "Chapter_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
  ],
);

export const scene = sqliteTable(
  "Scene",
  {
    id: text("id").primaryKey().notNull(),
    projectId: text("projectId").notNull(),
    chapterId: text("chapterId").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    startOffset: integer("startOffset"),
    endOffset: integer("endOffset"),
    order: integer("order").notNull().default(0),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
    deletedAt: text("deletedAt"),
  },
  (table) => [
    index("Scene_projectId_chapterId_order_idx").on(table.projectId, table.chapterId, table.order),
    foreignKey({
      name: "Scene_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "Scene_chapterId_fkey",
      columns: [table.chapterId],
      foreignColumns: [chapter.id],
    }).onDelete("cascade").onUpdate("cascade"),
  ],
);

export const chapterBody = sqliteTable(
  "ChapterBody",
  {
    chapterId: text("chapterId").primaryKey().notNull(),
    content: text("content").notNull().default(""),
    contentHash: text("contentHash").notNull().default(""),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => [
    foreignKey({
      name: "ChapterBody_chapterId_fkey",
      columns: [table.chapterId],
      foreignColumns: [chapter.id],
    }).onDelete("cascade").onUpdate("cascade"),
  ],
);

export const chapterRevision = sqliteTable(
  "ChapterRevision",
  {
    id: text("id").primaryKey().notNull(),
    chapterId: text("chapterId").notNull(),
    contentHash: text("contentHash").notNull(),
    content: text("content").notNull(),
    reason: text("reason").notNull(),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("ChapterRevision_chapterId_createdAt_idx").on(table.chapterId, table.createdAt),
    foreignKey({
      name: "ChapterRevision_chapterId_fkey",
      columns: [table.chapterId],
      foreignColumns: [chapter.id],
    }).onDelete("cascade").onUpdate("cascade"),
  ],
);

export const searchDirtyQueue = sqliteTable(
  "SearchDirtyQueue",
  {
    id: text("id").primaryKey().notNull(),
    projectId: text("projectId").notNull(),
    sourceType: text("sourceType").notNull(),
    sourceId: text("sourceId").notNull(),
    reason: text("reason").notNull(),
    status: text("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    error: text("error"),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => [
    index("SearchDirtyQueue_projectId_status_idx").on(table.projectId, table.status),
    index("SearchDirtyQueue_source_idx").on(table.sourceType, table.sourceId),
    foreignKey({
      name: "SearchDirtyQueue_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
  ],
);

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

export const note = sqliteTable(
  "Note",
  {
    id: text("id").primaryKey().notNull(),
    projectId: text("projectId").notNull(),
    chapterId: text("chapterId"),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
    deletedAt: text("deletedAt"),
  },
  (table) => [
    index("Note_projectId_updatedAt_idx").on(table.projectId, table.updatedAt),
    foreignKey({
      name: "Note_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "Note_chapterId_fkey",
      columns: [table.chapterId],
      foreignColumns: [chapter.id],
    }).onDelete("set null").onUpdate("cascade"),
  ],
);

export const synopsis = sqliteTable(
  "Synopsis",
  {
    id: text("id").primaryKey().notNull(),
    projectId: text("projectId").notNull(),
    chapterId: text("chapterId"),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
    deletedAt: text("deletedAt"),
  },
  (table) => [
    index("Synopsis_projectId_updatedAt_idx").on(table.projectId, table.updatedAt),
    foreignKey({
      name: "Synopsis_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "Synopsis_chapterId_fkey",
      columns: [table.chapterId],
      foreignColumns: [chapter.id],
    }).onDelete("set null").onUpdate("cascade"),
  ],
);

export const plot = sqliteTable(
  "Plot",
  {
    id: text("id").primaryKey().notNull(),
    projectId: text("projectId").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
    deletedAt: text("deletedAt"),
  },
  (table) => [
    index("Plot_projectId_updatedAt_idx").on(table.projectId, table.updatedAt),
    foreignKey({
      name: "Plot_projectId_fkey",
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

const createWorldEntryColumns = () => ({
  id: text("id").primaryKey().notNull(),
  projectId: text("projectId").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  firstAppearance: text("firstAppearance"),
  attributes: text("attributes"),
  createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updatedAt").notNull(),
  deletedAt: text("deletedAt"),
});

export const character = sqliteTable(
  "Character",
  createWorldEntryColumns(),
  (table) => [
    index("Character_projectId_name_idx").on(table.projectId, table.name),
    index("Character_projectId_createdAt_idx").on(
      table.projectId,
      table.createdAt,
    ),
    foreignKey({
      name: "Character_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
  ],
);

export const event = sqliteTable("Event", createWorldEntryColumns(), (table) => [
  index("Event_projectId_name_idx").on(table.projectId, table.name),
  index("Event_projectId_createdAt_idx").on(
    table.projectId,
    table.createdAt,
  ),
  foreignKey({
    name: "Event_projectId_fkey",
    columns: [table.projectId],
    foreignColumns: [project.id],
  }).onDelete("cascade").onUpdate("cascade"),
]);

export const faction = sqliteTable("Faction", createWorldEntryColumns(), (table) => [
  index("Faction_projectId_name_idx").on(table.projectId, table.name),
  index("Faction_projectId_createdAt_idx").on(
    table.projectId,
    table.createdAt,
  ),
  foreignKey({
    name: "Faction_projectId_fkey",
    columns: [table.projectId],
    foreignColumns: [project.id],
  }).onDelete("cascade").onUpdate("cascade"),
]);

export const worldDocument = sqliteTable(
  "WorldDocument",
  {
    id: text("id").primaryKey().notNull(),
    projectId: text("projectId").notNull(),
    docType: text("docType").notNull(),
    payload: text("payload").notNull(),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => [
    uniqueIndex("WorldDocument_projectId_docType_key").on(table.projectId, table.docType),
    index("WorldDocument_projectId_updatedAt_idx").on(table.projectId, table.updatedAt),
    foreignKey({
      name: "WorldDocument_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
  ],
);

export const scrapMemo = sqliteTable(
  "ScrapMemo",
  {
    id: text("id").primaryKey().notNull(),
    projectId: text("projectId").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    tags: text("tags").notNull().default("[]"),
    sortOrder: integer("sortOrder").notNull().default(0),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
    deletedAt: text("deletedAt"),
  },
  (table) => [
    index("ScrapMemo_projectId_sortOrder_idx").on(table.projectId, table.sortOrder),
    index("ScrapMemo_projectId_updatedAt_idx").on(table.projectId, table.updatedAt),
    index("ScrapMemo_projectId_sortOrder_updatedAt_idx").on(
      table.projectId,
      table.sortOrder,
      table.updatedAt,
    ),
    foreignKey({
      name: "ScrapMemo_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
  ],
);

export const term = sqliteTable(
  "Term",
  {
    id: text("id").primaryKey().notNull(),
    projectId: text("projectId").notNull(),
    term: text("term").notNull(),
    definition: text("definition"),
    category: text("category"),
    order: integer("order").notNull().default(0),
    firstAppearance: text("firstAppearance"),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
    deletedAt: text("deletedAt"),
  },
  (table) => [
    index("Term_projectId_term_idx").on(table.projectId, table.term),
    index("Term_projectId_createdAt_idx").on(
      table.projectId,
      table.createdAt,
    ),
    foreignKey({
      name: "Term_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
  ],
);

export const snapshot = sqliteTable(
  "Snapshot",
  {
    id: text("id").primaryKey().notNull(),
    projectId: text("projectId").notNull(),
    chapterId: text("chapterId"),
    content: text("content").notNull(),
    contentLength: integer("contentLength").notNull().default(0),
    type: text("type", { enum: ["AUTO", "MANUAL"] }).notNull().default("AUTO"),
    description: text("description"),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("Snapshot_projectId_createdAt_idx").on(table.projectId, table.createdAt),
    index("Snapshot_projectId_chapterId_createdAt_idx").on(table.projectId, table.chapterId, table.createdAt),
    index("Snapshot_projectId_type_createdAt_idx").on(table.projectId, table.type, table.createdAt),
    foreignKey({
      name: "Snapshot_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "Snapshot_chapterId_fkey",
      columns: [table.chapterId],
      foreignColumns: [chapter.id],
    }).onDelete("cascade").onUpdate("cascade"),
  ],
);

export const worldEntity = sqliteTable(
  "WorldEntity",
  {
    id: text("id").primaryKey().notNull(),
    projectId: text("projectId").notNull(),
    type: text("type").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    firstAppearance: text("firstAppearance"),
    attributes: text("attributes"),
    positionX: real("positionX").notNull().default(0),
    positionY: real("positionY").notNull().default(0),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
    deletedAt: text("deletedAt"),
  },
  (table) => [
    index("WorldEntity_projectId_type_idx").on(table.projectId, table.type),
    index("WorldEntity_projectId_name_idx").on(table.projectId, table.name),
    index("WorldEntity_projectId_createdAt_idx").on(
      table.projectId,
      table.createdAt,
    ),
    foreignKey({
      name: "WorldEntity_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
  ],
);

export const entityRelation = sqliteTable(
  "EntityRelation",
  {
    id: text("id").primaryKey().notNull(),
    projectId: text("projectId").notNull(),
    sourceId: text("sourceId").notNull(),
    sourceType: text("sourceType").notNull(),
    targetId: text("targetId").notNull(),
    targetType: text("targetType").notNull(),
    relation: text("relation").notNull(),
    attributes: text("attributes"),
    sourceWorldEntityId: text("sourceWorldEntityId"),
    targetWorldEntityId: text("targetWorldEntityId"),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => [
    index("EntityRelation_projectId_sourceId_idx").on(table.projectId, table.sourceId),
    index("EntityRelation_projectId_targetId_idx").on(table.projectId, table.targetId),
    index("EntityRelation_projectId_relation_idx").on(table.projectId, table.relation),
    foreignKey({
      name: "EntityRelation_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "EntityRelation_sourceWorldEntityId_fkey",
      columns: [table.sourceWorldEntityId],
      foreignColumns: [worldEntity.id],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "EntityRelation_targetWorldEntityId_fkey",
      columns: [table.targetWorldEntityId],
      foreignColumns: [worldEntity.id],
    }).onDelete("cascade").onUpdate("cascade"),
  ],
);

export type ProjectRow = typeof project.$inferSelect;
export type NewProjectRow = typeof project.$inferInsert;
export type ChapterRow = typeof chapter.$inferSelect;
export type NewChapterRow = typeof chapter.$inferInsert;
