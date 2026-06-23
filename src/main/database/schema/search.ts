import { sql } from "drizzle-orm";
import { foreignKey, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { project } from "./foundation.js";

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
