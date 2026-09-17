import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNull,
  isNotNull,
  like,
  sql,
} from "drizzle-orm";
import type BetterSqliteDatabase from "better-sqlite3";
import { db } from "../../../infra/database/index.js";
import { cacheDb } from "../../../infra/database/cache.js";
import { chapterSearchDocument } from "../../../infra/database/cache.js";
import { chapter, chapterBody } from "../../../infra/database/index.js";
import { createLogger } from "../../../../shared/logger/index.js";

const getCacheClient = () => cacheDb.getClient();
const getMainClient = () => db.getClient();

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

function mapChapterSearchDocumentRow(
  row: typeof chapterSearchDocument.$inferSelect,
): CachedChapterSearchDocument {
  return {
    ...row,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

function buildSearchText(input: {
  title: string;
  synopsis?: string | null;
  content?: string | null;
}): string {
  return [input.title, input.synopsis ?? "", input.content ?? ""]
    .filter((segment) => segment.length > 0)
    .join("\n\n");
}

function buildFtsQuery(query: string): string {
  const tokens = query.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return '""';
  return tokens.map((t) => `"${t.replaceAll('"', '""')}"`).join(" AND ");
}

function toSafeNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function isFtsUnavailableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("no such table: ChapterSearchDocumentFts") ||
    message.includes("no such module: fts5")
  );
}

const logger = createLogger("ChapterSearchCacheService");

class ChapterSearchCacheService {
  private ftsWarningLogged = false;

  private logFtsUnavailable(reason: string, error: unknown): void {
    if (this.ftsWarningLogged) {
      return;
    }
    this.ftsWarningLogged = true;
    logger.warn(reason, { error });
  }

  private syncFtsDocument(
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
        .prepare(
          `DELETE FROM "ChapterSearchDocumentFts" WHERE "chapterId" = ?`,
        )
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

  private async clearFtsByChapter(
    chapterId: string,
    ftsRowId?: number | null,
  ): Promise<void> {
    try {
      const client = getCacheClient();
      if (ftsRowId === null || ftsRowId === undefined) {
        client.run(
          sql`DELETE FROM "ChapterSearchDocumentFts" WHERE "chapterId" = ${chapterId};`,
        );
      } else {
        client.run(
          sql`DELETE FROM "ChapterSearchDocumentFts" WHERE rowid = ${ftsRowId};`,
        );
      }
    } catch (error) {
      this.logFtsUnavailable(
        "Chapter search FTS clear unavailable; keeping projection fallback",
        error,
      );
    }
  }

  private async clearFtsByProject(projectId: string): Promise<void> {
    try {
      const client = getCacheClient();
      client.run(
        sql`DELETE FROM "ChapterSearchDocumentFts" WHERE "projectId" = ${projectId};`,
      );
    } catch (error) {
      this.logFtsUnavailable(
        "Chapter search FTS project clear unavailable; keeping projection fallback",
        error,
      );
    }
  }

  private async countProjectFtsRows(projectId: string): Promise<number | null> {
    try {
      const client = getCacheClient();
      const rows = client.all<{ count: unknown }>(
        sql`SELECT COUNT(*) as count FROM "ChapterSearchDocumentFts" WHERE "projectId" = ${projectId};`,
      );
      return toSafeNumber(rows[0]?.count);
    } catch (error) {
      this.logFtsUnavailable(
        "Chapter search FTS count unavailable; keeping projection fallback",
        error,
      );
      return null;
    }
  }

  private async searchProjectChaptersWithFts(
    projectId: string,
    query: string,
    limit: number,
  ): Promise<CachedChapterSearchDocument[]> {
    try {
      const client = getCacheClient();
      const ftsQuery = buildFtsQuery(query);
      const rows = client.all<{ chapterId: string }>(
        sql`SELECT "chapterId" FROM "ChapterSearchDocumentFts" WHERE "projectId" = ${projectId} AND "ChapterSearchDocumentFts" MATCH ${ftsQuery} ORDER BY bm25("ChapterSearchDocumentFts"), "chapterId" LIMIT ${limit};`,
      );

      if (rows.length === 0) {
        return [];
      }

      const chapterIds = rows.map((row) => row.chapterId);
      const documents = await client
        .select()
        .from(chapterSearchDocument)
        .where(inArray(chapterSearchDocument.chapterId, chapterIds));
      const documentMap = new Map(
        documents.map((doc) => [
          doc.chapterId,
          mapChapterSearchDocumentRow(doc),
        ]),
      );

      return chapterIds
        .map((cid) => documentMap.get(cid))
        .filter((doc): doc is CachedChapterSearchDocument => Boolean(doc));
    } catch (error) {
      this.logFtsUnavailable(
        "Chapter search FTS query unavailable; falling back to projection search",
        error,
      );
      return [];
    }
  }

  private async searchProjectChaptersFallback(
    projectId: string,
    query: string,
    limit: number,
  ): Promise<CachedChapterSearchDocument[]> {
    const client = getCacheClient();
    const rows = await client
      .select()
      .from(chapterSearchDocument)
      .where(
        and(
          eq(chapterSearchDocument.projectId, projectId),
          like(chapterSearchDocument.searchText, `%${query}%`),
        ),
      )
      .orderBy(
        asc(chapterSearchDocument.chapterOrder),
        desc(chapterSearchDocument.updatedAt),
      )
      .limit(limit);
    return rows.map(mapChapterSearchDocumentRow);
  }

  async upsertChapter(input: {
    chapterId: string;
    projectId: string;
    title: string;
    synopsis?: string | null;
    content?: string | null;
    wordCount: number;
    order: number;
  }): Promise<CachedChapterSearchDocument> {
    const searchText = buildSearchText(input);
    const client = getCacheClient();
    const writeProjection = () =>
      client
        .insert(chapterSearchDocument)
        .values({
          chapterId: input.chapterId,
          projectId: input.projectId,
          title: input.title,
          synopsis: input.synopsis ?? null,
          searchText,
          wordCount: input.wordCount,
          chapterOrder: input.order,
        })
        .onConflictDoUpdate({
          target: [chapterSearchDocument.chapterId],
          set: {
            projectId: input.projectId,
            title: input.title,
            synopsis: input.synopsis ?? null,
            searchText,
            wordCount: input.wordCount,
            chapterOrder: input.order,
          },
        })
        .returning()
        .get();
    let row: typeof chapterSearchDocument.$inferSelect;
    try {
      row = cacheDb.runSqliteTransaction((sqlite) => {
        const document = writeProjection();
        this.syncFtsDocument(sqlite, {
          chapterId: input.chapterId,
          projectId: input.projectId,
          title: input.title,
          synopsis: input.synopsis ?? null,
          searchText,
          ftsRowId: document.ftsRowId,
        });
        return document;
      });
    } catch (error) {
      if (!isFtsUnavailableError(error)) throw error;
      this.logFtsUnavailable(
        "Chapter search FTS sync unavailable; keeping projection fallback",
        error,
      );
      row = cacheDb.runSqliteTransaction(writeProjection);
    }
    const document = mapChapterSearchDocumentRow(row);
    return document;
  }

  async searchProjectChapters(
    projectId: string,
    query: string,
    limit = 5,
  ): Promise<CachedChapterSearchDocument[]> {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length === 0) {
      return [];
    }

    await this.ensureProjectHydrated(projectId);
    const ftsResults = await this.searchProjectChaptersWithFts(
      projectId,
      normalizedQuery,
      limit,
    );

    if (ftsResults.length > 0) {
      return ftsResults;
    }

    return await this.searchProjectChaptersFallback(
      projectId,
      normalizedQuery,
      limit,
    );
  }

  async getIndexStatus(projectId: string): Promise<{
    projectId: string;
    projectionCount: number;
    ftsCount: number | null;
    pendingQueueCount: number;
  }> {
    const cacheClient = getCacheClient();
    const projectionRows = await cacheClient
      .select({ count: count() })
      .from(chapterSearchDocument)
      .where(eq(chapterSearchDocument.projectId, projectId));
    const projectionCount = toSafeNumber(projectionRows[0]?.count);
    const ftsCount = await this.countProjectFtsRows(projectId);
    const mainClient = getMainClient();
    const queueRows = await mainClient.all<{ count: unknown }>(
      sql`SELECT COUNT(*) as count FROM "SearchDirtyQueue" WHERE "projectId" = ${projectId} AND "status" = 'pending';`,
    );
    return {
      projectId,
      projectionCount,
      ftsCount,
      pendingQueueCount: toSafeNumber(queueRows[0]?.count),
    };
  }

  async rebuildProjectIndex(projectId: string): Promise<{ success: boolean }> {
    await this.rebuildProject(projectId);
    return { success: true };
  }

  async refreshChapter(chapterId: string): Promise<void> {
    const rows = await getMainClient()
      .select({
        id: chapter.id,
        projectId: chapter.projectId,
        title: chapter.title,
        synopsis: chapter.synopsis,
        content: chapter.content,
        bodyContent: chapterBody.content,
        wordCount: chapter.wordCount,
        order: chapter.order,
      })
      .from(chapter)
      .leftJoin(chapterBody, eq(chapterBody.chapterId, chapter.id))
      .where(and(eq(chapter.id, chapterId), isNull(chapter.deletedAt)))
      .limit(1);
    const row = rows[0];
    if (!row) {
      await this.clearChapter(chapterId);
      return;
    }

    await this.upsertChapter({
      chapterId: row.id,
      projectId: row.projectId,
      title: row.title,
      synopsis: row.synopsis,
      content: row.bodyContent ?? row.content,
      wordCount: row.wordCount,
      order: row.order,
    });
  }

  async clearChapter(chapterId: string): Promise<void> {
    const client = getCacheClient();
    const rows = await client
      .select({ ftsRowId: chapterSearchDocument.ftsRowId })
      .from(chapterSearchDocument)
      .where(eq(chapterSearchDocument.chapterId, chapterId))
      .limit(1);
    await client
      .delete(chapterSearchDocument)
      .where(eq(chapterSearchDocument.chapterId, chapterId));
    await this.clearFtsByChapter(chapterId, rows[0]?.ftsRowId);
  }

  async clearProject(projectId: string): Promise<void> {
    const client = getCacheClient();
    await Promise.all([
      client
        .delete(chapterSearchDocument)
        .where(eq(chapterSearchDocument.projectId, projectId)),
      this.clearFtsByProject(projectId),
    ]);
  }

  async getProjectFtsRowCount(projectId: string): Promise<number | null> {
    return await this.countProjectFtsRows(projectId);
  }

  async ensureProjectHydrated(projectId: string): Promise<void> {
    const cacheClient = getCacheClient();
    const mainClient = getMainClient();
    const [cacheCountResult, mappedCountResult, chapterCountResult, ftsCount] =
      await Promise.all([
        cacheClient
          .select({ count: count() })
          .from(chapterSearchDocument)
          .where(eq(chapterSearchDocument.projectId, projectId)),
        cacheClient
          .select({ count: count() })
          .from(chapterSearchDocument)
          .where(
            and(
              eq(chapterSearchDocument.projectId, projectId),
              isNotNull(chapterSearchDocument.ftsRowId),
            ),
          ),
        mainClient
          .select({ count: count() })
          .from(chapter)
          .where(
            and(eq(chapter.projectId, projectId), isNull(chapter.deletedAt)),
          ),
        this.countProjectFtsRows(projectId),
      ]);
    const cacheCount = cacheCountResult[0]?.count ?? 0;
    const mappedCount = mappedCountResult[0]?.count ?? 0;
    const chapterCount = chapterCountResult[0]?.count ?? 0;

    if (chapterCount === 0) {
      if (cacheCount > 0) {
        await this.clearProject(projectId);
      }
      return;
    }

    const ftsMatchesProjection =
      ftsCount === null ||
      (ftsCount === cacheCount && mappedCount === cacheCount);
    if (cacheCount === chapterCount && ftsMatchesProjection) {
      return;
    }

    await this.rebuildProject(projectId);
  }

  async rebuildProject(projectId: string): Promise<void> {
    const mainClient = getMainClient();
    const chapters = await mainClient
      .select({
        id: chapter.id,
        title: chapter.title,
        synopsis: chapter.synopsis,
        content: chapter.content,
        bodyContent: chapterBody.content,
        wordCount: chapter.wordCount,
        order: chapter.order,
      })
      .from(chapter)
      .leftJoin(chapterBody, eq(chapterBody.chapterId, chapter.id))
      .where(and(eq(chapter.projectId, projectId), isNull(chapter.deletedAt)))
      .orderBy(asc(chapter.order));

    const documents = chapters.map((row) => ({
      chapterId: row.id,
      projectId,
      title: row.title,
      synopsis: row.synopsis ?? "",
      searchText: buildSearchText({
        title: row.title,
        synopsis: row.synopsis,
        content: row.bodyContent ?? row.content,
      }),
      wordCount: row.wordCount,
      chapterOrder: row.order,
    }));

    const replaceRows = (includeFts: boolean) => {
      cacheDb.runSqliteTransaction((sqlite) => {
        sqlite
          .prepare(`DELETE FROM "ChapterSearchDocument" WHERE "projectId" = ?`)
          .run(projectId);
        if (includeFts) {
          sqlite
            .prepare(
              `DELETE FROM "ChapterSearchDocumentFts" WHERE "projectId" = ?`,
            )
            .run(projectId);
        }

        const insertProjection = sqlite.prepare(
          `INSERT INTO "ChapterSearchDocument" ("chapterId", "projectId", "title", "synopsis", "searchText", "wordCount", "chapterOrder", "ftsRowId", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        );
        const insertFts = includeFts
          ? sqlite.prepare(
              `INSERT INTO "ChapterSearchDocumentFts" ("chapterId", "projectId", "title", "synopsis", "searchText") VALUES (?, ?, ?, ?, ?)`,
            )
          : null;
        const now = new Date().toISOString();
        for (const document of documents) {
          const ftsResult = insertFts?.run(
            document.chapterId,
            document.projectId,
            document.title,
            document.synopsis,
            document.searchText,
          );
          insertProjection.run(
            document.chapterId,
            document.projectId,
            document.title,
            document.synopsis,
            document.searchText,
            document.wordCount,
            document.chapterOrder,
            ftsResult ? Number(ftsResult.lastInsertRowid) : null,
            now,
            now,
          );
        }
      });
    };

    try {
      replaceRows(true);
    } catch (error) {
      if (!isFtsUnavailableError(error)) throw error;
      this.logFtsUnavailable(
        "Chapter search FTS rebuild unavailable; keeping projection fallback",
        error,
      );
      await this.clearFtsByProject(projectId);
      replaceRows(false);
    }
  }
}

export const chapterSearchCacheService = new ChapterSearchCacheService();
