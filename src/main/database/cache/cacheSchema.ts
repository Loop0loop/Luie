import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const characterAppearance = sqliteTable(
  "CharacterAppearance",
  {
    id: text("id").primaryKey().notNull(),
    projectId: text("projectId").notNull(),
    characterId: text("characterId").notNull(),
    chapterId: text("chapterId").notNull(),
    position: integer("position").notNull(),
    context: text("context"),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("CharacterAppearance_characterId_chapterId_position_key").on(table.characterId, table.chapterId, table.position),
    index("CharacterAppearance_projectId_chapterId_idx").on(table.projectId, table.chapterId),
    index("CharacterAppearance_projectId_characterId_chapterId_idx").on(table.projectId, table.characterId, table.chapterId),
  ],
);

export const termAppearance = sqliteTable(
  "TermAppearance",
  {
    id: text("id").primaryKey().notNull(),
    projectId: text("projectId").notNull(),
    termId: text("termId").notNull(),
    chapterId: text("chapterId").notNull(),
    position: integer("position").notNull(),
    context: text("context"),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("TermAppearance_termId_chapterId_position_key").on(table.termId, table.chapterId, table.position),
    index("TermAppearance_projectId_chapterId_idx").on(table.projectId, table.chapterId),
    index("TermAppearance_projectId_termId_chapterId_idx").on(table.projectId, table.termId, table.chapterId),
  ],
);

export const chapterSearchDocument = sqliteTable(
  "ChapterSearchDocument",
  {
    chapterId: text("chapterId").notNull(),
    projectId: text("projectId").notNull(),
    title: text("title").notNull(),
    synopsis: text("synopsis"),
    searchText: text("searchText").notNull(),
    wordCount: integer("wordCount").notNull(),
    chapterOrder: integer("chapterOrder").notNull(),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    primaryKey({ columns: [table.chapterId] }),
    index("ChapterSearchDocument_projectId_idx").on(table.projectId),
    index("ChapterSearchDocument_projectId_chapterOrder_idx").on(table.projectId, table.chapterOrder),
  ],
);

export type ChapterSearchDocumentRow = typeof chapterSearchDocument.$inferSelect;
export type NewChapterSearchDocumentRow = typeof chapterSearchDocument.$inferInsert;
