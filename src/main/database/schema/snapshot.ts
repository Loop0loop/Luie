import { sql } from "drizzle-orm";
import { foreignKey, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { project } from "./foundation.js";
import { chapter } from "./manuscript.js";

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
