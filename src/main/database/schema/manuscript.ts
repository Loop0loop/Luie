import { sql } from "drizzle-orm";
import { foreignKey, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { project } from "./foundation.js";

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
