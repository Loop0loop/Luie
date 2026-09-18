import { inArray, sql } from "drizzle-orm";
import type BetterSqliteDatabase from "better-sqlite3";
import {
  cacheDb,
  chapterSearchDocument,
} from "../../../infra/database/cache.js";

export type CachedChapterSearchDocument = {
  chapterId: string;
  projectId: string;
  title: string;
  synopsis: string | null;
  searchText: string;
  wordCount: number;
  chapterOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export function mapChapterSearchDocumentRow(
  row: typeof chapterSearchDocument.$inferSelect,
): CachedChapterSearchDocument {
  return {
    ...row,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

const buildFtsQuery = (query: string): string => {
  const tokens = query.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return '""';
  return tokens
    .map((token) => `"${token.replaceAll('"', '""')}"`)
    .join(" AND ");
};

export const toSafeNumber = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export function isFtsUnavailableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("no such table: ChapterSearchDocumentFts") ||
    message.includes("no such module: fts5")
  );
}

export function syncFtsDocument(
  sqlite: BetterSqliteDatabase.Database,
  input: {
    chapterId: string;
    projectId: string;
    title: string;
    synopsis?: string | null;
    searchText: string;
    ftsRowId?: number | null;
  },
): void {
  if (input.ftsRowId === null || input.ftsRowId === undefined) {
    sqlite
      .prepare(`DELETE FROM "ChapterSearchDocumentFts" WHERE "chapterId" = ?`)
      .run(input.chapterId);
  } else {
    sqlite
      .prepare(`DELETE FROM "ChapterSearchDocumentFts" WHERE rowid = ?`)
      .run(input.ftsRowId);
  }
  const result = sqlite
    .prepare(
      `INSERT INTO "ChapterSearchDocumentFts" ("chapterId", "projectId", "title", "synopsis", "searchText") VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      input.chapterId,
      input.projectId,
      input.title,
      input.synopsis ?? "",
      input.searchText,
    );
  sqlite
    .prepare(
      `UPDATE "ChapterSearchDocument" SET "ftsRowId" = ? WHERE "chapterId" = ?`,
    )
    .run(Number(result.lastInsertRowid), input.chapterId);
}

type ReportUnavailable = (reason: string, error: unknown) => void;

export async function clearProjectFts(
  projectId: string,
  reportUnavailable: ReportUnavailable,
): Promise<void> {
  try {
    cacheDb
      .getClient()
      .run(
        sql`DELETE FROM "ChapterSearchDocumentFts" WHERE "projectId" = ${projectId};`,
      );
  } catch (error) {
    reportUnavailable(
      "Chapter search FTS project clear unavailable; keeping projection fallback",
      error,
    );
  }
}

export async function countProjectFtsRows(
  projectId: string,
  reportUnavailable: ReportUnavailable,
): Promise<number | null> {
  try {
    const rows = cacheDb
      .getClient()
      .all<{ count: unknown }>(
        sql`SELECT COUNT(*) as count FROM "ChapterSearchDocumentFts" WHERE "projectId" = ${projectId};`,
      );
    return toSafeNumber(rows[0]?.count);
  } catch (error) {
    reportUnavailable(
      "Chapter search FTS count unavailable; keeping projection fallback",
      error,
    );
    return null;
  }
}

export async function searchProjectChaptersWithFts(
  projectId: string,
  query: string,
  limit: number,
  reportUnavailable: ReportUnavailable,
): Promise<CachedChapterSearchDocument[]> {
  try {
    const client = cacheDb.getClient();
    const rows = client.all<{ chapterId: string }>(
      sql`SELECT "chapterId" FROM "ChapterSearchDocumentFts" WHERE "projectId" = ${projectId} AND "ChapterSearchDocumentFts" MATCH ${buildFtsQuery(query)} ORDER BY bm25("ChapterSearchDocumentFts"), "chapterId" LIMIT ${limit};`,
    );
    if (rows.length === 0) return [];

    const chapterIds = rows.map((row) => row.chapterId);
    const documents = await client
      .select()
      .from(chapterSearchDocument)
      .where(inArray(chapterSearchDocument.chapterId, chapterIds));
    const documentMap = new Map(
      documents.map((doc) => [doc.chapterId, mapChapterSearchDocumentRow(doc)]),
    );
    return chapterIds
      .map((chapterId) => documentMap.get(chapterId))
      .filter((doc): doc is CachedChapterSearchDocument => Boolean(doc));
  } catch (error) {
    reportUnavailable(
      "Chapter search FTS query unavailable; falling back to projection search",
      error,
    );
    return [];
  }
}
