import { sql } from "drizzle-orm";
import {
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
    autoSave: integer("autoSave", { mode: "boolean" }).notNull().default(true),
    autoSaveInterval: integer("autoSaveInterval").notNull().default(30),
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
    foreignKey({
      name: "Character_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
  ],
);

export const event = sqliteTable("Event", createWorldEntryColumns(), (table) => [
  index("Event_projectId_name_idx").on(table.projectId, table.name),
  foreignKey({
    name: "Event_projectId_fkey",
    columns: [table.projectId],
    foreignColumns: [project.id],
  }).onDelete("cascade").onUpdate("cascade"),
]);

export const faction = sqliteTable("Faction", createWorldEntryColumns(), (table) => [
  index("Faction_projectId_name_idx").on(table.projectId, table.name),
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
  },
  (table) => [
    index("ScrapMemo_projectId_sortOrder_idx").on(table.projectId, table.sortOrder),
    index("ScrapMemo_projectId_updatedAt_idx").on(table.projectId, table.updatedAt),
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
  },
  (table) => [
    index("WorldEntity_projectId_type_idx").on(table.projectId, table.type),
    index("WorldEntity_projectId_name_idx").on(table.projectId, table.name),
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
