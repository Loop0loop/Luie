import { sql } from "drizzle-orm";
import {
  foreignKey,
  index,
  integer,
  primaryKey,
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
